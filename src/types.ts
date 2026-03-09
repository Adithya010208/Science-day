export interface EnergyData {
  voltage: number;
  current: number;
  power: number;
  energy: number;
  deviceStatus: boolean;
  timestamp: string;
}

export interface SectorData {
  id: string;
  name: string;
  load: number;
  consumption: number;
  voltage: number;
  current: number;
  status: 'Active' | 'Idle';
  isHardware?: boolean;
}

export interface AIInsight {
  id: string;
  message: string;
  confidence: number;
  timestamp: string;
  type: 'warning' | 'info' | 'success';
}

export interface SystemAlert {
  id: string;
  title: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
}

export interface HealthStatus {
  component: string;
  status: 'OK' | 'Warning' | 'Check Required';
  score: number;
}
