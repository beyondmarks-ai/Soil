#include <DHT.h>

constexpr uint8_t DHT_PIN = 2;
constexpr uint8_t SOIL_PIN = A0;
constexpr uint8_t RELAY_PIN = 7;
constexpr int SOIL_WET_RAW = 0;
constexpr int SOIL_DRY_RAW = 672;

DHT dht(DHT_PIN, DHT22);
bool relayOn = false;

void setRelay(bool enabled) {
  relayOn = enabled;
  // The tested relay module is active-low.
  digitalWrite(RELAY_PIN, enabled ? LOW : HIGH);
}

void handleSerialCommand() {
  if (!Serial.available()) return;
  String command = Serial.readStringUntil('\n');
  command.trim();
  if (command == "RELAY_ON") setRelay(true);
  if (command == "RELAY_OFF") setRelay(false);
}

void setup() {
  Serial.begin(9600);
  Serial.setTimeout(30);
  pinMode(DHT_PIN, INPUT_PULLUP);
  pinMode(SOIL_PIN, INPUT);
  digitalWrite(RELAY_PIN, HIGH);
  pinMode(RELAY_PIN, OUTPUT);
  setRelay(false);
  dht.begin();
  delay(2000);
}

void loop() {
  handleSerialCommand();
  unsigned long soilTotal = 0;
  for (uint8_t i = 0; i < 20; ++i) {
    soilTotal += analogRead(SOIL_PIN);
    delay(10);
  }
  const float soilAverage = soilTotal / 20.0;
  const int soilPercent = constrain(map((int)soilAverage, SOIL_DRY_RAW, SOIL_WET_RAW, 0, 100), 0, 100);

  const float humidity = dht.readHumidity();
  const float temperature = dht.readTemperature();
  const bool dhtOk = !isnan(humidity) && !isnan(temperature);

  Serial.print("{\"soilRaw\":");
  Serial.print(soilAverage, 1);
  Serial.print(",\"soilPercent\":");
  Serial.print(soilPercent);
  Serial.print(",\"temperature\":");
  if (dhtOk) Serial.print(temperature, 1); else Serial.print("null");
  Serial.print(",\"humidity\":");
  if (dhtOk) Serial.print(humidity, 1); else Serial.print("null");
  Serial.print(",\"dhtOk\":");
  Serial.print(dhtOk ? "true" : "false");
  Serial.print(",\"relay\":\"");
  Serial.print(relayOn ? "ON" : "OFF");
  Serial.print("\",\"uptimeMs\":");
  Serial.print(millis());
  Serial.println("}");
  delay(2500);
}
