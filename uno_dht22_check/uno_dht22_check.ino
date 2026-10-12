#include <DHT.h>

constexpr uint8_t DHT_PIN = 2;
DHT dht(DHT_PIN, DHT22);

void setup() {
  Serial.begin(9600);
  pinMode(DHT_PIN, INPUT_PULLUP);
  dht.begin();
  delay(2000);
  Serial.println("DHT22 test using Arduino internal pull-up on pin 2");
}

void loop() {
  const float humidity = dht.readHumidity();
  const float temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("DHT22 ERROR: no valid response");
  } else {
    Serial.print("Temperature: ");
    Serial.print(temperature, 1);
    Serial.print(" C, Humidity: ");
    Serial.print(humidity, 1);
    Serial.println(" %");
  }
  delay(2500);
}
