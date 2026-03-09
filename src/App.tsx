import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Zap, 
  AlertTriangle, 
  Cpu, 
  Thermometer, 
  Wind, 
  Lightbulb, 
  Users, 
  TrendingUp, 
  ShieldAlert, 
  Bell, 
  Clock,
  Power,
  RefreshCw,
  Leaf,
  IndianRupee,
  BarChart3,
  PieChart as PieChartIcon,
  LayoutDashboard,
  Settings,
  Menu,
  X,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  BarChart,
  Bar,
  PieChart,
  Cell,
  Pie
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

import { EnergyData, SectorData, AIInsight, SystemAlert, HealthStatus } from './types';
import { subscribeToEnergyData, subscribeToHistory, updateFirebaseDeviceStatus, saveEnergyDataToHistory } from './services/firebaseService';
import { generateEnergyInsights, predictLoadForecast } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

const MetricCard = ({ title, value, unit, icon: Icon, trend }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="glass-card p-5 rounded-2xl relative overflow-hidden group hover:brand-glow transition-all duration-300"
  >
    <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
      <Icon className="w-12 h-12 text-brand-primary" />
    </div>
    <div className="flex justify-between items-start mb-4">
      <div className="p-2.5 rounded-xl bg-brand-primary/10 border border-brand-primary/20">
        <Icon className="w-5 h-5 text-brand-primary" />
      </div>
      {trend !== undefined && (
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold",
          trend > 0 ? "bg-brand-danger/10 text-brand-danger" : "bg-brand-success/10 text-brand-success"
        )}>
          {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
          {Math.abs(trend).toFixed(3)}%
        </div>
      )}
    </div>
    <h3 className="text-app-muted text-[10px] uppercase font-bold tracking-widest mb-1">{title}</h3>
    <div className="flex items-baseline gap-1.5">
      <span className="text-3xl font-black text-white tracking-tight">
        {typeof value === 'number' ? value.toFixed(3) : value}
      </span>
      <span className="text-xs font-medium text-app-muted">{unit}</span>
    </div>
  </motion.div>
);

interface SectorCardProps {
  sector: SectorData;
  onToggle?: (e: React.MouseEvent) => void | Promise<void>;
  onClick?: () => void;
}

const SectorCard: React.FC<SectorCardProps> = ({ sector, onToggle, onClick }) => (
  <div 
    onClick={onClick}
    className="glass-card p-5 rounded-2xl border border-app-border hover:border-brand-primary/40 transition-all group cursor-pointer relative overflow-hidden"
  >
    {/* Hover Overlay Hint */}
    <div className="absolute inset-0 bg-brand-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
      <span className="text-[10px] font-black text-brand-primary tracking-[0.2em] uppercase bg-app-bg/80 px-3 py-1 rounded-full border border-brand-primary/20">
        Click for Details
      </span>
    </div>

    <div className="flex justify-between items-center mb-5">
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-2 h-2 rounded-full",
          sector.status === 'Active' ? "bg-brand-success shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-app-muted"
        )} />
        <h4 className="font-bold text-sm text-slate-200">{sector.name}</h4>
      </div>
      <span className={cn(
        "text-[10px] font-black px-2 py-0.5 rounded border",
        sector.status === 'Active' 
          ? "bg-brand-success/5 text-brand-success border-brand-success/20" 
          : "bg-slate-800/50 text-app-muted border-app-border"
      )}>
        {sector.status.toUpperCase()}
      </span>
    </div>
    
    <div className="grid grid-cols-2 gap-6 mb-6">
      <div className="space-y-1">
        <p className="text-[10px] text-app-muted font-bold uppercase tracking-wider">Load</p>
        <p className="text-xl font-mono font-bold text-white">{sector.load.toFixed(3)}<span className="text-xs font-normal text-app-muted ml-0.5">W</span></p>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] text-app-muted font-bold uppercase tracking-wider">Usage</p>
        <p className="text-xl font-mono font-bold text-white">{sector.consumption.toFixed(3)}<span className="text-xs font-normal text-app-muted ml-0.5">kWh</span></p>
      </div>
    </div>

    {sector.isHardware && (
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.(e);
        }}
        className={cn(
          "w-full py-3 rounded-xl text-xs font-black tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] relative z-20",
          sector.status === 'Active' 
            ? "bg-brand-danger/10 text-brand-danger border border-brand-danger/20 hover:bg-brand-danger/20" 
            : "bg-brand-primary/10 text-brand-primary border border-brand-primary/20 hover:bg-brand-primary/20"
        )}
      >
        <Power className="w-3.5 h-3.5" />
        {sector.status === 'Active' ? 'SHUTDOWN SECTOR' : 'ACTIVATE SECTOR'}
      </button>
    )}
  </div>
);

const SectorDetailModal = ({ sector, onClose }: { sector: SectorData, onClose: () => void }) => (
  <motion.div 
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-[100] bg-app-bg/80 backdrop-blur-md flex items-center justify-center p-6"
    onClick={onClose}
  >
    <motion.div 
      initial={{ scale: 0.9, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      className="glass-card p-8 rounded-[2.5rem] border border-brand-primary/30 max-w-2xl w-full shadow-2xl shadow-brand-primary/10"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex justify-between items-start mb-8">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-brand-primary/10 border border-brand-primary/20">
            <LayoutDashboard className="w-8 h-8 text-brand-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">{sector.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className={cn("w-2 h-2 rounded-full", sector.status === 'Active' ? "bg-brand-success animate-pulse" : "bg-app-muted")} />
              <span className="text-[10px] font-black text-app-muted uppercase tracking-widest">{sector.status} Mode</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
          <X className="w-6 h-6 text-app-muted" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="p-6 rounded-2xl bg-slate-800/30 border border-app-border">
          <p className="text-[10px] text-app-muted font-black uppercase tracking-widest mb-2">Voltage</p>
          <p className="text-3xl font-mono font-black text-white">{sector.voltage.toFixed(3)}<span className="text-sm font-normal text-app-muted ml-1">V</span></p>
        </div>
        <div className="p-6 rounded-2xl bg-slate-800/30 border border-app-border">
          <p className="text-[10px] text-app-muted font-black uppercase tracking-widest mb-2">Current</p>
          <p className="text-3xl font-mono font-black text-white">{sector.current.toFixed(3)}<span className="text-sm font-normal text-app-muted ml-1">A</span></p>
        </div>
        <div className="p-6 rounded-2xl bg-slate-800/30 border border-app-border">
          <p className="text-[10px] text-app-muted font-black uppercase tracking-widest mb-2">Power Load</p>
          <p className="text-3xl font-mono font-black text-white">{sector.load.toFixed(3)}<span className="text-sm font-normal text-app-muted ml-1">W</span></p>
        </div>
        <div className="p-6 rounded-2xl bg-slate-800/30 border border-app-border">
          <p className="text-[10px] text-app-muted font-black uppercase tracking-widest mb-2">Total Consumption</p>
          <p className="text-3xl font-mono font-black text-white">{sector.consumption.toFixed(3)}<span className="text-sm font-normal text-app-muted ml-1">kWh</span></p>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-brand-primary/5 border border-brand-primary/10">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-4 h-4 text-brand-primary" />
          <h4 className="text-xs font-black text-white uppercase tracking-widest">Efficiency Analysis</h4>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed">
          This sector is currently operating at <span className="text-brand-success font-bold">optimal efficiency</span>. 
          The voltage stability is within the ±5% tolerance range, ensuring longevity of connected hardware.
        </p>
      </div>
    </motion.div>
  </motion.div>
);

// --- Main App ---

export default function App() {
  const [realTimeData, setRealTimeData] = useState<EnergyData | null>(null);
  const [history, setHistory] = useState<EnergyData[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [forecast, setForecast] = useState<{ time: string, predicted: number }[]>([]);
  const [isEmergency, setIsEmergency] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [lastAiUpdate, setLastAiUpdate] = useState<Date | null>(null);
  const [selectedSector, setSelectedSector] = useState<SectorData | null>(null);

  // Simulated Sectors
  const [sectors, setSectors] = useState<SectorData[]>([
    { id: '1', name: 'Live Demo', load: 0, consumption: 12.4, voltage: 230, current: 0, status: 'Active', isHardware: true },
    { id: '2', name: 'Conference Hall', load: 450, consumption: 45.2, voltage: 228, current: 1.9, status: 'Active' },
    { id: '3', name: 'Server Room', load: 1200, consumption: 180.5, voltage: 231, current: 5.2, status: 'Active' },
    { id: '4', name: 'Research Wing', load: 150, consumption: 22.1, voltage: 229, current: 0.6, status: 'Idle' },
    { id: '5', name: 'Staff Lounge', load: 80, consumption: 8.4, voltage: 230, current: 0.3, status: 'Idle' },
  ]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [lastRawResponse, setLastRawResponse] = useState<any>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    // Check if Firebase is configured (either via env or fallbacks in service)
    const isFirebaseConfigured = !!(
      (import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCoqZMZhe_02gZAPZyY8tJ9xr6ApOfFN7g") && 
      (import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://energy-magement-system-default-rtdb.firebaseio.com") && 
      (import.meta.env.VITE_FIREBASE_PROJECT_ID || "energy-magement-system")
    );

    if (!isFirebaseConfigured) {
      setIsOffline(true);
      setFetchError("Firebase credentials missing. Running in Simulation Mode.");
      
      // Simulation Mode
      const simInterval = setInterval(() => {
        const mockData: EnergyData = {
          voltage: 220 + Math.random() * 10,
          current: 0.5 + Math.random() * 2,
          power: 100 + Math.random() * 500,
          energy: 15.4 + Math.random(),
          deviceStatus: true,
          timestamp: new Date().toISOString()
        };
        setRealTimeData(mockData);
        setLastUpdate(new Date());
        setLastRawResponse({ mode: "SIMULATION", ...mockData });
        
        setSectors(prev => prev.map(s => {
          if (s.isHardware) {
            return {
              ...s,
              load: mockData.power,
              voltage: mockData.voltage,
              current: mockData.current,
              status: 'Active'
            };
          } else {
            const newVoltage = 220 + Math.random() * 10;
            const loadFluctuation = (Math.random() - 0.5) * 0.05;
            const newLoad = s.status === 'Active' ? Math.max(s.load * (1 + loadFluctuation), 10) : 0;
            const newCurrent = newLoad / newVoltage;
            const newConsumption = s.consumption + (newLoad * 3 / 3600000);
            return {
              ...s,
              voltage: newVoltage,
              load: newLoad,
              current: newCurrent,
              consumption: newConsumption
            };
          }
        }));

        setHistory(prev => {
          const newHist = [...prev, mockData].slice(-20);
          return newHist;
        });
      }, 3000);

      return () => clearInterval(simInterval);
    }

    // Subscribe to Firebase Real-time Data
    const unsubscribeData = subscribeToEnergyData((data) => {
      if (data) {
        setRealTimeData(data);
        setLastUpdate(new Date(data.timestamp));
        setIsOffline(false);
        setFetchError(null);
        setLastRawResponse(data);
        
        // Save to history for graph visualization
        saveEnergyDataToHistory(data);
        
        // Also update local history for immediate graph display
        setHistory(prev => [...prev, data].slice(-20));
        
        setSectors(prev => prev.map(s => {
          if (s.isHardware) {
            return {
              ...s,
              load: data.power,
              voltage: data.voltage,
              current: data.current,
              status: data.deviceStatus ? 'Active' : 'Idle'
            };
          } else {
            const newVoltage = 220 + Math.random() * 10;
            const loadFluctuation = (Math.random() - 0.5) * 0.05;
            const newLoad = s.status === 'Active' ? Math.max(s.load * (1 + loadFluctuation), 10) : 0;
            const newCurrent = newLoad / newVoltage;
            const newConsumption = s.consumption + (newLoad * 3 / 3600000);
            return {
              ...s,
              voltage: newVoltage,
              load: newLoad,
              current: newCurrent,
              consumption: newConsumption
            };
          }
        }));
      } else {
        setIsOffline(true);
        setFetchError("No data received from Firebase.");
      }
    });

    // Subscribe to Firebase History
    const unsubscribeHistory = subscribeToHistory((hist) => {
      setHistory(hist);
    });

    return () => {
      unsubscribeData();
      unsubscribeHistory();
    };
  }, []);

  const runAI = async () => {
    if (isAiLoading) return;
    
    // Throttle: Only allow AI calls every 5 minutes automatically
    const now = new Date();
    if (lastAiUpdate && (now.getTime() - lastAiUpdate.getTime()) < 5 * 60 * 1000) {
      return;
    }

    setIsAiLoading(true);
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AI request timeout')), 30000)
    );
    
    try {
      const newInsights = await Promise.race([
        generateEnergyInsights(history.slice(-10)),
        timeout
      ]) as any[];
      setInsights(newInsights);
      
      const newForecast = await Promise.race([
        predictLoadForecast(history.slice(-10)),
        timeout
      ]) as any[];
      setForecast(newForecast);
      setLastAiUpdate(new Date());
    } catch (error: any) {
      console.error("AI error:", error);
      // Keep loading false even if error occurred
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleManualAiRefresh = async () => {
    setIsAiLoading(true);
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AI request timeout')), 30000)
    );
    
    try {
      const newInsights = await Promise.race([
        generateEnergyInsights(history.slice(-10)),
        timeout
      ]) as any[];
      setInsights(newInsights);
      
      const newForecast = await Promise.race([
        predictLoadForecast(history.slice(-10)),
        timeout
      ]) as any[];
      setForecast(newForecast);
      setLastAiUpdate(new Date());
    } catch (error: any) {
      console.error("AI refresh error:", error);
      // Keep loading false even if error occurred
    } finally {
      setIsAiLoading(false);
    }
  };

  useEffect(() => {
    if (history.length > 5) {
      runAI();
    }
  }, [history.length > 0 && Math.floor(history.length / 50)]); // Trigger less frequently (every 50 items)

  const handleToggleHardware = async () => {
    if (!realTimeData) return;
    await updateFirebaseDeviceStatus(!realTimeData.deviceStatus);
  };

  const handleGlobalAction = async (activate: boolean) => {
    await updateFirebaseDeviceStatus(activate);
  };

  const utilization = realTimeData ? Math.min(Math.round((realTimeData.power / 2000) * 100), 100) : 0;
  const utilizationColor = utilization > 80 ? 'text-brand-danger' : utilization > 50 ? 'text-brand-warning' : 'text-brand-success';

  const carbonSaved = realTimeData ? (realTimeData.energy * 0.82).toFixed(3) : "0.000";
  const costSavings = realTimeData ? (realTimeData.energy * 0.15).toFixed(3) : "0.000";

  return (
    <div className="min-h-screen bg-app-bg text-slate-200 font-sans selection:bg-brand-primary/30 relative overflow-hidden">
      {/* Background Grid Effect */}
      <div className="fixed inset-0 data-grid-line opacity-[0.03] pointer-events-none" />
      <div className="fixed inset-0 bg-gradient-to-b from-brand-primary/5 via-transparent to-transparent pointer-events-none" />

      {/* Navbar */}
      <nav className="border-b border-app-border bg-app-bg/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-secondary flex items-center justify-center shadow-lg shadow-brand-primary/20">
              <Zap className="text-white w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                ECOPULSE <span className="text-brand-primary">AI</span>
              </h1>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-success animate-pulse" />
                <p className="text-[10px] text-app-muted font-bold tracking-[0.2em] uppercase">Smart Governance System</p>
              </div>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-10">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 text-white font-mono text-sm font-bold">
                <Clock className="w-4 h-4 text-brand-primary" />
                {format(currentTime, 'HH:mm:ss')}
              </div>
              <p className="text-[10px] text-app-muted font-bold uppercase tracking-widest">{format(currentTime, 'EEEE, MMM dd')}</p>
            </div>
            
            <div className="h-10 w-px bg-app-border" />

            <button 
              onClick={() => setIsEmergency(!isEmergency)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2.5 border tracking-widest",
                isEmergency 
                  ? "bg-brand-danger text-white border-brand-danger shadow-lg shadow-brand-danger/20 animate-pulse" 
                  : "bg-brand-danger/5 text-brand-danger border-brand-danger/20 hover:bg-brand-danger/10"
              )}
            >
              <ShieldAlert className="w-4 h-4" />
              EMERGENCY
            </button>
            
            <div className="relative group cursor-pointer">
              <Bell className="w-6 h-6 text-app-muted group-hover:text-white transition-colors" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-danger rounded-full border-2 border-app-bg"></span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto p-8 space-y-8 relative z-10">
        {/* Top Row: Command & Status */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Global Command Center */}
          <div className="lg:col-span-4 glass-card p-8 rounded-3xl flex flex-col justify-between border-t-4 border-t-brand-primary">
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-xs font-black text-app-muted uppercase tracking-[0.2em] flex items-center gap-2.5">
                  <Cpu className="w-4 h-4 text-brand-primary" />
                  Command Center
                </h2>
                <span className="px-2 py-1 rounded bg-brand-primary/10 text-brand-primary text-[10px] font-black">v2.4.0</span>
              </div>
              <div className="grid grid-cols-2 gap-5 mb-6">
                <button 
                  onClick={() => handleGlobalAction(true)}
                  className="bg-brand-primary/5 border border-brand-primary/20 text-brand-primary py-5 rounded-2xl font-black text-[10px] tracking-widest hover:bg-brand-primary/10 transition-all flex flex-col items-center gap-3 group"
                >
                  <div className="p-2 rounded-lg bg-brand-primary/10 group-hover:scale-110 transition-transform">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  ACTIVATE ALL
                </button>
                <button 
                  onClick={() => handleGlobalAction(false)}
                  className="bg-brand-danger/5 border border-brand-danger/20 text-brand-danger py-5 rounded-2xl font-black text-[10px] tracking-widest hover:bg-brand-danger/10 transition-all flex flex-col items-center gap-3 group"
                >
                  <div className="p-2 rounded-lg bg-brand-danger/10 group-hover:scale-110 transition-transform">
                    <Power className="w-6 h-6" />
                  </div>
                  SHUTDOWN ALL
                </button>
              </div>

              <div className="mt-10 pt-8 border-t border-app-border">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] text-app-muted font-black uppercase tracking-widest">Grid Stability</span>
                  <span className="text-xs text-brand-success font-black">94.8%</span>
                </div>
                <div className="w-full bg-slate-800/50 h-2 rounded-full overflow-hidden p-0.5 border border-app-border">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '94.8%' }}
                    className="bg-gradient-to-r from-brand-primary to-brand-secondary h-full rounded-full shadow-[0_0_10px_rgba(99,102,241,0.4)]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Peak Load Risk Monitor */}
          <div className="lg:col-span-3 glass-card p-8 rounded-3xl flex flex-col items-center justify-center text-center">
            <h2 className="text-xs font-black text-app-muted uppercase tracking-[0.2em] mb-8">Peak Load Risk</h2>
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-800/50" />
                <motion.circle 
                  cx="80" cy="80" r="72" stroke="currentColor" strokeWidth="12" fill="transparent" 
                  strokeDasharray={452.4}
                  initial={{ strokeDashoffset: 452.4 }}
                  animate={{ strokeDashoffset: 452.4 - (452.4 * utilization) / 100 }}
                  strokeLinecap="round"
                  className={cn("transition-colors duration-500", utilizationColor.replace('text-', 'stroke-'))}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={cn("text-4xl font-black tracking-tighter", utilizationColor)}>{utilization}%</span>
                <span className="text-[10px] text-app-muted font-black uppercase tracking-widest mt-1">Load</span>
              </div>
            </div>
            <div className={cn(
              "mt-8 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border",
              utilization > 80 ? "bg-brand-danger/10 text-brand-danger border-brand-danger/20" : 
              utilization > 50 ? "bg-brand-warning/10 text-brand-warning border-brand-warning/20" : 
              "bg-brand-success/10 text-brand-success border-brand-success/20"
            )}>
              {utilization > 80 ? 'CRITICAL RISK' : utilization > 50 ? 'MODERATE LOAD' : 'SAFE OPERATION'}
            </div>
          </div>

          {/* Live Metrics */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-5">
            <MetricCard title="Voltage" value={realTimeData?.voltage || 0} unit="V" icon={Zap} trend={-0.2} />
            <MetricCard title="Current" value={realTimeData?.current || 0} unit="A" icon={Activity} trend={1.4} />
            <MetricCard title="Power" value={realTimeData?.power || 0} unit="W" icon={TrendingUp} trend={5.2} />
            <MetricCard title="Energy" value={realTimeData?.energy || 0} unit="kWh" icon={Cpu} trend={0.8} />
          </div>
        </div>

        {/* Middle Row: Charts & AI */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Live Power Graph */}
          <div className="xl:col-span-8 glass-card p-8 rounded-3xl">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-brand-primary/10 border border-brand-primary/20">
                  <BarChart3 className="w-6 h-6 text-brand-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Real-time Consumption</h2>
                  <p className="text-xs text-app-muted font-medium">Live telemetry from IoT sensors</p>
                </div>
              </div>
              {isOffline && (
                <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-brand-danger/10 border border-brand-danger/20 text-brand-danger animate-pulse">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Hardware Offline</span>
                </div>
              )}
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={history.map(h => ({ time: format(new Date(h.timestamp), 'HH:mm:ss'), power: h.power }))}>
                  <defs>
                    <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    itemStyle={{ color: '#6366f1' }}
                  />
                  <Area type="monotone" dataKey="power" stroke="#6366f1" fillOpacity={1} fill="url(#colorPower)" strokeWidth={3} animationDuration={1000} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Governance Insights */}
          <div className="xl:col-span-4 glass-card p-8 rounded-3xl flex flex-col border-r-4 border-r-brand-secondary">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-brand-secondary/10 border border-brand-secondary/20">
                  <Cpu className={cn("w-6 h-6 text-brand-secondary", isAiLoading && "animate-pulse")} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">AI Insights</h2>
                  <p className="text-xs text-app-muted font-medium">Gemini Analytics Engine</p>
                </div>
              </div>
              <button 
                onClick={handleManualAiRefresh}
                disabled={isAiLoading}
                className={cn(
                  "p-3 rounded-2xl border transition-all hover:scale-105 active:scale-95",
                  isAiLoading ? "bg-slate-800 border-slate-700 opacity-50 cursor-not-allowed" : "bg-brand-secondary/10 border-brand-secondary/20 text-brand-secondary hover:bg-brand-secondary/20"
                )}
                title="Refresh AI Analysis"
              >
                <RefreshCw className={cn("w-5 h-5", isAiLoading && "animate-spin")} />
              </button>
            </div>
            
            <div className="space-y-5 flex-1 overflow-y-auto max-h-[350px] pr-3 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {insights.length > 0 ? insights.map((insight) => (
                  <motion.div 
                    key={insight.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={cn(
                      "p-5 rounded-2xl border transition-all hover:scale-[1.02]",
                      insight.type === 'warning' ? "bg-brand-danger/5 border-brand-danger/20" : 
                      insight.type === 'success' ? "bg-brand-success/5 border-brand-success/20" : 
                      "bg-brand-primary/5 border-brand-primary/20"
                    )}
                  >
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-black uppercase text-app-muted tracking-widest">{format(new Date(insight.timestamp), 'HH:mm')}</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-success" />
                        <span className="text-[10px] font-black text-brand-success uppercase tracking-widest">{(insight.confidence * 100).toFixed(3)}% Match</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">{insight.message}</p>
                  </motion.div>
                )) : isAiLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-app-muted py-12">
                    <RefreshCw className="w-10 h-10 mb-4 animate-spin text-brand-primary/40" />
                    <p className="text-[10px] uppercase font-black tracking-[0.3em]">Processing Data...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-app-muted py-12">
                    <Lightbulb className="w-10 h-10 mb-4 text-brand-primary/40" />
                    <p className="text-[10px] uppercase font-black tracking-[0.3em] mb-2">No Insights Yet</p>
                    <p className="text-[9px] text-app-muted/60">Click refresh to analyze current data</p>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Bottom Row: Sectors, Sustainability, Health */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sector Monitoring */}
          <div className="lg:col-span-8 space-y-8">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight mb-1">Sector Monitoring</h2>
                <p className="text-xs text-app-muted font-medium">Real-time status of campus zones</p>
              </div>
              <div className="flex gap-4 mb-1">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-brand-success/10 border border-brand-success/20">
                  <div className="w-2 h-2 bg-brand-success rounded-full animate-pulse"></div>
                  <span className="text-[10px] font-black text-brand-success uppercase tracking-widest">3 Active</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-app-border">
                  <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
                  <span className="text-[10px] font-black text-app-muted uppercase tracking-widest">2 Idle</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {sectors.map(sector => (
                <SectorCard 
                  key={sector.id} 
                  sector={sector} 
                  onToggle={sector.isHardware ? handleToggleHardware : undefined} 
                  onClick={() => setSelectedSector(sector)}
                />
              ))}
            </div>

            {/* AI Predictive Forecast */}
            <div className="glass-card p-8 rounded-3xl">
              <div className="flex items-center gap-4 mb-10">
                <div className="p-3 rounded-2xl bg-brand-secondary/10 border border-brand-secondary/20">
                  <TrendingUp className="w-6 h-6 text-brand-secondary" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white tracking-tight">Predictive Forecast</h2>
                  <p className="text-xs text-app-muted font-medium">AI-generated demand projection</p>
                </div>
              </div>
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={forecast.length > 0 ? forecast : [
                    { time: '10:00', predicted: 800 },
                    { time: '11:00', predicted: 1200 },
                    { time: '12:00', predicted: 1500 },
                    { time: '13:00', predicted: 1100 },
                    { time: '14:00', predicted: 900 },
                    { time: '15:00', predicted: 1300 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', fontSize: '12px' }}
                    />
                    <Line type="monotone" dataKey="predicted" stroke="#22d3ee" strokeWidth={4} dot={{ r: 5, fill: '#22d3ee', strokeWidth: 2, stroke: '#0f172a' }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Sustainability & Health */}
          <div className="lg:col-span-4 space-y-8">
            {/* Sustainability Dashboard */}
            <div className="glass-card p-8 rounded-3xl border-b-4 border-b-brand-success">
              <h2 className="text-xs font-black text-app-muted uppercase tracking-[0.2em] mb-10">Sustainability</h2>
              <div className="space-y-8">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-brand-success/10 border border-brand-success/20 flex items-center justify-center">
                    <Leaf className="text-brand-success w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-[10px] text-app-muted uppercase font-black tracking-widest mb-1">Carbon Offset</p>
                    <p className="text-3xl font-black text-white tracking-tight">{carbonSaved} <span className="text-sm font-normal text-app-muted ml-1">kg CO₂</span></p>
                  </div>
                </div>
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
                    <IndianRupee className="text-brand-primary w-7 h-7" />
                  </div>
                  <div>
                    <p className="text-[10px] text-app-muted uppercase font-black tracking-widest mb-1">Cost Savings</p>
                    <p className="text-3xl font-black text-white tracking-tight">₹{costSavings}</p>
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-slate-800/30 border border-app-border text-center">
                  <p className="text-xs text-slate-400 font-medium">Equivalent to planting <span className="text-brand-success font-black">{(parseFloat(carbonSaved) / 20).toFixed(3)}</span> mature trees</p>
                </div>
              </div>
            </div>

            {/* System Health Monitor */}
            <div className="glass-card p-8 rounded-3xl">
              <h2 className="text-xs font-black text-app-muted uppercase tracking-[0.2em] mb-10">System Health</h2>
              <div className="space-y-4">
                {[
                  { component: 'Transformer Bank', status: 'OK', score: 98, icon: Cpu },
                  { component: 'HVAC Network', status: 'Warning', score: 72, icon: Wind },
                  { component: 'Smart Grid Node', status: 'OK', score: 95, icon: Activity },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/20 border border-app-border group hover:border-brand-primary/30 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "p-2 rounded-lg bg-slate-800 border border-app-border group-hover:text-brand-primary transition-colors",
                        item.status === 'Warning' ? "text-brand-warning" : "text-brand-success"
                      )}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{item.component}</p>
                        <p className={cn("text-[10px] font-black uppercase tracking-widest", item.status === 'OK' ? "text-brand-success" : "text-brand-warning")}>
                          {item.status}
                        </p>
                      </div>
                    </div>
                    <span className="text-lg font-mono font-black text-white">{item.score}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer / Status Bar */}
      <footer className="border-t border-app-border bg-app-bg/80 backdrop-blur-xl p-6 relative z-10">
        <div className="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black text-app-muted uppercase tracking-[0.2em]">
          <div className="flex gap-10">
            <span className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-success" />
              System Status: <span className="text-white">Operational</span>
            </span>
            <span className="flex items-center gap-2">
              <RefreshCw className="w-3 h-3" />
              Last Sync: <span className="text-white font-mono">{format(lastUpdate, 'HH:mm:ss')}</span>
            </span>
          </div>
          <div className="flex gap-8">
            <span className="hover:text-brand-primary cursor-pointer transition-colors">System Logs</span>
            <span className="hover:text-brand-primary cursor-pointer transition-colors">API Status</span>
            <span className="hover:text-brand-primary cursor-pointer transition-colors">Governance Policy</span>
          </div>
        </div>
      </footer>

        {/* Emergency Overlay */}
        <AnimatePresence>
          {isEmergency && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-app-bg/80 backdrop-blur-md flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="glass-card p-10 rounded-[2.5rem] border-2 border-brand-danger max-w-lg w-full text-center shadow-2xl shadow-brand-danger/20"
              >
                <div className="w-24 h-24 rounded-full bg-brand-danger/10 flex items-center justify-center mx-auto mb-8 animate-pulse border border-brand-danger/20">
                  <AlertTriangle className="w-12 h-12 text-brand-danger" />
                </div>
                <h2 className="text-4xl font-black text-white mb-4 tracking-tight">EMERGENCY PROTOCOL</h2>
                <p className="text-slate-400 mb-10 leading-relaxed font-medium">System is in high-alert mode. All non-essential sectors will be throttled to prevent grid failure and stabilize the campus network.</p>
                <div className="grid grid-cols-1 gap-4">
                  <button 
                    onClick={() => handleGlobalAction(false)}
                    className="w-full py-5 bg-brand-danger text-white font-black rounded-2xl hover:bg-brand-danger/90 transition-all shadow-lg shadow-brand-danger/20 active:scale-[0.98] tracking-widest"
                  >
                    INITIATE TOTAL SHUTDOWN
                  </button>
                  <button 
                    onClick={() => setIsEmergency(false)}
                    className="w-full py-5 bg-slate-800 text-white font-black rounded-2xl hover:bg-slate-700 transition-all active:scale-[0.98] tracking-widest"
                  >
                    CANCEL PROTOCOL
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sector Detail Modal */}
        <AnimatePresence>
          {selectedSector && (
            <SectorDetailModal 
              sector={selectedSector} 
              onClose={() => setSelectedSector(null)} 
            />
          )}
        </AnimatePresence>
      </div>
    );
  }
