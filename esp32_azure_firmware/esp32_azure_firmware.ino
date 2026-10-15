#include <Arduino.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <PubSubClient.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <mbedtls/base64.h>
#include <mbedtls/md.h>
#include <time.h>
#include "config.h"

constexpr uint8_t DHT_PIN = 4;
constexpr uint8_t SOIL_PIN = 34;
constexpr uint8_t RELAY_PIN = 26;
constexpr uint32_t TELEMETRY_INTERVAL_MS = 10000;
constexpr uint32_t MAX_RELAY_ON_MS = 10UL * 60UL * 1000UL;
constexpr uint32_t MIN_RELAY_OFF_MS = 30UL * 1000UL;
constexpr char FIRMWARE_VERSION[] = "2.0.0-azure";

// DigiCert Global Root G2, used by Azure IoT Hub TLS endpoints.
static const char AZURE_ROOT_CA[] PROGMEM = R"EOF(
-----BEGIN CERTIFICATE-----
MIIDjjCCAnagAwIBAgIQAzrx5qcRqaC7KGSxHQn65TANBgkqhkiG9w0BAQsFADBh
MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3
d3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBH
MjAeFw0xMzA4MDExMjAwMDBaFw0zODAxMTUxMjAwMDBaMGExCzAJBgNVBAYTAlVT
MRUwEwYDVQQKEwxEaWdpQ2VydCBJbmMxGTAXBgNVBAsTEHd3dy5kaWdpY2VydC5j
b20xIDAeBgNVBAMTF0RpZ2lDZXJ0IEdsb2JhbCBSb290IEcyMIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuzfNNNx7a8myaJCtSnX/RrohCgiN9RlUyfuI
2/Ou8jqJkTx65qsGGmvPrC3oXgkkRLpimn7Wo6h+4FR1IAWsULecYxpsMNzaHxmx
1x7e/dfgy5SDN67sH0NO3Xss0r0upS/kqbitOtSZpLYl6ZtrAGCSYP9PIUkY92eQ
q2EGnI/yuum06ZIya7XzV+hdG82MHauVBJVJ8zUtluNJbd134/tJS7SsVQepj5Wz
tCO7TG1F8PapspUwtP1MVYwnSlcUfIKdzXOS0xZKBgyMUNGPHgm+F6HmIcr9g+UQ
vIOlCsRnKPZzFBQ9RnbDhxSJITRNrw9FDKZJobq7nMWxM4MphQIDAQABo0IwQDAP
BgNVHRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBhjAdBgNVHQ4EFgQUTiJUIBiV
5uNu5g/6+rkS7QYXjzkwDQYJKoZIhvcNAQELBQADggEBAGBnKJRvDkhj6zHd6mcY
1Yl9PMWLSn/pvtsrF9+wX3N3KjITOYFnQoQj8kVnNeyIv/iPsGEMNKSuIEyExtv4
NeF22d+mQrvHRAiGfzZ0JFrabA0UWTW98kndth/Jsw1HKj2ZL7tcu7XUIOGZX1NG
Fdtom/DzMNU+MeKNhJ7jitralj41E6Vf8PlwUHBHQRFXGU7Aj64GxJUTFy8bJZ91
8rGOmaFvE7FBcf6IKshPECBV1/MUReXgRPTqh5Uykw7+U0b6LJ3/iyK5S9kJRaTe
pLiaWN0bfVKfjllDiIGknibVb63dDcY3fe0Dkhvld1927jyNxF1WW6LZZm6zNTfl
MrY=
-----END CERTIFICATE-----
)EOF";

DHT dht(DHT_PIN, DHT22);
WiFiClientSecure tls;
PubSubClient mqtt(tls);
bool relayOn = false;
bool automaticMode = AUTO_IRRIGATION_DEFAULT;
uint8_t autoStartPercent = AUTO_START_PERCENT;
uint8_t autoStopPercent = AUTO_STOP_PERCENT;
uint32_t relayChangedAt = 0;
uint32_t lastTelemetryAt = 0;
uint32_t sasExpiresAt = 0;

String urlEncode(const String &value) {
  String result;
  const char *hex = "0123456789ABCDEF";
  for (size_t i = 0; i < value.length(); ++i) {
    const uint8_t c = value[i];
    if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') result += char(c);
    else { result += '%'; result += hex[c >> 4]; result += hex[c & 15]; }
  }
  return result;
}

String createSasToken(uint32_t expiry) {
  const String resource = String(IOT_HUB_HOSTNAME) + "/devices/" + IOT_DEVICE_ID;
  const String encodedResource = urlEncode(resource);
  const String toSign = encodedResource + "\n" + String(expiry);

  uint8_t decodedKey[64];
  size_t decodedLength = 0;
  mbedtls_base64_decode(decodedKey, sizeof(decodedKey), &decodedLength,
                        reinterpret_cast<const uint8_t *>(IOT_DEVICE_KEY), strlen(IOT_DEVICE_KEY));
  uint8_t digest[32];
  const mbedtls_md_info_t *md = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
  mbedtls_md_hmac(md, decodedKey, decodedLength,
                  reinterpret_cast<const uint8_t *>(toSign.c_str()), toSign.length(), digest);
  uint8_t encodedSignature[64];
  size_t signatureLength = 0;
  mbedtls_base64_encode(encodedSignature, sizeof(encodedSignature), &signatureLength, digest, sizeof(digest));
  encodedSignature[signatureLength] = '\0';
  return "SharedAccessSignature sr=" + encodedResource + "&sig=" + urlEncode(String(reinterpret_cast<char *>(encodedSignature))) + "&se=" + String(expiry);
}

void setRelay(bool enabled, const char *reason) {
  if (enabled == relayOn) return;
  const uint32_t now = millis();
  if (enabled && !relayOn && now - relayChangedAt < MIN_RELAY_OFF_MS) return;
  relayOn = enabled;
  digitalWrite(RELAY_PIN, enabled ? LOW : HIGH); // Active-low relay.
  relayChangedAt = now;
  Serial.printf("Relay %s (%s)\n", enabled ? "ON" : "OFF", reason);
}

void handleCloudMessage(char *, byte *payload, unsigned int length) {
  JsonDocument command;
  if (deserializeJson(command, payload, length)) return;
  const char *type = command["type"] | "";
  if (!strcmp(type, "relay") && command["enabled"].is<bool>()) setRelay(command["enabled"].as<bool>(), "cloud command");
  if (!strcmp(type, "automatic") && command["enabled"].is<bool>()) {
    const int requestedStart = command["startPercent"] | autoStartPercent;
    const int requestedStop = command["stopPercent"] | autoStopPercent;
    if (requestedStart >= 0 && requestedStart < requestedStop && requestedStop <= 100) {
      autoStartPercent = requestedStart;
      autoStopPercent = requestedStop;
      automaticMode = command["enabled"].as<bool>();
      if (!automaticMode) setRelay(false, "automatic mode disabled");
    }
  }
}

void connectWifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  for (uint8_t attempt = 0; attempt < 30 && WiFi.status() != WL_CONNECTED; ++attempt) delay(500);
}

void connectMqtt() {
  if (mqtt.connected() || WiFi.status() != WL_CONNECTED) return;
  const time_t now = time(nullptr);
  if (now < 1700000000) return;
  sasExpiresAt = static_cast<uint32_t>(now) + 3600;
  const String username = String(IOT_HUB_HOSTNAME) + "/" + IOT_DEVICE_ID + "/?api-version=2021-04-12";
  const String password = createSasToken(sasExpiresAt);
  if (mqtt.connect(IOT_DEVICE_ID, username.c_str(), password.c_str())) {
    mqtt.subscribe((String("devices/") + IOT_DEVICE_ID + "/messages/devicebound/#").c_str(), 1);
    Serial.println("Connected securely to Azure IoT Hub");
  }
}

void publishTelemetry() {
  unsigned long total = 0;
  for (uint8_t i = 0; i < 20; ++i) { total += analogRead(SOIL_PIN); delay(5); }
  const float raw = total / 20.0f;
  const int soilPercent = constrain(map(static_cast<int>(raw), SOIL_DRY_RAW, SOIL_WET_RAW, 0, 100), 0, 100);
  const float humidity = dht.readHumidity();
  const float temperature = dht.readTemperature();
  const bool dhtOk = !isnan(humidity) && !isnan(temperature);

  if (automaticMode) {
    if (!relayOn && soilPercent <= autoStartPercent) setRelay(true, "low soil moisture");
    if (relayOn && soilPercent >= autoStopPercent) setRelay(false, "target moisture reached");
  }
  if (relayOn && millis() - relayChangedAt >= MAX_RELAY_ON_MS) setRelay(false, "maximum runtime safety cutoff");

  JsonDocument doc;
  doc["deviceId"] = IOT_DEVICE_ID;
  doc["farmId"] = FARM_ID;
  doc["soilRaw"] = raw;
  doc["soilPercent"] = soilPercent;
  if (dhtOk) { doc["temperature"] = temperature; doc["humidity"] = humidity; }
  else { doc["temperature"] = nullptr; doc["humidity"] = nullptr; }
  doc["dhtOk"] = dhtOk;
  doc["relay"] = relayOn ? "ON" : "OFF";
  doc["automaticMode"] = automaticMode;
  doc["autoStartPercent"] = autoStartPercent;
  doc["autoStopPercent"] = autoStopPercent;
  doc["uptimeMs"] = millis();
  doc["firmwareVersion"] = FIRMWARE_VERSION;

  char json[512];
  serializeJson(doc, json, sizeof(json));
  if (mqtt.connected()) mqtt.publish((String("devices/") + IOT_DEVICE_ID + "/messages/events/$.ct=application%2Fjson&$.ce=utf-8").c_str(), json);
  Serial.println(json);
}

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);
  pinMode(SOIL_PIN, INPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_PIN, ADC_11db);
  dht.begin();
  connectWifi();
  configTime(0, 0, "pool.ntp.org", "time.nist.gov");
  tls.setCACert(AZURE_ROOT_CA);
  mqtt.setServer(IOT_HUB_HOSTNAME, 8883);
  mqtt.setCallback(handleCloudMessage);
  mqtt.setBufferSize(1024);
}

void loop() {
  connectWifi();
  if (mqtt.connected() && time(nullptr) > static_cast<time_t>(sasExpiresAt - 300)) mqtt.disconnect();
  connectMqtt();
  mqtt.loop();
  if (millis() - lastTelemetryAt >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryAt = millis();
    publishTelemetry();
  }
  delay(10);
}
