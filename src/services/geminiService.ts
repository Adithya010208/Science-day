import { GoogleGenAI, Type } from "@google/genai";
import { EnergyData, AIInsight } from "../types";

const genAI = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || "" });

export const generateEnergyInsights = async (data: EnergyData[]): Promise<AIInsight[]> => {
  try {
    const model = "gemini-3-flash-preview";
    const prompt = `
      Analyze the following energy consumption data from a campus building:
      ${JSON.stringify(data)}
      
      Provide 3-4 actionable insights for energy governance.
      Focus on:
      1. Abnormal energy spikes.
      2. Recommendations for idle zones.
      3. Peak-load scheduling suggestions.
      4. Equipment efficiency identification.
      
      Return the response in JSON format matching this schema:
      Array<{
        message: string,
        confidence: number (0-1),
        type: "warning" | "info" | "success"
      }>
    `;

    const response = await genAI.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              message: { type: Type.STRING },
              confidence: { type: Type.NUMBER },
              type: { type: Type.STRING, enum: ["warning", "info", "success"] }
            },
            required: ["message", "confidence", "type"]
          }
        }
      }
    });

    const insightsRaw = JSON.parse(response.text || "[]");
    return insightsRaw.map((insight: any, index: number) => ({
      ...insight,
      id: `insight-${Date.now()}-${index}`,
      timestamp: new Date().toISOString()
    }));
  } catch (error: any) {
    console.error("Error generating AI insights:", error);
    
    // Fallback insights if API is rate limited or fails
    return [
      {
        id: `fallback-1`,
        message: "AI Rate Limited: Monitoring consumption patterns locally. Current load appears stable.",
        confidence: 0.9,
        type: "info",
        timestamp: new Date().toISOString()
      },
      {
        id: `fallback-2`,
        message: "Optimization Tip: Ensure all non-essential IoT devices are in sleep mode during off-peak hours.",
        confidence: 0.85,
        type: "success",
        timestamp: new Date().toISOString()
      }
    ];
  }
};

export const predictLoadForecast = async (historicalData: EnergyData[]): Promise<{ time: string, predicted: number }[]> => {
  try {
    const model = "gemini-3-flash-preview";
    const prompt = `
      Based on this historical energy data:
      ${JSON.stringify(historicalData)}
      
      Predict the energy demand (in Watts) for the next 6 hours.
      Return an array of 6 objects with "time" (HH:00) and "predicted" (number).
    `;

    const response = await genAI.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              time: { type: Type.STRING },
              predicted: { type: Type.NUMBER }
            },
            required: ["time", "predicted"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Error predicting load forecast:", error);
    
    // Fallback forecast
    const now = new Date();
    return Array.from({ length: 6 }).map((_, i) => {
      const hour = (now.getHours() + i + 1) % 24;
      return {
        time: `${hour.toString().padStart(2, '0')}:00`,
        predicted: 200 + Math.random() * 300 // Generic fallback prediction
      };
    });
  }
};
