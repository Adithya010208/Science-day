#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// 1. WiFi Credentials - CHANGE THESE TO YOUR WI-FI
#define WIFI_SSID "sathvik"
#define WIFI_PASSWORD "12345678"

// 2. Firebase Credentials (Matching your dashboard)
#define API_KEY "AIzaSyCoqZMZhe_02gZAPZyY8tJ9xr6ApOfFN7g"
#define DATABASE_URL "https://energy-magement-system-default-rtdb.firebaseio.com"

// 3. Pin Definitions (From your setup)
const int CURRENT_PIN = 34;
const int VOLT_PIN = 35;
const int RELAY_PIN = 26;

// 4. Calibration
float VPP = 3.3 / 4095.0; 
float SENSITIVITY = 0.100; // 100mV/A for ACS712-10A
float VOLT_DIVIDER_RATIO = 3.12; 

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long lastMillis = 0;
unsigned long lastCommandCheck = 0;
float totalKWh = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);  // Start relay OFF
  
  Serial.println("\n\n===== STARTING SETUP =====");
  Serial.println("Connecting to WiFi: " + String(WIFI_SSID));
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int timeout = 0;
  while (WiFi.status() != WL_CONNECTED && timeout < 20) { 
    delay(500); 
    Serial.print(".");
    timeout++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ WiFi Connected!");
    Serial.println("IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n✗ WiFi Failed!");
    return;
  }

  // Initialize Firebase
  Serial.println("\nInitializing Firebase...");
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  
  // Use anonymous auth (no credentials needed)
  auth.user.email = "";
  auth.user.password = "";
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  
  // Wait for Firebase to be ready
  int fbTimeout = 0;
  while (!Firebase.ready() && fbTimeout < 10) {
    delay(500);
    Serial.print(".");
    fbTimeout++;
  }
  
  if (Firebase.ready()) {
    Serial.println("\n✓ Firebase Ready!");
    Serial.println("===== SETUP COMPLETE =====\n");
  } else {
    Serial.println("\n✗ Firebase Failed!");
  }
}

void loop() {
  if (!Firebase.ready()) {
    Serial.println("Firebase not ready!");
    delay(1000);
    return;
  }

  // Send sensor data every 3 seconds
  if (millis() - lastMillis > 3000) {
    lastMillis = millis();

    // ===== Read Sensors =====
    float voltage = (analogRead(VOLT_PIN) * VPP) * VOLT_DIVIDER_RATIO;
    if (voltage < 0) voltage = 0;

    // Current Reading (with zero-point calibration)
    int zeroPoint = 2048;
    float currentSum = 0;
    for(int i = 0; i < 50; i++) {
        int raw = analogRead(CURRENT_PIN);
        float mv = (raw - zeroPoint) * VPP;
        float amps = mv / SENSITIVITY;
        currentSum += amps;
        delayMicroseconds(100);
    }
    float current = abs(currentSum / 50.0);
    if (current < 0.05) current = 0;

    float power = voltage * current;
    totalKWh += (power * 3.0) / 3600000.0;
    
    bool relayStatus = digitalRead(RELAY_PIN) == HIGH;

    // ===== Send to Firebase =====
    Serial.print("Sending data: V=");
    Serial.print(voltage, 2);
    Serial.print(" I=");
    Serial.print(current, 3);
    Serial.print(" P=");
    Serial.print(power, 1);
    Serial.println();

    // Send individual values (simpler, more reliable)
    if (Firebase.RTDB.setFloat(&fbdo, "energy_data/latest/voltage", voltage)) {
      Serial.println("  ✓ Voltage sent");
    } else {
      Serial.println("  ✗ Voltage failed: " + fbdo.errorReason());
    }

    if (Firebase.RTDB.setFloat(&fbdo, "energy_data/latest/current", current)) {
      Serial.println("  ✓ Current sent");
    } else {
      Serial.println("  ✗ Current failed: " + fbdo.errorReason());
    }

    if (Firebase.RTDB.setFloat(&fbdo, "energy_data/latest/power", power)) {
      Serial.println("  ✓ Power sent");
    } else {
      Serial.println("  ✗ Power failed: " + fbdo.errorReason());
    }

    if (Firebase.RTDB.setFloat(&fbdo, "energy_data/latest/energy", totalKWh)) {
      Serial.println("  ✓ Energy sent");
    } else {
      Serial.println("  ✗ Energy failed: " + fbdo.errorReason());
    }

    if (Firebase.RTDB.setBool(&fbdo, "energy_data/latest/deviceStatus", relayStatus)) {
      Serial.println("  ✓ Status sent");
    } else {
      Serial.println("  ✗ Status failed: " + fbdo.errorReason());
    }

    // Also push to history (this creates new entries)
    char historyPath[50];
    sprintf(historyPath, "energy_data/history/%ld", millis());
    
    FirebaseJson json;
    json.set("voltage", voltage);
    json.set("current", current);
    json.set("power", power);
    json.set("energy", totalKWh);
    json.set("deviceStatus", relayStatus);
    json.set("timestamp", (long long)millis());

    if (Firebase.RTDB.setJSON(&fbdo, historyPath, &json)) {
      Serial.println("  ✓ History entry saved");
    } else {
      Serial.println("  ✗ History failed: " + fbdo.errorReason());
    }
  }

  // Check for Remote Commands (less frequently - every 2 seconds)
  if (millis() - lastCommandCheck > 2000) {
    lastCommandCheck = millis();
    
    if (Firebase.RTDB.getBool(&fbdo, "device_control/status")) {
      bool shouldBeOn = fbdo.boolData();
      bool currentState = digitalRead(RELAY_PIN) == HIGH;
      
      if (shouldBeOn != currentState) {
        digitalWrite(RELAY_PIN, shouldBeOn ? HIGH : LOW);
        Serial.print("🔄 Relay toggled: ");
        Serial.println(shouldBeOn ? "ON" : "OFF");
      }
    } else {
      // This is OK - path might not exist yet or rule issue
      // Serial.println("Command check failed: " + fbdo.errorReason());
    }
  }

  delay(100);
}
