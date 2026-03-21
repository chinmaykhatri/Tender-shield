// ─────────────────────────────────────────────────
// FILE: components/CollusionTimeline.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Animated cartel evolution timeline showing fraud network growth over months
// ─────────────────────────────────────────────────
'use client';

import { useState, useEffect, useRef } from 'react';

interface ConnectionData {
  from: string; to: string; type: string; strength: number;
}

const TIMELINE_DATA = {
  months: ['Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025'],
  nodes: [
    { id: 'medtech', name: 'MedTech Solutions', clean: true, x: 25, y: 35 },
    { id: 'biomed', name: 'BioMed Corp', clean: false, x: 75, y: 25 },
    { id: 'pharmaplus', name: 'Pharma Plus', clean: false, x: 70, y: 65 },
    { id: 'healthcare', name: 'HealthCare India', clean: true, x: 30, y: 70 },
  ],
  connections_by_month: {
    0: [] as ConnectionData[],
    1: [] as ConnectionData[],
    2: [{ from: 'biomed', to: 'pharmaplus', type: 'SHARED_DIRECTOR', strength: 0.9 }],
    3: [{ from: 'biomed', to: 'pharmaplus', type: 'SHARED_DIRECTOR', strength: 0.9 }, { from: 'medtech', to: 'biomed', type: 'CO_BID', strength: 0.5 }],
    4: [{ from: 'biomed', to: 'pharmaplus', type: 'SHARED_DIRECTOR', strength: 0.9 }, { from: 'medtech', to: 'biomed', type: 'CO_BID', strength: 0.5 }, { from: 'pharmaplus', to: 'healthcare', type: 'SAME_ADDRESS', strength: 0.7 }],
    5: [{ from: 'biomed', to: 'pharmaplus', type: 'SHARED_DIRECTOR', strength: 0.9 }, { from: 'medtech', to: 'biomed', type: 'CO_BID', strength: 0.5 }, { from: 'pharmaplus', to: 'healthcare', type: 'SAME_ADDRESS', strength: 0.7 }, { from: 'medtech', to: 'pharmaplus', type: 'BID_PATTERN', strength: 0.85 }],
  } as Record<number, ConnectionData[]>,
  risk_by_month: [5, 15, 45, 60, 75, 94],
  cartel_detected_at: 5,
};

export default function CollusionTimeline() {
  const [currentMonth, setCurrentMonth] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [detected, setDetected] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        setCurrentMonth(prev => {
          if (prev >= 5) { setPlaying(false); return 5; }
          return prev + 1;
        });
      }, 2000 / speed);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [playing, speed]);

  useEffect(() => {
    if (currentMonth >= TIMELINE_DATA.cartel_detected_at) setDetected(true);
    else setDetected(false);
  }, [currentMonth]);

  const reset = () => { setCurrentMonth(0); setPlaying(false); setDetected(false); };
  const connections = TIMELINE_DATA.connections_by_month[currentMonth] || [];
  const risk = TIMELINE_DATA.risk_by_month[currentMonth];
  const riskColor = risk >= 76 ? '#dc2626' : risk >= 51 ? '#f97316' : risk >= 26 ? '#f59e0b' : '#22c55e';

  return (
    <div className="card-glass rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-sm">🕸️ Cartel Evolution Timeline</h3>
          <p className="text-xs text-[var(--text-secondary)]">Watch how the fraud network grew over 6 months</p>
        </div>
        <span className="text-lg font-bold px-3 py-1 rounded-lg" style={{ color: riskColor, background: `${riskColor}15` }}>
          Risk: {risk}
        </span>
      </div>

      {/* Detected overlay */}
      {detected && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-500/30 text-center animate-pulse">
          <p className="text-red-400 font-bold text-sm">🚨 CARTEL PATTERN DETECTED — June 2025</p>
          <p className="text-red-300 text-xs">4 companies linked through shared directors, addresses, and bid patterns</p>
        </div>
      )}

      {/* Network Graph */}
      <div className="relative h-64 bg-[var(--bg-secondary)] rounded-xl mb-4 overflow-hidden">
        {/* SVG connections */}
        <svg className="absolute inset-0 w-full h-full">
          {connections.map((c, i) => {
            const fromNode = TIMELINE_DATA.nodes.find(n => n.id === c.from);
            const toNode = TIMELINE_DATA.nodes.find(n => n.id === c.to);
            if (!fromNode || !toNode) return null;
            const isSuspicious = c.strength > 0.6;
            return (
              <line key={i}
                x1={`${fromNode.x}%`} y1={`${fromNode.y}%`}
                x2={`${toNode.x}%`} y2={`${toNode.y}%`}
                stroke={isSuspicious ? '#dc2626' : '#64748b'} strokeWidth={isSuspicious ? 3 : 1}
                strokeDasharray={isSuspicious ? undefined : '5,5'} opacity={c.strength}
                className={isSuspicious ? 'animate-pulse' : ''}
              />
            );
          })}
        </svg>

        {/* Company nodes */}
        {TIMELINE_DATA.nodes.map(node => {
          const isConnected = connections.some(c => c.from === node.id || c.to === node.id);
          const isFlagged = !node.clean && isConnected;
          return (
            <div key={node.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 text-center" style={{ left: `${node.x}%`, top: `${node.y}%` }}>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg ${isFlagged ? 'bg-red-500/30 border-2 border-red-400 animate-pulse' : isConnected ? 'bg-blue-500/20 border border-blue-400' : 'bg-[var(--bg-card)] border border-[var(--border-subtle)]'}`}>
                {isFlagged ? '🔴' : '🏢'}
              </div>
              <p className="text-[10px] mt-1 whitespace-nowrap">{node.name}</p>
              {isConnected && connections.filter(c => c.from === node.id || c.to === node.id).map((c, i) => (
                <p key={i} className="text-[8px] text-red-400">{c.type.replace(/_/g, ' ')}</p>
              ))}
            </div>
          );
        })}
      </div>

      {/* Risk chart */}
      <div className="flex items-end gap-1 h-12 mb-4">
        {TIMELINE_DATA.risk_by_month.map((r, i) => {
          const c = r >= 76 ? '#dc2626' : r >= 51 ? '#f97316' : r >= 26 ? '#f59e0b' : '#22c55e';
          return (
            <div key={i} className="flex-1 flex flex-col items-center">
              <div className={`w-full rounded-t transition-all duration-300 ${i <= currentMonth ? '' : 'opacity-20'}`} style={{ height: `${r * 0.5}px`, background: i <= currentMonth ? c : '#374151' }} />
              <span className="text-[8px] text-[var(--text-secondary)] mt-1">{TIMELINE_DATA.months[i].split(' ')[0]}</span>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button onClick={() => setPlaying(!playing)} className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-medium">
          {playing ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={reset} className="px-3 py-2 rounded-lg bg-[var(--bg-secondary)] text-xs">⏮ Reset</button>
        <div className="flex gap-1 ml-auto">
          {[1, 2, 5].map(s => (
            <button key={s} onClick={() => setSpeed(s)} className={`px-2 py-1 rounded text-[10px] ${speed === s ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-secondary)]'}`}>
              {s}×
            </button>
          ))}
        </div>
        {/* Month slider */}
        <input type="range" min={0} max={5} value={currentMonth} onChange={e => { setCurrentMonth(Number(e.target.value)); setPlaying(false); }}
          className="flex-1 accent-[var(--accent)]" />
      </div>
    </div>
  );
}
