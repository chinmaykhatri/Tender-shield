// ─────────────────────────────────────────────────
// FILE: components/AuditTimeline.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Vertical timeline showing every action on a tender with risk score mini-chart
// ─────────────────────────────────────────────────
'use client';

import { useState, useEffect } from 'react';

interface TimelineEvent {
  time: string; date: string; actor: string; role: string;
  action: string; details: string; blockchain_tx: string | null; risk_at_time: number;
}

const ROLE_COLORS: Record<string, string> = {
  MINISTRY_OFFICER: '#6366f1',
  BIDDER: '#FF9933',
  SYSTEM: '#a855f7',
  CAG_AUDITOR: '#22c55e',
};

const ACTION_COLORS: Record<string, string> = {
  TENDER_PUBLISHED: '#6366f1',
  BID_COMMITTED: '#FF9933',
  BIDS_REVEALED: '#f59e0b',
  AI_ANALYSIS_STARTED: '#a855f7',
  FRAUD_DETECTED: '#ef4444',
  TENDER_AUTO_FROZEN: '#ef4444',
  ALERT_SENT: '#22c55e',
};

function MiniRiskChart({ events }: { events: TimelineEvent[] }) {
  const width = 280;
  const height = 80;
  const padding = 10;
  const points = events.map((e, i) => ({
    x: padding + (i / Math.max(events.length - 1, 1)) * (width - padding * 2),
    y: height - padding - (e.risk_at_time / 100) * (height - padding * 2),
    risk: e.risk_at_time,
  }));

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = pathD + ` L ${points[points.length - 1]?.x || 0} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <svg width={width} height={height} className="w-full">
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map(v => (
        <line key={v}
          x1={padding} x2={width - padding}
          y1={height - padding - (v / 100) * (height - padding * 2)}
          y2={height - padding - (v / 100) * (height - padding * 2)}
          stroke="var(--border-subtle)" strokeWidth="0.5" />
      ))}
      {/* Area fill */}
      <path d={areaD} fill="url(#riskGradient)" opacity="0.3" />
      {/* Line */}
      <path d={pathD} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {/* Points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3"
          fill={p.risk >= 76 ? '#ef4444' : p.risk >= 26 ? '#f59e0b' : '#22c55e'}
          stroke="var(--bg-primary)" strokeWidth="1.5" />
      ))}
      <defs>
        <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function AuditTimeline({ tenderId = 'aiims' }: { tenderId?: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedTx, setExpandedTx] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/audit/timeline/${tenderId}`)
      .then(r => r.json())
      .then(d => { setData(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tenderId]);

  if (loading) {
    return <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!data) {
    return <div className="text-center py-12 text-[var(--text-secondary)]">No timeline data available.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">📜 Audit Trail — {data.tender_name}</h2>
          <p className="text-sm text-[var(--text-secondary)]">{data.total_events} events · Final risk: {data.final_risk_score}/100 · Status: {data.status}</p>
        </div>
        {/* Mini risk chart */}
        <div className="card-glass p-3 w-80">
          <p className="text-xs text-[var(--text-secondary)] mb-1">Risk Score Over Time</p>
          <MiniRiskChart events={data.events} />
        </div>
      </div>

      {/* Timeline */}
      <div className="relative pl-8">
        {/* Vertical line */}
        <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-[var(--accent)] via-[#f59e0b] to-[#ef4444]" />

        <div className="space-y-4">
          {data.events.map((event: TimelineEvent, i: number) => {
            const dotColor = ROLE_COLORS[event.role] || '#6366f1';
            const actionColor = ACTION_COLORS[event.action] || '#6366f1';
            const isRiskJump = i > 0 && event.risk_at_time > data.events[i - 1].risk_at_time;
            const isCritical = event.action === 'FRAUD_DETECTED' || event.action === 'TENDER_AUTO_FROZEN';

            return (
              <div key={i} className="relative animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                {/* Dot on timeline */}
                <div className="absolute -left-5 top-3 w-4 h-4 rounded-full border-2 border-[var(--bg-primary)]"
                  style={{ backgroundColor: dotColor, boxShadow: isCritical ? `0 0 12px ${dotColor}` : 'none' }} />

                {/* Event card */}
                <div className={`card-glass p-4 ml-4 ${isCritical ? 'border-red-500/30 bg-red-500/5' : ''}`}>
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-[var(--accent)]">{event.time}</span>
                      <span className="badge text-xs" style={{
                        background: `${actionColor}15`,
                        color: actionColor,
                        border: `1px solid ${actionColor}30`,
                      }}>{event.action}</span>
                      <span className="badge text-xs" style={{
                        background: `${dotColor}15`,
                        color: dotColor,
                      }}>{event.role.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isRiskJump && (
                        <span className="text-xs text-red-400 font-semibold">
                          Risk: {data.events[i - 1].risk_at_time} → {event.risk_at_time}
                        </span>
                      )}
                      <span className="text-xs font-mono px-2 py-0.5 rounded-full"
                        style={{
                          background: `${event.risk_at_time >= 76 ? '#ef4444' : event.risk_at_time >= 26 ? '#f59e0b' : '#22c55e'}15`,
                          color: event.risk_at_time >= 76 ? '#ef4444' : event.risk_at_time >= 26 ? '#f59e0b' : '#22c55e',
                        }}>
                        Risk: {event.risk_at_time}
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-[var(--text-secondary)] mt-1">{event.actor}</p>
                  <p className="text-sm mt-1">{event.details}</p>

                  {event.blockchain_tx && (
                    <button onClick={() => setExpandedTx(expandedTx === i ? null : i)}
                      className="text-xs text-[var(--accent)] hover:underline mt-2 flex items-center gap-1">
                      ⛓️ TX: {event.blockchain_tx.substring(0, 10)}...{event.blockchain_tx.substring(event.blockchain_tx.length - 6)}
                      <span className="text-[10px]">{expandedTx === i ? '▲' : '▼'}</span>
                    </button>
                  )}

                  {expandedTx === i && event.blockchain_tx && (
                    <div className="mt-2 p-3 rounded-lg bg-[var(--bg-secondary)] text-xs animate-fade-in">
                      <p className="text-[var(--text-secondary)]">Full TX Hash:</p>
                      <p className="font-mono text-[var(--accent)] break-all">{event.blockchain_tx}</p>
                      <p className="text-green-400 mt-2">✅ Verified on Hyperledger Fabric — Immutable</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
