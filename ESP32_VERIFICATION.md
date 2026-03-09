# ESP32 Hardware Connection Verification

## ✅ Current Status
- **WiFi**: ✅ Connected to your network
- **Next Step**: Verify data is flowing from ESP32 → Firebase → Dashboard

## 🔐 Pre-Check: Verify Credentials Match

Before checking data flow, ensure all credentials are aligned:

### 1. ESP32 Code Has These (Already Set)
```cpp
#define API_KEY "AIzaSyCoqZMZhe_02gZAPZyY8tJ9xr6ApOfFN7g"
#define DATABASE_URL "https://energy-magement-system-default-rtdb.firebaseio.com"
```

### 2. Dashboard `.env.local` Should Have Same
```
VITE_GEMINI_API_KEY="AIzaSyA8HqkepGtf8Uv32l9cuWL5-O-bGydUzPs"
VITE_FIREBASE_API_KEY="AIzaSyCoqZMZhe_02gZAPZyY8tJ9xr6ApOfFN7g"
VITE_FIREBASE_DATABASE_URL="https://energy-magement-system-default-rtdb.firebaseio.com"
VITE_FIREBASE_PROJECT_ID="energy-magement-system"
```

✅ Both match? Continue to Step 1 below.  
❌ Mismatch? Update the values to match.

## 📊 Step 1: Check ESP32 Serial Monitor (Next 10-15 seconds)

Look for messages like:
```
Data sent successfully!
Relay changed to: OFF
```

If you see errors like:
```
FAILED to send data: AUTHENTICATION FAILED
```

This means Firebase credentials are wrong. Re-check:
- `API_KEY` 
- `DATABASE_URL`

## 🔍 Step 2: Check Firebase Realtime Database

1. Go to: https://console.firebase.google.com
2. Select project: `energy-magement-system`
3. Click "Realtime Database"
4. Look for these paths:
   ```
   energy_data/
   ├── latest/
   │   ├── voltage: ~220-240
   │   ├── current: 0.5-2.0
   │   ├── power: 100-500
   │   ├── energy: incrementing number
   │   └── deviceStatus: true or false
   └── history/
       └── -ABC123... (automatically generated)
   
   device_control/
   └── status: false (initially)
   ```

If **latest/** is empty:
- Check ESP32 serial for errors
- Verify WiFi password is correct
- Check if Firebase has internet access

## 🎯 Step 3: Check Dashboard - Live Demo Room

1. Open dashboard: `http://localhost:5173`
2. Look at "Live Demo" sector card:
   - Should show **LIVE** badge (red/pulsing)
   - Voltage should show ~220V
   - Current should show actual value (not 0)
   - Power should be changing
   - Consumption should incrementing

3. If sector shows zeros:
   - Wait 10+ seconds for first data point
   - Check browser console for errors (F12)
   - Verify `.env.local` has correct Firebase credentials

## 🎛️ Step 4: Test Relay Control

1. Click on **"Live Demo"** sector card
2. Modal opens showing device details
3. Click **"ACTIVATE SECTOR"** button
   - Relay should turn ON
   - Serial monitor should show: `Relay changed to: ON`
   - Button text changes to "SHUTDOWN SECTOR"

4. Click **"SHUTDOWN SECTOR"** button
   - Relay should turn OFF
   - Serial monitor shows: `Relay changed to: OFF`
   - Button text changes to "ACTIVATE SECTOR"

5. If relay doesn't respond:
   - Check pin 26 is connected to relay
   - Verify relay circuit is correct
   - Check Firebase `device_control/status` is changing (F12 → Console)

## 🔧 Troubleshooting

### Data Not Appearing on Dashboard

**Symptom**: Dashboard shows simulation data instead of real hardware
**Solution**:
1. Check ESP32 serial monitor for errors
2. Run `npm run dev` and check browser console (F12)
3. Verify Firebase credentials match in:
   - ESP32 code
   - `.env.local` file
   - Firebase Console

### Relay Not Responding

**Symptom**: Button works but relay doesn't toggle
**Solution**:
1. Test relay directly: Connect GPIO 26 HIGH/LOW with code
2. Check relay circuit power supply
3. Verify relay is rated for ESP32 3.3V logic
4. Add 1k resistor between GPIO 26 and relay base

### Voltage/Current Showing Wrong Values

**Symptom**: Readings are too high/low/negative
**Solution**:
1. Verify pinout:
   - VOLT_PIN = 35 ✓
   - CURRENT_PIN = 34 ✓
2. Check calibration values:
   - `VOLT_DIVIDER_RATIO = 3.12` (adjust if wrong)
   - `SENSITIVITY = 0.100` (for ACS712-10A)
3. Use multimeter to measure actual voltage/current
4. Add Serial.print statements:
   ```cpp
   Serial.println("Raw ADC: " + String(analogRead(VOLT_PIN)));
   Serial.println("Voltage: " + String(voltage));
   ```

## 📝 Debug: Add This to ESP32 Code

To see all incoming/outgoing data, modify `loop()`:

```cpp
Serial.println("=== DEBUG INFO ===");
Serial.print("V: "); Serial.print(voltage);
Serial.print(" | I: "); Serial.print(current);
Serial.print(" | P: "); Serial.print(power);
Serial.print(" | E: "); Serial.println(totalKWh);

if (Firebase.RTDB.getBool(&fbdo, "device_control/status")) {
  Serial.print("Firebase Control Status: ");
  Serial.println(fbdo.boolData() ? "ON" : "OFF");
}
```

## ✨ Next Steps After Verification

1. **Everything working?**
   - Celebrate! 🎉
   - Hardware integration is complete
   - Monitor the dashboard in real-time

2. **Issues?**
   - Check the troubleshooting section above
   - Verify all connections with multimeter
   - Update calibration values based on actual sensors

3. **Production deployment?**
   - Set up OTA (Over-The-Air) updates
   - Configure Firebase security rules
   - Add watchdog timer to ESP32
   - Test long-term stability (24+ hours)

## 📞 Quick Reference

| Component | Pin | Expected Value | Notes |
|-----------|-----|-----------------|-------|
| Voltage Sensor | GPIO 35 (ADC) | 0-4095 RAW → ~220V | Read every 3 seconds |
| Current Sensor | GPIO 34 (ADC) | 0-4095 RAW → 0-10A | 50 samples per read |
| Relay Control | GPIO 26 (GPIO) | HIGH=ON, LOW=OFF | Controlled by dashboard |
| WiFi | External | ~2.4GHz | Auto-reconnects |
| Firebase | 🌐 Cloud | Realtime updates | 3-second interval |

## 🔌 Relay Circuit Wiring (Standard Setup)

```
ESP32 GPIO 26 (3.3V logic)
         ↓
    [Optional 1K resistor]
         ↓
    [Relay Module Base]
         ↓
    [Relay Coil: 12V/5V]
         ↓
    [Normally Open Contact controls Light/Device]
         ↓
    [220V AC Power Supply to Load]
```

**Important**: If using 12V relay:
- Add transistor or relay module between GPIO 26 and relay coil
- Protect with diode across relay coil
- Use separate 12V power supply for relay

## 🚀 Success Indicators

✅ **Serial Monitor shows**:
- `Data sent successfully!` (every 3 seconds)
- `Relay changed to: ON/OFF` (when you click button)
- `V:220.xx | I:2.30 | P:506 | E:0.123` (debug line)

✅ **Firebase Console shows**:
- `energy_data/latest/voltage` ≈ 220-240V
- `energy_data/latest/current` ≈ 0.5-10A
- `energy_data/latest/power` > 0W
- `energy_data/history/` has multiple entries

✅ **Dashboard shows**:
- "LIVE" badge on Live Demo sector
- Real voltage/current/power values (not zeros)
- Consumption graph has data points
- Relay button responds to clicks
