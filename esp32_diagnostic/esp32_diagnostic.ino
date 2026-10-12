#include <Arduino.h>
#include <Wire.h>
#include <DHT.h>
#include <WiFi.h>

constexpr uint8_t DHT_PIN = 4;
constexpr uint8_t SOIL_PIN = 34;
constexpr uint8_t I2C_SDA_PIN = 21;
constexpr uint8_t I2C_SCL_PIN = 22;
constexpr uint8_t RELAY_PIN = 26;

DHT dht11(DHT_PIN, DHT11);
DHT dht22(DHT_PIN, DHT22);

void scanI2c() {
  uint8_t found = 0;
  Serial.print("I2C devices:");
  for (uint8_t address = 1; address < 127; ++address) {
    Wire.beginTransmission(address);
    if (Wire.endTransmission() == 0) {
      Serial.printf(" 0x%02X", address);
      ++found;
    }
  }
  if (found == 0) Serial.print(" none");
  Serial.println();
}

void scanWifi() {
  WiFi.mode(WIFI_STA);
  delay(200);
  const int count = WiFi.scanNetworks(false, true);
  Serial.printf("Wi-Fi scan: %d network(s) found", count);
  if (count > 0) {
    Serial.print("; strongest RSSI values:");
    const int shown = min(count, 5);
    for (int i = 0; i < shown; ++i) Serial.printf(" %d dBm", WiFi.RSSI(i));
  }
  Serial.println();
  WiFi.scanDelete();
}

void printAnalogInputs() {
  const uint8_t adcPins[] = {32, 33, 34, 35, 36, 39};
  Serial.print("ADC raw:");
  for (uint8_t pin : adcPins) {
    Serial.printf(" GPIO%u=%d", pin, analogRead(pin));
  }
  Serial.println();
  Serial.printf("Soil candidate GPIO%u raw=%d (0-4095; calibration required)\n",
                SOIL_PIN, analogRead(SOIL_PIN));
}

void printDhtCandidate(const char *label, DHT &sensor) {
  const float humidity = sensor.readHumidity(true);
  const float temperature = sensor.readTemperature(false, false);
  if (isnan(humidity) || isnan(temperature)) {
    Serial.printf("%s candidate on GPIO%u: no valid response\n", label, DHT_PIN);
  } else {
    Serial.printf("%s candidate on GPIO%u: temperature=%.1f C humidity=%.1f %%\n",
                  label, DHT_PIN, temperature, humidity);
  }
}

void setup() {
  Serial.begin(115200);
  delay(1500);
  Serial.println();
  Serial.println("=== ESP32 SMART AGRICULTURE DIAGNOSTIC ===");
  Serial.printf("Chip: %s, cores=%u, flash=%u bytes\n",
                ESP.getChipModel(), ESP.getChipCores(), ESP.getFlashChipSize());
  Serial.printf("Assumptions: DHT GPIO%u, soil ADC GPIO%u, I2C SDA/SCL GPIO%u/%u\n",
                DHT_PIN, SOIL_PIN, I2C_SDA_PIN, I2C_SCL_PIN);

  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_PIN, ADC_11db);
  pinMode(RELAY_PIN, INPUT);
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  dht11.begin();
  dht22.begin();
  scanI2c();
  scanWifi();
  Serial.printf("Relay GPIO%u passive logic level=%s (not driven)\n",
                RELAY_PIN, digitalRead(RELAY_PIN) ? "HIGH" : "LOW");
}

void loop() {
  Serial.println("--- sample ---");
  printAnalogInputs();
  printDhtCandidate("DHT11", dht11);
  delay(2200);
  printDhtCandidate("DHT22/AM2302", dht22);
  scanI2c();
  Serial.println();
  delay(2200);
}
