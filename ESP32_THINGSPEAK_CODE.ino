#include <WiFi.h>
#include <HTTPClient.h>

// ============================================
// 1. WiFi Credentials - UPDATE THESE
// ============================================
const char* ssid = "sathvik";
const char* password = "12345678";

// ============================================
// 2. ThingSpeak Details - UPDATE THESE
// ============================================
// NOTE: ThingSpeak free accounts only allow 1 update every 15 seconds.
String apiKey = "J4LIH6IYPI58XXPG"; // Replace with your Write API Key from ThingSpeak
const char* server = "api.thingspeak.com";

// ============================================
// 3. Pin Definitions (GPIO Pin Numbers)
// ============================================
const int CURRENT_PIN = 34;    // ADC Pin - Current Sensor
const int VOLT_PIN = 35;       // ADC Pin - Voltage Sensor
const int RELAY_PIN = 26;      // GPIO Pin - Relay Control

// ============================================
// 4. Sensor Calibration Values
// ============================================
float VPP = 3.3 / 4095.0;           // ESP32 ADC: 3.3V / 12-bit
float SENSITIVITY = 0.100;          // 100mV/A for ACS712-10A sensor
float VOLT_DIVIDER_RATIO = 3.12;    // Your voltage divider ratio (adjust if needed)

// ============================================
// Timing & Energy Variables
// ============================================
unsigned long lastMillis = 0;
float totalKWh = 0;

void setup() {
  Serial.begin(115200);
  delay(10);
  
  // Initialize Relay
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW); // Start with relay OFF

  Serial.println("\n\n");
  Serial.println("=====================================");
  Serial.println("   ECOPULSE ESP32 - THINGSPEAK   ");
  Serial.println("=====================================");

  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.begin(ssid, password);

  int timeout = 0;
  while (WiFi.status() != WL_CONNECTED && timeout < 20) {
    delay(500);
    Serial.print(".");
    timeout++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi connected");
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n✗ WiFi connection failed! Check credentials.");
  }
}

void loop() {
  // ThingSpeak only allows 1 update every 15 seconds on free accounts!
  if (millis() - lastMillis > 16000 || lastMillis == 0) {
    lastMillis = millis();

    // 1. Read Voltage Sensor
    float voltage = (analogRead(VOLT_PIN) * VPP) * VOLT_DIVIDER_RATIO;
    if (voltage < 0) voltage = 0;

    // 2. Read Current Sensor (with 50-sample averaging)
    int zeroPoint = 2048;  // Center point for 12-bit ADC
    float currentSum = 0;
    for(int i = 0; i < 50; i++) {
        int raw = analogRead(CURRENT_PIN);
        float mv = (raw - zeroPoint) * VPP;
        float amps = mv / SENSITIVITY;
        currentSum += amps;
        delayMicroseconds(100);
    }
    float current = abs(currentSum / 50.0);
    if (current < 0.05) current = 0;  // Filter out noise

    // 3. Calculate Power & Energy
    float power = voltage * current;
    // Energy accumulation: Power (W) * Time (s) converted to Hours and kW = kWh
    // Time passed is roughly 16 seconds (16000 ms)
    totalKWh += (power * (16.0 / 3600.0)) / 1000.0; 
    
    // 4. Get Relay Status (1 = ON, 0 = OFF)
    int relayStatus = digitalRead(RELAY_PIN) == HIGH ? 1 : 0;

    // Print to Serial Monitor
    Serial.println("-------------------------------------");
    Serial.print("V="); Serial.print(voltage, 2);
    Serial.print("V | I="); Serial.print(current, 3);
    Serial.print("A | P="); Serial.print(power, 1);
    Serial.print("W | E="); Serial.print(totalKWh, 5);
    Serial.println("kWh");

    // 5. Send to ThingSpeak
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      // 1. First, READ the requested relay status from the dashboard
      String readUrl = "http://" + String(server) + "/channels/3292262/fields/5/last.txt";
      http.begin(readUrl);
      int readCode = http.GET();
      if (readCode > 0) {
        String lastControlState = http.getString();
        // The dashboard sends "1" for ON, "0" for OFF.
        if (lastControlState == "1" || lastControlState == "0") {
          bool shouldBeOn = (lastControlState == "1");
          // Active-Low logic: LOW means ON
          bool isCurrentlyOn = (digitalRead(RELAY_PIN) == LOW);
          
          if (shouldBeOn != isCurrentlyOn) {
            digitalWrite(RELAY_PIN, shouldBeOn ? LOW : HIGH);
            Serial.print("🔄 Remote Command: Relay turned ");
            Serial.println(shouldBeOn ? "ON" : "OFF");
          }
        }
      }
      http.end();

      // Delay briefly between HTTP requests
      delay(500);

      // Re-read physical relay state just in case it changed above (Active-Low: LOW = 1/ON)
      int currentRelayStatus = digitalRead(RELAY_PIN) == LOW ? 1 : 0;

      Serial.println("Sending data to ThingSpeak...");
      
      // 2. Construct the HTTP GET request URL to WRITE data
      String url = "http://" + String(server) + "/update?api_key=" + apiKey;
      url += "&field1=" + String(voltage, 2);
      url += "&field2=" + String(current, 3);
      url += "&field3=" + String(power, 2);
      url += "&field4=" + String(totalKWh, 5);
      url += "&field5=" + String(currentRelayStatus);

      http.begin(url);
      int httpCode = http.GET();
      
      if (httpCode > 0) {
        String payload = http.getString();
        if (payload == "0") {
             Serial.println("⚠ ThingSpeak Warning: Update rejected. (Wait at least 15s between updates)");
        } else {
             Serial.println("✓ Data successfully sent to ThingSpeak! (Entry ID: " + payload + ")");
        }
      } else {
        Serial.print("✗ HTTP Request failed, Error: ");
        Serial.println(http.errorToString(httpCode).c_str());
      }
      http.end();
    } else {
      Serial.println("✗ WiFi Disconnected! Attempting to reconnect...");
      WiFi.reconnect();
    }
  }
}
