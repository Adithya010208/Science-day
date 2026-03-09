# ESP32 Final Setup Checklist ✅

## BEFORE YOU UPLOAD CODE

You MUST complete these Firebase steps or the code will NOT work:

---

## ⚡ STEP 1: Enable Anonymous Authentication (2 min)

**Location:** https://console.firebase.google.com

1. Select project: `energy-magement-system`
2. Click **"Authentication"** (left sidebar)
3. Click **"Sign-in method"** tab (top)
4. Find **"Anonymous"** in the provider list
5. Click it → Toggle **ON** (switch becomes blue)
6. Click **"Save"**
7. ✅ You should see: "Anonymous - Enabled"

---

## 🔐 STEP 2: configure Security Rules (3 min)

**Location:** https://console.firebase.google.com → Realtime Database

1. Click "Realtime Database" (left sidebar)
2. Click "Rules" tab (top)
3. **Delete ALL existing text**
4. **Copy & Paste This Entire Code:**

```json
{
  "rules": {
    ".read": true,
    ".write": true,
    "energy_data": {
      ".read": true,
      ".write": true,
      "latest": {
        ".read": true,
        ".write": true
      },
      "history": {
        ".read": true,
        ".write": true
      }
    },
    "device_control": {
      ".read": true,
      ".write": true,
      "status": {
        ".read": true,
        ".write": true
      }
    }
  }
}
```

5. Click **"Publish"** (blue button, bottom right)
6. ✅ Wait for message: "✓ Rules updated"

---

## 📝 STEP 3: Copy Final Code (2 min)

**Use:** `ESP32_FINAL_CODE.ino` (NOT the FIXED_CODE.ino)

1. **Open File:** `ESP32_FINAL_CODE.ino` from your project
2. **Copy ALL code** (Ctrl+A, then Ctrl+C)
3. **Open Arduino IDE**
4. **Replace your code** (Ctrl+A, then Ctrl+V)
5. **Check WiFi on lines 7-8:**
   ```cpp
   #define WIFI_SSID "sathvik"
   #define WIFI_PASSWORD "12345678"
   ```
   ✅ These should match YOUR WiFi credentials

6. **Save** (Ctrl+S)

---

## 🚀 STEP 4: Upload to ESP32 (2 min)

1. **Select Board:** Tools → Board → ESP32 → ESP32 Dev Module
2. **Select Port:** Tools → Port → COM9 (or whatever port shows)
3. **Click Upload** (right arrow button)
4. **Wait for:** "✓ Done uploading. (xxx ms)"
5. **Wait 5 seconds** for ESP32 to reboot

---

## 📊 STEP 5: Verify in Serial Monitor (3 min)

1. **Open Serial Monitor:** Tools → Serial Monitor (or Ctrl+Shift+M)
2. **Set Speed:** 115200 (bottom right dropdown)
3. **You should see:**

```
╔════════════════════════════════════╗
║   ECOPULSE ESP32 HARDWARE SETUP    ║
╚════════════════════════════════════╝

[1/3] Connecting to WiFi...
SSID: sathvik .................✓
IP Address: 192.168.x.x
RSSI: -45 dBm

[2/3] Initializing Firebase...
Waiting for Firebase ..............................
✓ Firebase Connected!

[3/3] System Ready

╔════════════════════════════════════╗
║      ✓ SETUP COMPLETE ✓           ║
╚════════════════════════════════════╝

Data transmission starting...

📊 3s | V=220.45V I=1.230A P=270.6W E=0.000kWh
  ✓ All data sent to Firebase
  ✓ History saved

📊 6s | V=220.50V I=1.240A P=273.8W E=0.001kWh
  ✓ All data sent to Firebase
  ✓ History saved
```

✅ **If YES:** Continue to Step 6  
❌ **If NO:** See Troubleshooting section below

---

## 🎨 STEP 6: Check Dashboard (2 min)

1. **Open Terminal/PowerShell**
2. **Start dashboard:**
   ```powershell
   cd "c:\Users\ADITHYA KATHIRESAN\OneDrive\Desktop\ecopulse-ai"
   npm run dev
   ```
3. **Open browser:** http://localhost:5173
4. **Look for "Live Demo" sector:**
   - ✅ Should show RED "LIVE" badge (pulsing)
   - ✅ Voltage should show ~220V (not 230)
   - ✅ Current should show real number (not 0)
   - ✅ Power should change every 3 seconds

---

## 🧪 STEP 7: Test Relay Control (2 min)

1. **Click on "Live Demo" sector card**
2. **Modal opens showing:**
   - Voltage, Current, Power, Consumption
   - Status: "Connected & Active"
   - Last Update: timestamp

3. **Click Button:**
   - If showing "SHUTDOWN SECTOR" → Click it
   - Serial Monitor should show: `🔄 RELAY COMMAND: OFF ✓`
   - Relay physically clicks ON

4. **Click Again:**
   - Button now shows "ACTIVATE SECTOR" → Click it
   - Serial shows: `🔄 RELAY COMMAND: ON ✓`
   - Relay physically clicks OFF

✅ **Relay responds?** SUCCESS! 🎉

---

## 🔧 Troubleshooting

### "✗ Firebase Failed!" in Serial Monitor

**Cause:** Firebase authentication issue

**Fix:**
1. ✅ Did you enable **Anonymous Authentication**? (Step 1)
2. ✅ Did you **Publish the Rules**? (Step 2)
3. ✅ Did you wait 10+ seconds for Firebase to connect?

If still failing:
- Reset ESP32: Press reset button
- Restart Arduino IDE
- Try uploading again

### "No data in Firebase Console"

**Cause:** Rules might not be published

**Fix:**
1. Go to Firebase → Realtime Database → Rules
2. Check if message says "✓ Rules updated"
3. If not, re-paste the rules (Step 2)
4. Click Publish again

### "Dashboard shows ZEROS"

**Cause:** Data hasn't arrived yet

**Fix:**
1. Wait 20 seconds for first data point
2. Refresh dashboard page (F5)
3. Check Serial Monitor shows data sending

### "Relay doesn't toggle"

**Cause:** GPIO 26 issue or relay circuit problem

**Fix:**
1. Check GPIO 26 is physically connected
2. Verify relay circuit has power
3. Check if relay clicks when you hear it
4. Test with simple code:
   ```cpp
   digitalWrite(26, HIGH);   // Relay ON
   delay(2000);
   digitalWrite(26, LOW);    // Relay OFF
   ```

---

## 📋 Final Checklist

- [ ] Anonymous Authentication is ENABLED in Firebase
- [ ] Security Rules are PUBLISHED in Firebase  
- [ ] Using `ESP32_FINAL_CODE.ino` (not FIXED_CODE)
- [ ] WiFi credentials match your network
- [ ] Code uploaded successfully (✓ Done uploading)
- [ ] Serial Monitor shows ✓ (not ✗) messages
- [ ] Firebase data appears in console
- [ ] Dashboard shows LIVE badge
- [ ] Relay responds to ACTIVATE/SHUTDOWN buttons
- [ ] Graph shows real-time data

---

## 🎯 SUCCESS INDICATORS

✅ Serial: "✓ SETUP COMPLETE ✓"  
✅ Serial: "✓ All data sent to Firebase"  
✅ Firebase Console: Data in `energy_data/latest/`  
✅ Dashboard: LIVE badge on Live Demo sector  
✅ Dashboard: Real voltage/current numbers  
✅ Relay: Toggles when you click button  

**If ALL of these ✅, you're READY!** 🚀

---

## 📺 What's Happening Now

1. **ESP32** reads voltage/current sensors every 3 seconds
2. **Sends data** to Firebase cloud database
3. **Dashboard** reads from Firebase and displays in real-time
4. **When you click buttons** on dashboard, it writes to `device_control/status`
5. **ESP32** reads that command and toggles relay
6. **Data stored** in history for graphs and analysis

All happening in real-time! ⚡

---

## 🆘 Still Having Issues?

1. Take screenshots of:
   - Serial Monitor output
   - Firebase Console Rules page
   - Firebase Console Authentication page

2. Check error messages carefully

3. Restart everything:
   - Unplug ESP32
   - Close Arduino IDE
   - Close Dashboard
   - Wait 30 seconds
   - Plug in ESP32
   - Open Arduino IDE
   - Start again

Let me know what you see! 📱
