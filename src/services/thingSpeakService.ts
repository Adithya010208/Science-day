import { EnergyData } from "../types";

// ThingSpeak Configuration
const CHANNEL_ID = "3292262";
const READ_API_KEY = "FAPBCJRQUD2FHNBU";
const WRITE_API_KEY = "J4LIH6IYPI58XXPG";

const TS_READ_URL = `https://api.thingspeak.com/channels/${CHANNEL_ID}/feeds.json?api_key=${READ_API_KEY}`;
const TS_WRITE_URL = `https://api.thingspeak.com/update?api_key=${WRITE_API_KEY}`;

// Poll intervals
let energyPollingInterval: any;
let historyPollingInterval: any;

export const subscribeToEnergyData = (callback: (data: EnergyData) => void) => {
  const fetchData = async () => {
    try {
      // Get the latest 1 entry
      const response = await fetch(`${TS_READ_URL}&results=1`);
      const data = await response.json();
      
      if (data && data.feeds && data.feeds.length > 0) {
        const latest = data.feeds[0];
        
        // Map ThingSpeak fields to EnergyData structure
        // Field 1: Voltage, Field 2: Current, Field 3: Power, Field 4: Energy, Field 5: Relay Status
        callback({
          voltage: parseFloat(latest.field1) || 0,
          current: parseFloat(latest.field2) || 0,
          power: parseFloat(latest.field3) || 0,
          energy: parseFloat(latest.field4) || 0,
          deviceStatus: latest.field5 !== "0", // Default to ON (true) unless explicitly set to "0"
          timestamp: latest.created_at || new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error fetching ThingSpeak data:", error);
    }
  };

  // Fetch immediately
  fetchData();
  
  // Then poll every 15 seconds (ThingSpeak recommended rate limit)
  energyPollingInterval = setInterval(fetchData, 15000);

  // Return a cleanup function
  return () => clearInterval(energyPollingInterval);
};

export const subscribeToHistory = (callback: (data: EnergyData[]) => void) => {
  const fetchHistory = async () => {
    try {
      // Get the last 20 entries
      const response = await fetch(`${TS_READ_URL}&results=20`);
      const data = await response.json();
      
      if (data && data.feeds) {
        const historyArray = data.feeds
            // Filter out any feeds that don't have power data (e.g. if we only updated field 5)
            .filter((item: any) => item.field3 !== null)
            .map((item: any) => ({
              voltage: parseFloat(item.field1) || 0,
              current: parseFloat(item.field2) || 0,
              power: parseFloat(item.field3) || 0,
              energy: parseFloat(item.field4) || 0,
              deviceStatus: item.field5 !== "0", // Default to ON (true) unless explicitly set to "0"
              timestamp: item.created_at || new Date().toISOString(),
            }));
        
        if (historyArray.length > 0) {
          callback(historyArray);
        }
      }
    } catch (error) {
      console.error("Error fetching ThingSpeak history:", error);
    }
  };

  fetchHistory();
  historyPollingInterval = setInterval(fetchHistory, 15000);

  return () => clearInterval(historyPollingInterval);
};

export const updateFirebaseDeviceStatus = async (status: boolean) => {
  // We will retry for up to 16 seconds because the ESP32 is also pushing data to this same channel
  // and might accidentally trigger ThingSpeak's 15-second rate limit. 
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      // Write 1 for ON, 0 for OFF to Field 5 using Write API
      const response = await fetch(`${TS_WRITE_URL}&field5=${status ? 1 : 0}`);
      const result = await response.text();
      
      // ThingSpeak returns 0 if rate limited, or a valid entry ID if successful
      if (result !== "0") {
        return true;
      } else {
        console.warn(`ThingSpeak rate limit hit. Retrying in 2s... (Attempt ${attempt + 1}/8)`);
      }
    } catch (error) {
      console.error("Error updating ThingSpeak device status:", error);
    }
    // Wait 2 seconds before retrying
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return false;
};

export const saveEnergyDataToHistory = async (data: EnergyData) => {
  // Not needed. ThingSpeak automatically saves history on every ESP32 update.
  return true;
};

export const subscribeToDeviceControl = (callback: (status: boolean) => void) => {
  // Can just hook into the same polling as energy data
  const interval = setInterval(async () => {
    try {
      const response = await fetch(`${TS_READ_URL}&results=1`);
      const data = await response.json();
      if (data && data.feeds && data.feeds.length > 0) {
        callback(data.feeds[0].field5 !== "0"); // Default to ON (true) unless explicitly set to "0"
      }
    } catch (error) {
      console.error("Error fetching control status:", error);
    }
  }, 15000);

  return () => clearInterval(interval);
};
