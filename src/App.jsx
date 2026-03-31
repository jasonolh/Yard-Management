
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Truck as TruckIcon, Clock, AlertTriangle, GripVertical, LogOut, RefreshCw, Settings, ClipboardCheck, Droplet, Wrench, CircleDashed, Waves } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { FleetDatabase } from './components/FleetDatabase';
import { SettingsModal } from './components/SettingsModal';
import { auth, db } from './firebase';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

type BayId =
  | 'gate'
  | 'inspection-1'
  | 'oil-pit-1'
  | 'workshop-1' | 'workshop-2' | 'workshop-3'
  | 'tyre-1'
  | 'trailer-1'
  | 'washbay';

interface Truck {
  id: string;
  registration: string;
  location: BayId;
  entryTime: string;
  defects: string[];
  boardId?: string;
}

const INITIAL_TRUCKS: Truck[] = [
  { id: '1', registration: 'ZT 123 GP', location: 'gate', entryTime: new Date(Date.now() - 1000 * 60 * 30).toISOString(), defects: [], boardId: '5085312780' },
  { id: '2', registration: 'ND 456 789', location: 'workshop-1', entryTime: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), defects: [], boardId: '5085312780' },
  { id: '3', registration: 'CA 987 654', location: 'washbay', entryTime: new Date(Date.now() - 1000 * 60 * 45).toISOString(), defects: [], boardId: '5085312780' },
  { id: '4', registration: 'GP 111 AA', location: 'inspection-1', entryTime: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), defects: [], boardId: '5085312780' },
  { id: '5', registration: 'ZN 222 BB', location: 'tyre-1', entryTime: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), defects: [], boardId: '1565754578' },
];

function LiveClock() {
  const [time, setTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-2 text-slate-300 bg-slate-900/80 px-4 py-2 rounded-lg border border-slate-800 shadow-inner">
      <Clock className="w-4 h-4 text-emerald-500" />
      <span className="font-mono text-sm font-medium tracking-wider">{time.toLocaleTimeString()}</span>
    </div>
  );
}

interface BayProps {
  id: BayId;
  title?: string;
  trucks: Truck[];
  now: number;
  onDropTruck: (truckId: string, bayId: BayId) => void;
  onTruckHover?: (truck: Truck | null, e?: React.MouseEvent) => void;
  className?: string;
  hideHeader?: boolean;
  emptyText?: string;
  layout?: 'col' | 'grid';
}

function Bay({ id, title, trucks, now, onDropTruck, onTruckHover, className = '', hideHeader = false, emptyText, layout = 'col' }: BayProps) {
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOver(false);
    const truckId = e.dataTransfer.getData('truckId');
    if (truckId) {
      onDropTruck(truckId, id);
    }
  };

  const hasTrucks = trucks.length > 0;

  // Determine glow and border based on state
  let glowClass = "border-slate-200";
  if (hasTrucks) {
    glowClass = "border-[#101161]/30 shadow-sm";
  }

  if (isOver) {
    glowClass = "border-[#101161]/50 bg-[#101161]/5";
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`bg-slate-50 rounded-xl p-3 flex flex-col min-h-[80px] transition-all duration-300 border-2 ${glowClass} ${className}`}
    >
      {!hideHeader && title && (
        <h3 className="text-[10px] font-black text-[#101161] mb-3 flex justify-between items-center uppercase tracking-wider">
          {title}
          <span className="text-[10px] font-bold text-white bg-[#101161] px-2 py-0.5 rounded-full">
            {trucks.length}
          </span>
        </h3>
      )}
      <div className={`flex-1 ${layout === 'grid' ? 'flex flex-wrap gap-2' : 'flex flex-col gap-2'}`}>
        {trucks.map(truck => {
          const diffMs = Math.max(0, now - new Date(truck.entryTime).getTime());
          const hours = Math.floor(diffMs / (1000 * 60 * 60));
          const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          const isStale = hours > 48;

          return (
            <div
              key={truck.id}
              draggable
              onMouseEnter={(e) => onTruckHover?.(truck, e)}
              onMouseLeave={() => onTruckHover?.(null)}
              onMouseMove={(e) => onTruckHover?.(truck, e)}
              onDragStart={(e) => {
                e.dataTransfer.setData('truckId', truck.id);
              }}
              className={`group relative bg-white border-2 ${isStale ? 'border-[#ed1c24]/40 bg-[#ed1c24]/5' : 'border-[#101161]/20'} py-1.5 px-2 rounded-lg cursor-grab active:cursor-grabbing hover:border-[#101161]/50 transition-all shadow-sm flex flex-col gap-0.5 ${layout === 'grid' ? 'w-[130px]' : 'w-full'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <GripVertical className="w-5 h-5 text-slate-400 group-hover:text-[#101161] transition-colors cursor-grab shrink-0" />
                  <span className="font-mono text-[#101161] font-bold tracking-wider text-base uppercase leading-tight truncate">{truck.registration}</span>
                </div>
                {isStale && (
                  <AlertTriangle className="w-5 h-5 text-[#ed1c24] animate-pulse shrink-0 ml-1" />
                )}
              </div>
              <div className="flex items-center gap-1.5 text-sm text-slate-500 pl-[26px]">
                <Clock className="w-4 h-4" />
                <span className={isStale ? 'text-[#ed1c24] font-bold' : 'font-medium'}>
                  {hours}h {minutes}m
                </span>
              </div>
              <div className="flex items-center gap-1.5 pl-[26px] text-slate-300">
                <ClipboardCheck className="w-4 h-4" />
                <Droplet className="w-4 h-4" />
                <Wrench className="w-4 h-4" />
                <CircleDashed className="w-4 h-4" />
                <TruckIcon className="w-4 h-4" />
                <Waves className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OneLogixFinalFlow({ companyLogo }: { companyLogo: string | null }) {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredTruck, setHoveredTruck] = useState<{truck: Truck, x: number, y: number} | null>(null);

  const handleTruckHover = (truck: Truck | null, e?: React.MouseEvent) => {
    if (!truck || !e) {
      setHoveredTruck(null);
      return;
    }
    setHoveredTruck({
      truck,
      x: e.clientX,
      y: e.clientY
    });
  };

  const fetchMondayJobs = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [jobsRes, tyrebayRes] = await Promise.all([
        fetch('/api/monday/jobs'),
        fetch('/api/monday/tyrebay')
      ]);
      
      if (!jobsRes.ok) {
        const errorData = await jobsRes.json().catch(() => ({}));
        throw new Error(errorData.error || `Jobs API returned ${jobsRes.status}`);
      }
      if (!tyrebayRes.ok) {
        const errorData = await tyrebayRes.json().catch(() => ({}));
        throw new Error(errorData.error || `Tyre Bay API returned ${tyrebayRes.status}`);
      }
      
      const jobsData = await jobsRes.json();
      const tyrebayData = await tyrebayRes.json();
      
      if (jobsData.errors) {
        throw new Error(`Monday.com Jobs Error: ${jobsData.errors[0].message}`);
      }
      if (tyrebayData.errors) {
        throw new Error(`Monday.com Tyre Bay Error: ${tyrebayData.errors[0].message}`);
      }
      
      let mappedTrucks: Truck[] = [];

      // Process main jobs board
      if (jobsData.data?.boards?.[0]?.items_page?.items) {
        const columns = jobsData.data.boards[0].columns || [];
        const defectColIds = columns.filter((c: any) => c.title.toLowerCase().includes('defect')).map((c: any) => c.id);

        const items = jobsData.data.boards[0].items_page.items;
        const jobsTrucks = items.reduce((acc: Truck[], item: any) => {
          const getCol = (id: string) => item.column_values.find((c: any) => c.id === id)?.text || '';
          const locationStr = getCol('color_mm03xmg3').toLowerCase();
          const groupTitle = item.group?.title?.toLowerCase() || '';

          let bayId: BayId = 'gate';
          
          // Prioritize group title for mapping
          if (groupTitle.includes('awaiting inspection pit')) bayId = 'gate';
          else if (groupTitle.includes('in inspection pit')) bayId = 'inspection-1';
          else if (groupTitle.includes('in workshop')) bayId = 'workshop-1';
          else if (groupTitle.includes('service pit')) bayId = 'oil-pit-1';
          else if (groupTitle.includes('worked on in yard')) {
            // If in yard, check location string to differentiate trailer vs washbay
            if (locationStr.includes('wash')) bayId = 'washbay';
            else bayId = 'trailer-1';
          } else {
            // Fallback to location string if group doesn't match
            if (locationStr.includes('workshop')) bayId = 'workshop-1';
            else if (locationStr.includes('inspection')) bayId = 'inspection-1';
            else if (locationStr.includes('wash')) bayId = 'washbay';
            else if (locationStr.includes('tyre')) return acc; // Skip tyre bay from main board
            else if (locationStr.includes('trailer')) bayId = 'trailer-1';
            else if (locationStr.includes('oil')) bayId = 'oil-pit-1';
          }

          // Only show trucks in the 'gate' bay if they are in the "Awaiting Inspection Pit" group
          if (bayId === 'gate' && !groupTitle.includes('awaiting inspection pit')) {
            return acc;
          }

          const dateStr = getCol('date_mkxm6qjs');
          const timeStr = getCol('hour_mm06tjws');
          let entryTime = new Date().toISOString();
          if (dateStr) {
            const d = new Date(`${dateStr} ${timeStr || '00:00'}`);
            if (!isNaN(d.getTime())) entryTime = d.toISOString();
          }

          const defects: string[] = [];
          defectColIds.forEach((id: string) => {
            const text = getCol(id);
            if (text) {
              const colTitle = columns.find((c: any) => c.id === id)?.title;
              defects.push(`${colTitle}: ${text}`);
            }
          });

          acc.push({
            id: item.id,
            registration: (item.name || '').toUpperCase(),
            location: bayId,
            entryTime,
            defects,
            boardId: '5085312780'
          });
          return acc;
        }, []);
        mappedTrucks = [...mappedTrucks, ...jobsTrucks];
      }

      // Process tyre bay board
      if (tyrebayData.data?.boards?.[0]?.items_page?.items) {
        const columns = tyrebayData.data.boards[0].columns || [];
        const defectColIds = columns.filter((c: any) => c.title.toLowerCase().includes('defect')).map((c: any) => c.id);

        const items = tyrebayData.data.boards[0].items_page.items;
        const tyreTrucks = items.reduce((acc: Truck[], item: any) => {
          const groupTitle = item.group?.title?.toLowerCase() || '';
          
          // Only pull from "In tyre bay" group
          if (!groupTitle.includes('in tyre bay')) {
            return acc;
          }

          const getCol = (id: string) => item.column_values.find((c: any) => c.id === id)?.text || '';
          
          // Get fleet number from "Fleet Number (Horse)" column (id: short_text__1)
          const fleetNumber = getCol('short_text__1') || item.name;

          // Try to get start time if available, otherwise use current time
          const dateStr = getCol('date_1__1');
          let entryTime = new Date().toISOString();
          if (dateStr) {
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) entryTime = d.toISOString();
          }

          const defects: string[] = [];
          defectColIds.forEach((id: string) => {
            const text = getCol(id);
            if (text) {
              const colTitle = columns.find((c: any) => c.id === id)?.title;
              defects.push(`${colTitle}: ${text}`);
            }
          });

          acc.push({
            id: `tyre-${item.id}`,
            registration: fleetNumber.toUpperCase(),
            location: 'tyre-1',
            entryTime,
            defects,
            boardId: '1565754578'
          });
          return acc;
        }, []);
        mappedTrucks = [...mappedTrucks, ...tyreTrucks];
      }

      setTrucks(mappedTrucks);
    } catch (err: any) {
      console.error("Error fetching monday jobs:", err);
      setError(err.message || "Failed to fetch from monday.com");
      setTrucks(INITIAL_TRUCKS); // fallback
    } finally {
      setLoading(false);
    }
  };

  // Update 'now' every minute to refresh durations, and poll monday.com every 30s
  useEffect(() => {
    fetchMondayJobs();
    const interval = setInterval(() => setNow(Date.now()), 60000);
    const pollInterval = setInterval(() => fetchMondayJobs(false), 30000);
    return () => {
      clearInterval(interval);
      clearInterval(pollInterval);
    };
  }, []);

  const handleDropTruck = async (truckId: string, newLocation: BayId) => {
    const truck = trucks.find(t => t.id === truckId);
    if (!truck || truck.location === newLocation) return;

    // Determine new board ID based on location
    const newBoardId = newLocation === 'tyre-1' ? '1565754578' : '5085312780';

    // Optimistically update UI
    setTrucks(prev => prev.map(t => {
      if (t.id === truckId) {
        return { ...t, location: newLocation, entryTime: new Date().toISOString(), boardId: newBoardId };
      }
      return t;
    }));

    // Send update to monday.com
    try {
      // If it's a tyre bay truck, the ID has a prefix 'tyre-'
      const realItemId = truckId.startsWith('tyre-') ? truckId.replace('tyre-', '') : truckId;
      
      await fetch('/api/monday/move', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          itemId: realItemId, 
          bayId: newLocation,
          boardId: truck.boardId 
        }),
      });
    } catch (err) {
      console.error("Failed to move truck in monday.com:", err);
      // We could revert the optimistic update here if needed
    }
  };

  const getTrucksInBay = (bayId: BayId) => trucks.filter(t => t.location === bayId);

  return (
    <div className="p-4 sm:p-8 relative">
      {hoveredTruck && (
        <div 
          className="fixed z-50 bg-white rounded-xl shadow-2xl w-80 p-4 border border-slate-200 pointer-events-none"
          style={{ 
            left: Math.min(hoveredTruck.x + 15, window.innerWidth - 340), 
            top: Math.min(hoveredTruck.y + 15, window.innerHeight - 300) 
          }}
        >
          <h3 className="text-sm font-black text-[#101161] uppercase tracking-wider mb-3">
            {hoveredTruck.truck.registration} Defects
          </h3>
          <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
            {hoveredTruck.truck.defects && hoveredTruck.truck.defects.length > 0 ? (
              hoveredTruck.truck.defects.map((defect, idx) => (
                <div key={idx} className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-xs text-slate-700">
                  {defect}
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-slate-500 italic text-xs">
                No defects recorded for this truck.
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto">
        
        <header className="mb-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-[#101161] pb-6">
          <div className="flex flex-col items-start">
            {companyLogo ? (
              <img src={companyLogo} alt="Company Logo" className="h-16 object-contain" />
            ) : (
              <>
                <h1 className="text-5xl font-black tracking-tighter text-[#101161] leading-none">
                  Onelogix
                </h1>
                <div className="bg-[#ed1c24] text-white px-4 py-1 rounded-full text-sm font-bold inline-block tracking-widest mt-1">
                  LINEHAUL
                </div>
              </>
            )}
          </div>
          <div className="flex flex-col items-start sm:items-end gap-3">
            <div className="text-[#101161] font-mono text-right">
              <p className="text-sm font-bold uppercase">Yard Management System</p>
              <p className="text-xs opacity-70">Linehaul Depot</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => fetchMondayJobs(true)}
                disabled={loading}
                className="flex items-center gap-2 bg-[#101161] text-white px-3 py-2 rounded-lg hover:bg-[#101161]/90 transition-colors disabled:opacity-50 text-sm font-bold"
                title="Sync with Monday.com"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">SYNC</span>
              </button>
              <LiveClock />
              <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border-2 border-[#101161]/10 shadow-sm">
                <span className="text-sm font-bold text-[#101161]">Total Fleet:</span>
                <span className="font-mono font-black text-[#ed1c24] text-lg">{trucks.length}</span>
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-8 bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-bold text-sm uppercase tracking-tight leading-none mb-1">Monday.com Sync Error</p>
                <p className="text-xs opacity-90 font-medium">{error}</p>
              </div>
            </div>
            <button 
              onClick={() => fetchMondayJobs(true)}
              className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors uppercase tracking-wider shrink-0 ml-4"
            >
              Retry Sync
            </button>
          </div>
        )}

        {/* 1. ENTRY FLOW */}
        <div className="mb-12">
          <section className="ol-card p-6 rounded-xl shadow-sm w-full">
            <h2 className="text-[#101161] text-xs font-black uppercase mb-4 flex items-center">
              <span className="w-2 h-2 bg-[#ed1c24] rounded-full mr-2"></span>
              01. Waiting Area (Pre-Inspection)
            </h2>
            <Bay 
              id="gate" 
              trucks={getTrucksInBay('gate')} 
              now={now} 
              onDropTruck={handleDropTruck}
              onTruckHover={handleTruckHover}
              hideHeader
              className="min-h-[120px] max-h-[200px] overflow-y-auto"
              emptyText="WAITING AREA"
              layout="grid"
            />
          </section>
        </div>

        {/* 2. THE SERVICE BAYS (INTEGRATED ROW) */}
        <div className="mb-12">
          <h2 className="text-lg font-black text-[#101161] mb-6 uppercase border-l-4 border-[#ed1c24] pl-4">
            02. Active Service & Maintenance Bays
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Inspection Bay */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
              <h3 className="text-sm font-black text-[#101161] uppercase mb-4 text-center">Inspection Bay</h3>
              <Bay 
                id="inspection-1" 
                trucks={getTrucksInBay('inspection-1')} 
                now={now} 
                onDropTruck={handleDropTruck} 
                onTruckHover={handleTruckHover}
                hideHeader 
                className="min-h-[120px]"
                emptyText="FOREMAN SLOT"
              />
            </div>

            {/* Oil Pit */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
              <h3 className="text-sm font-black text-[#101161] uppercase mb-4 text-center">Oil Pit</h3>
              <Bay id="oil-pit-1" trucks={getTrucksInBay('oil-pit-1')} now={now} onDropTruck={handleDropTruck} onTruckHover={handleTruckHover} className="min-h-[120px]" />
            </div>

            {/* Workshop */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
              <h3 className="text-sm font-black text-[#101161] uppercase mb-4 text-center">Workshop</h3>
              <Bay id="workshop-1" trucks={getTrucksInBay('workshop-1')} now={now} onDropTruck={handleDropTruck} onTruckHover={handleTruckHover} className="min-h-[120px]" />
            </div>

            {/* Tyre Bay */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
              <h3 className="text-sm font-black text-[#101161] uppercase mb-4 text-center">Tyre Bay</h3>
              <Bay id="tyre-1" trucks={getTrucksInBay('tyre-1')} now={now} onDropTruck={handleDropTruck} onTruckHover={handleTruckHover} className="min-h-[120px]" hideHeader />
            </div>

            {/* Trailer Workshop */}
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
              <h3 className="text-sm font-black text-[#101161] uppercase mb-4 text-center">Trailer Workshop</h3>
              <Bay id="trailer-1" trucks={getTrucksInBay('trailer-1')} now={now} onDropTruck={handleDropTruck} onTruckHover={handleTruckHover} className="min-h-[120px]" />
            </div>

            {/* Washbay */}
            <div className="bg-[#101161]/5 border-2 border-[#101161] p-4 rounded-xl">
              <h3 className="text-sm font-black text-[#101161] uppercase mb-4 text-center italic">Washbay</h3>
              <Bay 
                id="washbay" 
                trucks={getTrucksInBay('washbay')} 
                now={now} 
                onDropTruck={handleDropTruck} 
                onTruckHover={handleTruckHover}
                hideHeader 
                className="min-h-[120px]"
                emptyText="CLEANING STATION"
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<'yard' | 'fleet'>('yard');
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [companyLogo, setCompanyLogo] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const docRef = doc(db, 'settings', 'company');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().logoUrl) {
          setCompanyLogo(docSnap.data().logoUrl);
        }
      } catch (error) {
        console.error("Error fetching logo:", error);
      }
    };
    fetchLogo();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in", error);
    }
  };

  if (!authReady) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-md w-full text-center">
          {companyLogo ? (
            <img src={companyLogo} alt="Company Logo" className="h-16 object-contain mx-auto mb-8" />
          ) : (
            <>
              <h1 className="text-4xl font-black tracking-tighter text-[#101161] leading-none mb-2">Onelogix</h1>
              <div className="bg-[#ed1c24] text-white px-4 py-1 rounded-full text-sm font-bold inline-block tracking-widest mb-8">LINEHAUL</div>
            </>
          )}
          <p className="text-slate-500 mb-8">Please sign in to access the Yard Management System and Fleet Database.</p>
          <button onClick={handleSignIn} className="ol-btn-red w-full py-3 rounded-xl font-bold text-lg">
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans overflow-x-hidden flex flex-col sm:flex-row">
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
          onLogoUpdated={setCompanyLogo} 
        />
        {/* Left Sidebar Navigation Spacer (Desktop) */}
        <div className="hidden sm:block w-16 shrink-0 bg-[#101161]"></div>

        {/* Left Sidebar Navigation (Desktop) */}
        <nav className="group hidden sm:flex flex-col bg-[#101161] text-white min-h-screen py-6 px-3 hover:px-4 border-r border-slate-200 shadow-xl z-50 fixed left-0 top-0 w-16 hover:w-64 transition-all duration-300 overflow-hidden">
          <div className="mb-12 flex items-center h-10 overflow-hidden shrink-0">
            {companyLogo ? (
              <div className="w-10 h-10 shrink-0 flex items-center justify-center bg-white rounded-xl overflow-hidden shadow-lg">
                <img src={companyLogo} alt="Logo" className="w-full h-full object-contain p-1" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-[#ed1c24] rounded-xl flex items-center justify-center font-black text-xl shrink-0 shadow-lg">
                O
              </div>
            )}
            <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity duration-300 shrink-0 ml-3">
              {companyLogo ? (
                <span className="text-sm font-bold tracking-widest text-white uppercase mt-0.5">Company</span>
              ) : (
                <>
                  <h1 className="text-2xl font-black tracking-tighter text-white leading-none">Onelogix</h1>
                  <span className="text-[9px] font-bold tracking-widest text-white/70 uppercase mt-0.5">Linehaul</span>
                </>
              )}
            </div>
          </div>
          
          <div className="flex flex-col gap-2 flex-1">
            <button 
              onClick={() => setView('yard')}
              className={`flex items-center w-full h-10 rounded-xl text-sm font-bold transition-all overflow-hidden ${view === 'yard' ? 'bg-white text-[#101161] shadow-md' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
              title="Yard Management"
            >
              <div className="w-10 h-10 flex items-center justify-center shrink-0">
                <GripVertical className="w-5 h-5" />
              </div>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap ml-1">Yard Management</span>
            </button>
            <button 
              onClick={() => setView('fleet')}
              className={`flex items-center w-full h-10 rounded-xl text-sm font-bold transition-all overflow-hidden ${view === 'fleet' ? 'bg-white text-[#101161] shadow-md' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
              title="Fleet Database"
            >
              <div className="w-10 h-10 flex items-center justify-center shrink-0">
                <TruckIcon className="w-5 h-5" />
              </div>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap ml-1">Fleet Database</span>
            </button>
          </div>

          <div className="mt-auto pt-6 border-t border-white/10 overflow-hidden flex flex-col gap-2">
            <div className="flex items-center w-full h-10" title={user.email || ''}>
              <div className="w-10 h-10 flex items-center justify-center shrink-0 bg-white/10 rounded-full text-sm font-bold text-white">
                {user.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 ml-3 text-xs font-medium text-white/50 truncate">
                {user.email}
              </div>
            </div>
            <button 
              onClick={() => setIsSettingsOpen(true)} 
              className="flex items-center w-full h-10 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 transition-all overflow-hidden uppercase tracking-wider"
              title="Settings"
            >
              <div className="w-10 h-10 flex items-center justify-center shrink-0">
                <Settings className="w-5 h-5" />
              </div>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap ml-1">Settings</span>
            </button>
            <button 
              onClick={() => auth.signOut()} 
              className="flex items-center w-full h-10 rounded-xl text-xs font-bold text-white/70 hover:text-white hover:bg-white/10 transition-all overflow-hidden uppercase tracking-wider"
              title="Sign Out"
            >
              <div className="w-10 h-10 flex items-center justify-center shrink-0">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap ml-1">Sign Out</span>
            </button>
          </div>
        </nav>

        {/* Mobile Header & Navigation */}
        <div className="sm:hidden bg-[#101161] text-white flex flex-col">
          <div className="px-4 py-4 flex justify-between items-center border-b border-white/10">
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="h-8 object-contain bg-white rounded px-2" />
            ) : (
              <h1 className="text-2xl font-black tracking-tighter text-white leading-none">Onelogix</h1>
            )}
            <button onClick={() => auth.signOut()} className="text-xs font-bold text-white/50 hover:text-white uppercase tracking-wider">Sign Out</button>
          </div>
          <div className="p-2 flex gap-2">
            <button 
              onClick={() => setView('yard')}
              className={`flex-1 py-2 rounded-md text-xs font-bold transition-colors ${view === 'yard' ? 'bg-white text-[#101161]' : 'text-white/70 hover:text-white'}`}
            >
              Yard
            </button>
            <button 
              onClick={() => setView('fleet')}
              className={`flex-1 py-2 rounded-md text-xs font-bold transition-colors ${view === 'fleet' ? 'bg-white text-[#101161]' : 'text-white/70 hover:text-white'}`}
            >
              Fleet
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto h-screen">
          {view === 'yard' ? <OneLogixFinalFlow companyLogo={companyLogo} /> : <FleetDatabase />}
        </main>
      </div>
    </ErrorBoundary>
  );
}
