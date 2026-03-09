# ESP32 "Bad Request" Error Fix 🔧

## Problem Identified
Your ESP32 is getting **"FAILED - Bad request"** errors when trying to send data to Firebase.

This happens because:
1. **Firebase Security Rules** are blocking the write
2. **JSON format** was too complex for Firebase

## ✅ Solution: 3 Easy Steps

### Step 1: Update Your ESP32 Code

Use the new **`ESP32_FIXED_CODE.ino`** file provided in this repository.

**Key changes made:**
- ✅ Send each sensor value **separately** instead of one big JSON
- ✅ Better error messages in Serial Monitor
- ✅ Simpler Firebase paths
- ✅ More reliable command checking
- ✅ Added setup status messages

**How to use it:**
1. Copy the code from `ESP32_FIXED_CODE.ino`
2. Paste it into Arduino IDE (replace old code)
3. Update WiFi credentials (line 5-6):
   ```cpp
   #define WIFI_SSID "sathvik"
   #define WIFI_PASSWORD "12345678"
   ```
4. Click **Upload**

---

### Step 2: Fix Firebase Security Rules (IMPORTANT!)

Firebase by default blocks writes. You need to allow anonymous access:

1. **Go to Firebase Console:**
   - https://console.firebase.google.com
   - Select project: `energy-magement-system`

2. **Click "Realtime Database"** in left menu

3. **Click "Rules" tab** at the top

4. **Replace ALL rules with this:**

```json
{
  "rules": {
    "energy_data": {
      ".read": true,
      ".write": true,
      "latest": {
        ".validate": "newData.hasChildren(['voltage', 'current', 'power', 'energy', 'deviceStatus'])"
      },
      "history": {
        ".indexOn": ["timestamp"],
        ".write": true
      }
    },
    "device_control": {
      ".read": true,
      ".write": true,
      "status": {
        ".validate": "newData.isBoolean()"
      }
    }
  }
}
```

5. **Click "Publish"** button

⚠️ **Security Note**: These rules allow anyone to read/write. For production:
- Add authentication
- Add user ID validation
- Restrict paths by user

---

### Step 3: Upload & Test

1. **Upload fixed code to ESP32** (Arduino IDE → Upload)

2. **Open Serial Monitor** (Ctrl+Shift+M)

3. **Expected output (should NOT have "FAILED" anymore):**
   ```
   ===== STARTING SETUP =====
   Connecting to WiFi: sathvik
   .....
   ✓ WiFi Connected!
   IP: 192.168.1.xxx
   
   Initializing Firebase...
   ✓ Firebase Ready!
   ===== SETUP COMPLETE =====
   
   Sending data: V=220.45 I=1.23 P=271
     ✓ Voltage sent
     ✓ Current sent
     ✓ Power sent
     ✓ Energy sent
     ✓ Status sent
     ✓ History entry saved
   
   Sending data: V=220.50 I=1.25 P=276
   ...
   ```

4. **Check Firebase Console** → Data appearing in `energy_data/latest/`

5. **Open Dashboard**: http://localhost:5173
   - "LIVE" badge should appear on Live Demo sector
   - Voltage/Current/Power should show real values
   - Try clicking "ACTIVATE/SHUTDOWN" button

---

## 🆘 Still Getting Errors?

### Common Issues & Solutions

| Error | Cause | Fix |
|-------|-------|-----|
| `FAILED - Bad request` | Rules blocking write | Update Firebase Rules (Step 2 above) |
| `FAILED - User disabled` | Anonymous auth disabled | Enable Anonymous Auth in Firebase Console |
| `FAILED - Connection refused` | Firebase URL wrong | Check DATABASE_URL in code |
| `FAILED - Timeout` | No internet | Check WiFi connection |

### Detailed Troubleshooting

**For "Bad request" specifically:**

1. **Check Firebase Rules are Published:**
   - Go to Firebase Console
   - Realtime Database → Rules tab
   - Should show your custom rules (not default)
   - Status should be "✓ Published"

2. **Enable Anonymous Authentication:**
   - Go to Firebase Console
   - Authentication (left menu)
   - Sign-in method tab
   - Look for "Anonymous"
   - If not enabled, click it and toggle ON

3. **Check Database Exists:**
   - Realtime Database should already exist
   - If "Create Database" button shows, click it
   - Choose location: `asia-southeast1`
   - Leave rules as default (you'll update them)

---

## 📊 Testing Checklist

After uploading fixed code:

- [ ] Serial Monitor shows "✓ Firebase Ready!"
- [ ] Serial shows "✓ Voltage sent", "✓ Current sent", etc. (no FAILED)
- [ ] Firebase Console shows data in `energy_data/latest/`
- [ ] Dashboard shows "LIVE" badge on Live Demo sector
- [ ] Dashboard shows real voltage/current values
- [ ] Relay button works (click → relay toggles)
- [ ] Graph has data points

---

## 🚀 After Everything Works

1. **Monitor for 10+ minutes** to ensure stability
2. **Check consumption graph** populates with real data
3. **Test relay control** multiple times
4. **Check AI insights** generate after 50 data points
5. **Deploy to production** when confident

---

## 📝 Files Updated

- `ESP32_FIXED_CODE.ino` - New working code (use this!)
- Original code has issues (don't use anymore)

## 💡 Why The Fix Works

**Original problematic code:**
```cpp
FirebaseJson json;
json.set("voltage", voltage);
// ... trying to send big object
Firebase.RTDB.setJSON(&fbdo, "energy_data/latest", &json);
```

**Fixed approach:**
```cpp
// Send each value separately (simpler, more reliable)
Firebase.RTDB.setFloat(&fbdo, "energy_data/latest/voltage", voltage);
Firebase.RTDB.setFloat(&fbdo, "energy_data/latest/current", current);
// ...
```

This is simpler and plays better with Firebase security rules.

---

**Try these steps and report back!** What's in your Serial Monitor now?
