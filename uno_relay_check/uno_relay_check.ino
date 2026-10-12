constexpr uint8_t RELAY_PIN = 7;

void setup() {
  Serial.begin(9600);
  pinMode(RELAY_PIN, OUTPUT);
  Serial.println("Short relay test on Arduino Uno D7");
  for (uint8_t cycle = 1; cycle <= 2; ++cycle) {
    digitalWrite(RELAY_PIN, HIGH);
    Serial.println("D7 = HIGH");
    delay(1000);
    digitalWrite(RELAY_PIN, LOW);
    Serial.println("D7 = LOW");
    delay(1000);
  }
  pinMode(RELAY_PIN, INPUT);
  Serial.println("Test complete; D7 is now high-impedance and not driving the relay.");
}

void loop() {}
