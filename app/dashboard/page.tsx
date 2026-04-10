'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { getDashboardStats as getStatsFromDataLayer, getBlockchainFeed } from '@/lib/dataLayer';
import { useBlockchainFeed, useLiveStats } from '@/hooks/useRealtimeData';
import DataSourceBadge from '@/components/DataSourceBadge';
import GlowStripes from '@/components/GlowStripes';
import { SkeletonDashboard } from '@/components/Skeleton';
import BlockchainProof from '@/components/BlockchainProof';
import Link from 'next/link';
import type { DashboardStats, MinistryBreakdown, RiskDistribution, BlockchainEvent } from '@/lib/types';

// ═══════════════════════════════════════════════
// DASHBOARD — Spline-Inspired Redesign (Day 3)
// Editorial headlines, IST clock, alert banner
// ═══════════════════════════════════════════════

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [rawStats, setRawStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [usingRealData, setUsingRealData] = useState(false);
  const [tenderCount, setTenderCount] = useState<number | undefined>(undefined);
  const [istTime, setIstTime] = useState('');
  const blockchainFeed = useBlockchainFeed();
  const [chainStats, setChainStats] = useState<{ chain_height: number; merkle_root: string; integrity_status: string; data_status: string; total_transactions: number; tps: number; peers_active: number; source: string } | null>(null);
  const [chainError, setChainError] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const statsRes = await getStatsFromDataLayer();
        setRawStats(statsRes.data);
        setUsingRealData(statsRes.using_real_data);
        if (statsRes.using_real_data) setTenderCount(statsRes.data.total_active_tenders);
      } catch { /* Error loading stats — handled gracefully */ }
      setLoading(false);
    };
    load();
    // Fetch live blockchain stats
    fetch('/api/blockchain/stats')
      .then(r => { if (!r.ok) throw new Error('API failed'); return r.json(); })
      .then(d => { setChainStats(d); setChainError(false); })
      .catch(() => { setChainError(true); });
  }, []);

  // IST Clock
  useEffect(() => {
    const tick = () => setIstTime(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const stats = useLiveStats(rawStats);

  const statCards = useMemo(() => [
    { icon: '📋', label: 'Active Tenders', value: stats?.total_active_tenders || 0, color: '#6366f1', accent: 'rgba(99,102,241,0.15)' },
    { icon: '📝', label: 'Bids Today', value: stats?.bids_received_today || 0, color: '#22c55e', accent: 'rgba(34,197,94,0.15)' },
    { icon: '🚨', label: 'AI Alerts', value: stats?.ai_alerts_active || 0, color: '#ef4444', accent: 'rgba(239,68,68,0.15)' },
    { icon: '⛓️', label: 'Blockchain TXs', value: stats?.blockchain_tx_today || 0, color: '#f59e0b', accent: 'rgba(245,158,11,0.15)' },
  ], [stats]);

  if (loading) return <SkeletonDashboard />;

  const eventIcon = (e: string) => e.includes('FROZEN') || e.includes('ESCALAT') ? '🚨' : e.includes('BID') ? '🔒' : e.includes('TENDER') ? '📋' : e.includes('AI') || e.includes('COMMIT') ? '🤖' : '📜';
  const eventColor = (type: string) => type === 'danger' ? '#ef4444' : type === 'success' ? '#22c55e' : '#6366f1';

  return (
    <div style={{ position: 'relative' }}>
      {/* Aurora Background */}
      <div className="aurora-bg" />
      {/* Floating Orbs */}
      <div className="floating-orb floating-orb-1" />
      <div className="floating-orb floating-orb-2" />
      <div className="floating-orb floating-orb-3" />
      <GlowStripes size={400} animated opacity={0.3} position="top-right" />

      <div className="space-y-8 animate-fade-in" style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1 flex-wrap">
              <h1 className="text-3xl md:text-5xl" style={{ fontFamily: "'Instrument Serif', serif", fontWeight: 400, color: 'white', lineHeight: 1, margin: 0 }}>
                <span style={{ fontStyle: 'italic', color: '#FF9933' }}>Procurement</span>{' '}
                <span>Monitor</span>
              </h1>
              <DataSourceBadge usingRealData={usingRealData} recordCount={tenderCount} />
            </div>
            <p style={{ color: '#888', fontSize: '13px' }}>Welcome back, {user?.name || 'Officer'} · {user?.role || 'N/A'}</p>
          </div>

          {/* Right: block counter + IST clock */}
          <div className="text-left sm:text-right">
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#4ade80', fontWeight: 500 }}>
              ⛓ Block #{stats?.last_block || 1421}
            </p>
            <p className="text-base md:text-xl" style={{ fontFamily: "'JetBrains Mono', monospace", color: '#888' }}>
              {istTime} IST
            </p>
          </div>
        </div>

        {/* Critical Alert Banner (AIIMS) */}
        <Link
          href="/dashboard/tenders/TDR-MoH-2025-000003"
          style={{
            padding: '16px 24px', borderRadius: '14px', cursor: 'pointer',
            background: 'rgba(204,51,0,0.06)',
            border: '1px solid rgba(204,51,0,0.15)',
            display: 'flex', alignItems: 'center', gap: '14px',
            transition: 'all 200ms',
            textDecoration: 'none',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p className="text-xs md:text-sm" style={{ fontWeight: 600, color: '#f87171' }}>
              🚨 CRITICAL — AIIMS Delhi (₹120 Cr) frozen by AI
            </p>
            <p className="hidden md:block" style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
              Risk: 94/100 · Shell company cartel · BioMed Corp & Pharma Plus · CAG Case: CAG-AI-2025-4521
            </p>
          </div>
          <span style={{ fontSize: '12px', color: '#ff6600', fontWeight: 600, whiteSpace: 'nowrap' }}>View →</span>
        </Link>

        {/* 4 Stat Cards — 3D Tilt with Neon Glow */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <div key={i} className={`card-3d stagger-${i + 1}`}>
              <div className="card-3d-inner" style={{ borderLeft: `3px solid ${stat.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '22px', filter: 'drop-shadow(0 0 8px ' + stat.color + ')' }}>{stat.icon}</span>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', fontWeight: 600 }}>{stat.label}</span>
                </div>
                <p className="number-pop text-3xl md:text-4xl" style={{ fontWeight: 700, color: stat.color, fontFamily: "'Rajdhani', 'DM Sans', sans-serif", lineHeight: 1, textShadow: `0 0 20px ${stat.accent}` }}>
                  {(stat.value as number).toLocaleString('en-IN')}
                </p>
                {/* Animated accent line */}
                <div className="accent-line-animated" style={{ marginTop: '12px', background: `linear-gradient(90deg, ${stat.color}, transparent)` }} />
              </div>
            </div>
          ))}
        </div>

        {/* Value Cards — Glass Depth */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card-3d stagger-5">
            <div className="card-3d-inner glass-layer-1">
              <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>💰 Total Procurement Value</p>
              <p className="number-pop" style={{ fontSize: '40px', fontWeight: 700, fontFamily: "'Rajdhani', sans-serif", background: 'linear-gradient(135deg, #FF9933, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', textShadow: 'none' }}>
                ₹{(stats?.total_tender_value_crore || 0).toLocaleString('en-IN')} Cr
              </p>
              <div className="accent-line-animated" style={{ marginTop: '12px' }} />
            </div>
          </div>
          <div className="card-3d stagger-6">
            <div className="card-3d-inner glass-layer-1">
              <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>🛡️ Fraud Prevented</p>
              <p className="number-pop" style={{ fontSize: '40px', fontWeight: 700, fontFamily: "'Rajdhani', sans-serif", background: 'linear-gradient(135deg, #22c55e, #4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                ₹{(stats?.fraud_prevented_value_crore || 0).toFixed(1)} Cr
              </p>
              <div className="accent-line-animated" style={{ marginTop: '12px', background: 'linear-gradient(90deg, #22c55e, transparent)' }} />
            </div>
          </div>
        </div>

        {/* Ministry Breakdown + Risk Distribution */}
        {stats?.ministry_breakdown && stats.ministry_breakdown.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ alignItems: 'start' }}>
            <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden', minWidth: 0 }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'white' }}>Ministry Breakdown</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '320px', overflowY: 'auto' }}>
                {stats.ministry_breakdown.slice(0, 8).map((m: MinistryBreakdown, i: number) => (
                  <div key={i} style={{ minHeight: '28px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{m.ministry}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: m.color, whiteSpace: 'nowrap', marginLeft: '8px' }}>₹{m.value_crore} Cr</span>
                    </div>
                    <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.04)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '2px', width: `${Math.min((m.value_crore / (stats.ministry_breakdown[0]?.value_crore || 1)) * 100, 100)}%`, background: m.ministry === 'MoH' ? '#ef4444' : '#FF9933', transition: 'width 1s ease' }} />
                    </div>
                  </div>
                ))}
                {stats.ministry_breakdown.length > 8 && (
                  <p style={{ fontSize: '11px', color: '#666', textAlign: 'center', paddingTop: '4px' }}>
                    +{stats.ministry_breakdown.length - 8} more ministries
                  </p>
                )}
              </div>
            </div>

            <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', alignSelf: 'start' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'white' }}>Risk Distribution</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {(stats.risk_distribution || []).map((r: RiskDistribution, i: number) => (
                  <div key={i} style={{ minHeight: '32px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '13px', color: '#ccc', fontWeight: 500 }}>{r.level}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: r.color }}>{r.count}</span>
                    </div>
                    <div className="risk-meter"><div className="risk-meter-fill" style={{ width: `${(r.count / 47) * 100}%`, background: r.color }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Live Feed + Network Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2" style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="pulse-ring" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4ade80', display: 'inline-block', color: '#4ade80' }} />
              Live Blockchain Feed
            </h2>
            <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {blockchainFeed.length === 0 ? (
                <p style={{ color: '#888', padding: '32px 0', textAlign: 'center', fontSize: '13px' }}>No events yet.</p>
              ) : (
                blockchainFeed.slice(0, 12).map((event: BlockchainEvent, i: number) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 12px', borderRadius: '8px',
                    borderLeft: `2px solid ${eventColor(event.type)}`,
                    transition: 'background 200ms',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: '14px' }}>{eventIcon(event.event)}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '12px', fontWeight: 500, color: '#ccc' }}>{event.event}</p>
                      <p style={{ fontSize: '10px', color: '#666' }}>{event.ministry} · {event.amount} · {event.time} IST</p>
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#555' }}>#{event.block}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card-3d-inner glass-layer-1" style={{ borderRadius: '16px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* 3D Rotating Cube */}
              <div style={{ perspective: '100px', width: '24px', height: '24px' }}>
                <div className="cube-3d" style={{ width: '24px', height: '24px' }}>
                  <div className="cube-face" style={{ width: '24px', height: '24px', transform: 'translateZ(12px)' }} />
                  <div className="cube-face" style={{ width: '24px', height: '24px', transform: 'rotateY(180deg) translateZ(12px)' }} />
                  <div className="cube-face" style={{ width: '24px', height: '24px', transform: 'rotateY(90deg) translateZ(12px)' }} />
                  <div className="cube-face" style={{ width: '24px', height: '24px', transform: 'rotateY(-90deg) translateZ(12px)' }} />
                </div>
              </div>
              Blockchain Verification
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Live Chain Stats — HONEST state */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '8px',
                background: chainError ? 'rgba(239,68,68,0.04)' : chainStats?.data_status === 'LIVE_DATA' ? 'rgba(74,222,128,0.04)' : 'rgba(245,158,11,0.04)',
                border: `1px solid ${chainError ? 'rgba(239,68,68,0.1)' : chainStats?.data_status === 'LIVE_DATA' ? 'rgba(74,222,128,0.1)' : 'rgba(245,158,11,0.1)'}` }}>
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 500, color: '#ccc' }}>Chain Integrity</p>
                  <p style={{ fontSize: '10px', color: '#666' }}>
                    {chainError ? 'Cannot reach verification API' : chainStats?.data_status === 'LIVE_DATA' ? 'Merkle Root Verified' : 'No audit data available'}
                  </p>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600,
                  color: chainError ? '#ef4444' : chainStats?.data_status === 'LIVE_DATA' ? '#4ade80' : '#f59e0b',
                  display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%',
                    background: chainError ? '#ef4444' : chainStats?.data_status === 'LIVE_DATA' ? '#4ade80' : '#f59e0b',
                    display: 'inline-block',
                    boxShadow: chainError ? '0 0 6px rgba(239,68,68,0.5)' : chainStats?.data_status === 'LIVE_DATA' ? '0 0 6px rgba(74,222,128,0.5)' : 'none' }} />
                  {chainError ? 'ERROR' : chainStats?.integrity_status || 'NO_DATA'}
                </span>
              </div>
              {[
                { label: 'Chain Height', status: chainError ? '—' : `#${chainStats?.chain_height || 0}`, sub: chainError ? 'API unreachable' : `${chainStats?.total_transactions || 0} transactions` },
                { label: 'Throughput', status: `${chainStats?.tps || 0} TPS`, sub: 'No measured TPS (simulation mode)' },
                { label: 'Network', status: (chainStats?.peers_active ?? 0) > 0 ? '🟢 Online' : '🟡 Local Only', sub: `${chainStats?.peers_active || 0} peers · 0 orgs (no Fabric deployed)` },
              ].map((svc, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: 500, color: '#ccc' }}>{svc.label}</p>
                    <p style={{ fontSize: '10px', color: '#666' }}>{svc.sub}</p>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 500, color: '#4ade80' }}>{svc.status}</span>
                </div>
              ))}
              {/* Merkle Root Display */}
              {chainStats?.merkle_root && (
                <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)' }}>
                  <p style={{ fontSize: '9px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Merkle Root</p>
                  <p style={{ fontSize: '9px', fontFamily: "'JetBrains Mono', monospace", color: '#6366f1', wordBreak: 'break-all' }}>
                    {chainStats.merkle_root.slice(0, 34)}...
                  </p>
                </div>
              )}
              <Link href="/dashboard/blockchain" style={{ display: 'block', textAlign: 'center', fontSize: '11px', color: '#6366f1', padding: '8px', borderRadius: '8px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', textDecoration: 'none', marginTop: '4px' }}>
                ⛓️ Open Block Explorer →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>
    </div>
  );
}
