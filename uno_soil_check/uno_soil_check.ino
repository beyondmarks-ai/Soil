constexpr uint8_t SOIL_ANALOG_PIN = A0;

void setup() {
  Serial.begin(9600);
  pinMode(SOIL_ANALOG_PIN, INPUT);
  Serial.println("MH-series soil sensor test: AO connected to A0");
}

void loop() {
  unsigned long total = 0;
  int minimum = 1023;
  int maximum = 0;

  for (uint8_t i = 0; i < 20; ++i) {
    const int sample = analogRead(SOIL_ANALOG_PIN);
    total += sample;
    if (sample < minimum) minimum = sample;
    if (sample > maximum) maximum = sample;
    delay(10);
  }

  const float average = total / 20.0;
  Serial.print("A0 average=");
  Serial.print(average, 1);
  Serial.print(" range=");
  Serial.print(minimum);
  Serial.print("-");
  Serial.println(maximum);
  delay(1000);
}
