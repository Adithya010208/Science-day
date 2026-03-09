import { initializeApp, FirebaseApp } from "firebase/app";
import { getDatabase, ref, onValue, set, off, query, limitToLast, Database } from "firebase/database";
import { EnergyData } from "../types";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCoqZMZhe_02gZAPZyY8tJ9xr6ApOfFN7g",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "energy-magement-system.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://energy-magement-system-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "energy-magement-system",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "energy-magement-system.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "706194716993",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:706194716993:web:25026a26091543ac72c9c0",
};

// Check if config is valid
const isConfigValid = !!(firebaseConfig.apiKey && firebaseConfig.databaseURL && firebaseConfig.projectId);

let app: FirebaseApp | null = null;
let db: Database | null = null;

if (isConfigValid) {
  try {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

export const subscribeToEnergyData = (callback: (data: EnergyData) => void) => {
  if (!db) {
    console.warn("Firebase not initialized. Check your environment variables.");
    return () => {};
  }

  const energyRef = ref(db, 'energy_data/latest');
  onValue(energyRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      callback({
        voltage: data.voltage || 0,
        current: data.current || 0,
        power: data.power || 0,
        energy: data.energy || 0,
        deviceStatus: data.deviceStatus || false,
        timestamp: data.timestamp || new Date().toISOString(),
      });
    }
  });

  return () => off(energyRef);
};

export const subscribeToHistory = (callback: (data: EnergyData[]) => void) => {
  if (!db) return () => {};

  const historyRef = query(ref(db, 'energy_data/history'), limitToLast(20));
  onValue(historyRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const historyArray = Object.values(data) as any[];
      callback(historyArray.map(item => ({
        voltage: item.voltage || 0,
        current: item.current || 0,
        power: item.power || 0,
        energy: item.energy || 0,
        deviceStatus: item.deviceStatus || false,
        timestamp: item.timestamp || new Date().toISOString(),
      })));
    }
  });

  return () => off(historyRef);
};

export const updateFirebaseDeviceStatus = async (status: boolean) => {
  if (!db) return false;

  try {
    const statusRef = ref(db, 'device_control/status');
    await set(statusRef, status);
    
    // Also update the latest data snapshot for immediate UI feedback
    const latestStatusRef = ref(db, 'energy_data/latest/deviceStatus');
    await set(latestStatusRef, status);
    
    return true;
  } catch (error) {
    console.error("Error updating Firebase device status:", error);
    return false;
  }
};
