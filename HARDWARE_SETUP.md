# Hardware Integration Guide - Live Demo Room

This guide explains how to integrate your ESP32 hardware with the EcoPulse AI Dashboard for real-time energy monitoring and device control.

## Hardware Components

- **MCU**: ESP32 or similar WiFi-enabled microcontroller
- **Voltage Sensor**: Pin 35 (ADC)
- **Current Sensor**: Pin 34 (ACS712-10A)
- **Relay Control**: Pin 26 (GPIO)

## ESP32 Code Setup

### 1. Install Required Libraries
In Arduino IDE:
- `Firebase_ESP_Client` by Mobizt
- `Arduino` (built-in)

### 2. Configure Hardware Code

```cpp
#include <WiFi.h>
#include <Firebase_ESP_Client.h>

// 1. WiFi Credentials - UPDATE THESE
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// 2. Firebase Credentials - Already configured
#define API_KEY "AIzaSyCoqZMZhe_02gZAPZyY8tJ9xr6ApOfFN7g"
#define DATABASE_URL "https://energy-magement-system-default-rtdb.firebaseio.com"

// 3. Pin Definitions (Adjust based on your setup)
const int CURRENT_PIN = 34;   // ADC Pin for current sensor
const int VOLT_PIN = 35;      // ADC Pin for voltage sensor
const int RELAY_PIN = 26;     // GPIO Pin for relay control

// 4. Calibration - Adjust based on your sensors
float VPP = 3.3 / 4095.0;                      // ESP32 ADC: 3.3V / 12-bit
float SENSITIVITY = 0.100;                     // 100mV/A for ACS712-10A
float VOLT_DIVIDER_RATIO = 3.12;              // Your voltage divider ratio

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

unsigned long lastMillis = 0;
float totalKWh = 0;

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);  // Start with relay OFF
  
  // Connect to WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  int timeout = 0;
  while (WiFi.status() != WL_CONNECTED && timeout < 20) { 
    delay(500); 
    Serial.print(".");
    timeout++;
  }
  Serial.println("\nWiFi Connected!" );

  // Initialize Firebase
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  if (Firebase.ready() && (millis() - lastMillis > 3000)) {
    lastMillis = millis();

    // ===== Read Sensors =====
    // Voltage Reading
    float adcVolt = analogRead(VOLT_PIN) * VPP;
    float voltage = adcVolt * VOLT_DIVIDER_RATIO;
    if (voltage < 0) voltage = 0;

    // Current Reading (with zero-point calibration)
    int zeroPoint = 2048;  // Approximate center point on ESP32 (0-4095 range)
    float currentSum = 0;
    for(int i = 0; i < 50; i++) {
        int raw = analogRead(CURRENT_PIN);
        float mv = (raw - zeroPoint) * VPP;
        float amps = mv / SENSITIVITY;
        currentSum += amps;
        delayMicroseconds(100);
    }
    float current = abs(currentSum / 50.0);
    if (current < 0.05) current = 0;  // Filter noise

    // Power Calculation
    float power = voltage * current;
    totalKWh += (power * 3.0) / 3600000.0;  // kWh accumulation

    // ===== Send to Firebase =====
    FirebaseJson json;
    json.set("voltage", voltage);
    json.set("current", current);
    json.set("power", power);
    json.set("energy", totalKWh);
    json.set("deviceStatus", digitalRead(RELAY_PIN) == HIGH);
    
    // Push the newest data to Firebase
    if (Firebase.RTDB.setJSON(&fbdo, "energy_data/latest", &json)) {
      Serial.println("Data sent successfully!");
    } else {
      Serial.println("FAILED to send data: " + fbdo.errorReason());
    }

    // Attempt to save to history (ignoring errors for cleaner console if that's what fails)
    Firebase.RTDB.pushJSON(&fbdo, "energy_data/history", &json);

    // ===== Check for Remote Commands =====
    // This allows the dashboard to control your relay
    if (Firebase.RTDB.getBool(&fbdo, "device_control/status")) {
      bool controlStatus = fbdo.boolData();
      digitalWrite(RELAY_PIN, controlStatus ? HIGH : LOW);
      Serial.print("Relay changed to: "); 
      Serial.println(controlStatus ? "ON" : "OFF");
    } else {
      Serial.println("FAILED to receive command: " + fbdo.errorReason());
    }

    // Debug output (optional - comment out in production)
    Serial.printf("V:%.2f | I:%.3f | P:%.0f | E:%.3f\n", voltage, current, power, totalKWh);
  }
}
```

### 3. Upload to ESP32
1. Select Board: ESP32 DEV Module
2. Select Port: COM port where ESP32 is connected
3. Click Upload

## Dashboard Features

### Live Demo Room Control

Once your ESP32 is running:

1. **Real-time Data Display**
   - Voltage (V)
   - Current (A)
   - Power Load (W)
   - Total Consumption (kWh)

2. **Remote Relay Control**
   - Click "ACTIVATE SECTOR" button to turn ON
   - Click "SHUTDOWN SECTOR" button to turn OFF
   - Status updates in real-time

3. **Automatic Data Logging**
   - All measurements stored in Firebase history
   - Consumption graph auto-updates
   - AI insights analyze patterns

## Firebase Data Structure

```
energy_data/
  ├── latest/           (overwrites, one entry per device)
  │   ├── voltage
  │   ├── current
  │   ├── power
  │   ├── energy
  │   ├── deviceStatus  (relay state)
  │   └── timestamp
  │
  └── history/          (appends, max 100 entries shown)
      ├── -ABC123def
      ├── -ABC123ghi
      └── ...

device_control/
  └── status            (boolean, controlled by dashboard)
```

## Troubleshooting

### Hardware not showing data
- Check WiFi credentials in code
- Verify Firebase credentials match `.env.local`
- Check serial monitor for errors
- Ensure ESP32 can reach `energy-magement-system-default-rtdb.firebaseio.com`

### Relay not responding to dashboard
- Verify relay pin (default 26) is connected correctly
- Check Firebase Real-time Database rules allow writes to `device_control/status`
- Test relay with `pinMode(26, OUTPUT); digitalWrite(26, HIGH);`

### Sensor readings incorrect
- Calibrate voltage divider ratio using multimeter
- Check ACS712 sensitivity datasheet for your current range
- Verify pin connections (34=Current, 35=Voltage)

### Graph still empty
- Wait 10 seconds for initial data
- Check Firebase Realtime Database in console
- Ensure `energy_data/history` path exists

## Firmware Version Notes

- Compatible with Arduino core for ESP32 2.0.x
- Firebase library version 4.x or higher
- WiFi must be stable (2.4GHz recommended)

## Security Notes

⚠️ **Important**: The hardware code uses anonymous Firebase authentication. For production:
1. Set up Firebase authentication rules
2. Use service account credentials
3. Restrict database access to specific users
4. Enable SSL/TLS verification

## Support

For issues, check:
- Serial monitor output from ESP32
- Firebase Realtime Database console
- Browser DevTools console for dashboard errors
