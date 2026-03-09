#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// ============================================
// 1. WiFi Credentials - UPDATE THESE
// ============================================
#define WIFI_SSID "sathvik"
#define WIFI_PASSWORD "12345678"

// ============================================
// 2. Firebase Credentials (Already correct)
// ============================================
#define API_KEY "AIzaSyCoqZMZhe_02gZAPZyY8tJ9xr6ApOfFN7g"
#define DATABASE_URL "https://energy-magement-system-default-rtdb.firebaseio.com"

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
// Firebase Objects
// ============================================
FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

// ============================================
// Timing & Energy Variables
// ============================================
unsigned long lastMillis = 0;
unsigned long lastCommandCheck = 0;
float totalKWh = 0;

// ============================================
// SETUP FUNCTION
// ============================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Initialize Relay Pin
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);  // Start with relay OFF
  
  // Print startup message
  Serial.println("\n\n");
  Serial.println("╔════════════════════════════════════╗");
  Serial.println("║   ECOPULSE ESP32 HARDWARE SETUP    ║");
  Serial.println("╚════════════════════════════════════╝\n");
  
  // ===== WiFi Connection =====
  Serial.println("[1/3] Connecting to WiFi...");
  Serial.print("SSID: " + String(WIFI_SSID) + " ");
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int timeout = 0;
  while (WiFi.status() != WL_CONNECTED && timeout < 20) { 
    delay(500); 
    Serial.print(".");
    timeout++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(" ✓");
    Serial.println("IP Address: " + WiFi.localIP().toString());
    Serial.println("RSSI: " + String(WiFi.RSSI()) + " dBm\n");
  } else {
    Serial.println(" ✗ FAILED!");
    Serial.println("ERROR: Could not connect to WiFi");
    Serial.println("Check SSID and password!\n");
    return;
  }

  // ===== Firebase Initialization =====
  Serial.println("[2/3] Initializing Firebase...");
  
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  
  // Use anonymous authentication
  auth.user.email = "";
  auth.user.password = "";
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
  Firebase.setFloatDigits(4);
  
  // ===== Wait for Firebase to be Ready =====
  Serial.print("Waiting for Firebase ");
  int fbTimeout = 0;
  while (!Firebase.ready() && fbTimeout < 30) {
    delay(500);
    Serial.print(".");
    fbTimeout++;
  }
  Serial.println();
  
  if (Firebase.ready()) {
    Serial.println("✓ Firebase Connected!\n");
    Serial.println("[3/3] System Ready\n");
    Serial.println("╔════════════════════════════════════╗");
    Serial.println("║      ✓ SETUP COMPLETE ✓           ║");
    Serial.println("╚════════════════════════════════════╝\n");
    Serial.println("Data transmission starting...\n");
  } else {
    Serial.println("✗ Firebase FAILED!\n");
    Serial.println("TROUBLESHOOTING:");
    Serial.println("1. Check Firebase API Key");
    Serial.println("2. Enable Anonymous Authentication in Firebase Console");
    Serial.println("3. Update Realtime Database Rules to allow read/write");
    Serial.println("4. Check database URL\n");
  }
}

// ============================================
// MAIN LOOP FUNCTION
// ============================================
void loop() {
  // Check if Firebase is ready
  if (!Firebase.ready()) {
    Serial.println("⚠ Firebase not ready. Retrying...");
    delay(1000);
    return;
  }

  // ===== SENSOR DATA TRANSMISSION (Every 3 Seconds) =====
  if (millis() - lastMillis > 3000) {
    lastMillis = millis();

    // Read Voltage Sensor
    float voltage = (analogRead(VOLT_PIN) * VPP) * VOLT_DIVIDER_RATIO;
    if (voltage < 0) voltage = 0;

    // Read Current Sensor (with 50-sample averaging)
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

    // Calculate Power
    float power = voltage * current;
    totalKWh += (power * 3.0) / 3600000.0;
    
    // Get Relay Status
    bool relayStatus = digitalRead(RELAY_PIN) == HIGH;

    // Print readings to Serial
    Serial.print("📊 ");
    Serial.print(millis() / 1000);
    Serial.print("s | V=");
    Serial.print(voltage, 2);
    Serial.print("V I=");
    Serial.print(current, 3);
    Serial.print("A P=");
    Serial.print(power, 1);
    Serial.print("W E=");
    Serial.print(totalKWh, 3);
    Serial.println("kWh");

    // ===== Send to Firebase =====
    boolean success = true;

    // Send Voltage
    if (!Firebase.RTDB.setFloat(&fbdo, "energy_data/latest/voltage", voltage)) {
      Serial.println("  ✗ Voltage: " + fbdo.errorReason());
      success = false;
    }

    // Send Current
    if (!Firebase.RTDB.setFloat(&fbdo, "energy_data/latest/current", current)) {
      Serial.println("  ✗ Current: " + fbdo.errorReason());
      success = false;
    }

    // Send Power
    if (!Firebase.RTDB.setFloat(&fbdo, "energy_data/latest/power", power)) {
      Serial.println("  ✗ Power: " + fbdo.errorReason());
      success = false;
    }

    // Send Energy
    if (!Firebase.RTDB.setFloat(&fbdo, "energy_data/latest/energy", totalKWh)) {
      Serial.println("  ✗ Energy: " + fbdo.errorReason());
      success = false;
    }

    // Send Device Status
    if (!Firebase.RTDB.setBool(&fbdo, "energy_data/latest/deviceStatus", relayStatus)) {
      Serial.println("  ✗ Status: " + fbdo.errorReason());
      success = false;
    }

    if (success) {
      Serial.println("  ✓ All data sent to Firebase");
    }

    // ===== Save to History =====
    char historyPath[60];
    sprintf(historyPath, "energy_data/history/%ld", millis());
    
    FirebaseJson json;
    json.set("voltage", voltage);
    json.set("current", current);
    json.set("power", power);
    json.set("energy", totalKWh);
    json.set("deviceStatus", relayStatus);
    json.set("timestamp", (long long)millis());

    if (Firebase.RTDB.setJSON(&fbdo, historyPath, &json)) {
      Serial.println("  ✓ History saved");
    } else {
      Serial.println("  ✗ History: " + fbdo.errorReason());
    }
  }

  // ===== CHECK FOR REMOTE COMMANDS (Every 2 Seconds) =====
  if (millis() - lastCommandCheck > 2000) {
    lastCommandCheck = millis();
    
    if (Firebase.RTDB.getBool(&fbdo, "device_control/status")) {
      bool shouldBeOn = fbdo.boolData();
      bool currentState = digitalRead(RELAY_PIN) == HIGH;
      
      // Toggle relay if command differs from current state
      if (shouldBeOn != currentState) {
        digitalWrite(RELAY_PIN, shouldBeOn ? HIGH : LOW);
        Serial.print("🔄 RELAY COMMAND: ");
        Serial.println(shouldBeOn ? "ON ✓" : "OFF ✓");
        
        // Update status immediately
        Firebase.RTDB.setBool(&fbdo, "energy_data/latest/deviceStatus", shouldBeOn);
      }
    }
  }

  delay(100);
}
