'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { getDashboardStats as getStatsFromDataLayer, getBlockchainFeed } from '@/lib/dataLayer';
import { useBlockchainFeed, useLiveStats } from '@/hooks/useRealtimeData';
import DataSourceBadge from '@/components/DataSourceBadge';
import GlowStripes from '@/components/GlowStripes';
import Link from 'next/link';

// ═══════════════════════════════════════════════
// DASHBOARD — Spline-Inspired Redesign (Day 3)
// Editorial headlines, IST clock, alert banner
// ═══════════════════════════════════════════════

export default function DashboardPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [rawStats, setRawStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [usingRealData, setUsingRealData] = useState(false);
  const [tenderCount, setTenderCount] = useState<number | undefined>(undefined);
  const [istTime, setIstTime] = useState('');
  const blockchainFeed = useBlockchainFeed();

  useEffect(() => {
    if (!isAuthenticated) { router.push('/'); return; }
    const load = async () => {
      try {
        const statsRes = await getStatsFromDataLayer();
        setRawStats(statsRes.data);
        setUsingRealData(statsRes.using_real_data);
        if (statsRes.using_real_data) setTenderCount(statsRes.data.total_active_tenders);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [isAuthenticated, router]);

  // IST Clock
  useEffect(() => {
    const tick = () => setIstTime(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  const stats = useLiveStats(rawStats);

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 w-64 shimmer rounded-lg" />
      <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-32 shimmer rounded-2xl" />)}</div>
    </div>
  );

  const statCards = [
    { icon: '📋', label: 'Active Tenders', value: stats?.total_active_tenders || 0, color: '#6366f1', accent: 'rgba(99,102,241,0.15)' },
    { icon: '📝', label: 'Bids Today', value: stats?.bids_received_today || 0, color: '#22c55e', accent: 'rgba(34,197,94,0.15)' },
    { icon: '🚨', label: 'AI Alerts', value: stats?.ai_alerts_active || 0, color: '#ef4444', accent: 'rgba(239,68,68,0.15)' },
    { icon: '⛓️', label: 'Blockchain TXs', value: stats?.blockchain_tx_today || 0, color: '#f59e0b', accent: 'rgba(245,158,11,0.15)' },
  ];

  const eventIcon = (e: string) => e.includes('FROZEN') || e.includes('ESCALAT') ? '🚨' : e.includes('BID') ? '🔒' : e.includes('TENDER') ? '📋' : e.includes('AI') || e.includes('ZKP') ? '🤖' : '📜';
  const eventColor = (type: string) => type === 'danger' ? '#ef4444' : type === 'success' ? '#22c55e' : '#6366f1';

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <GlowStripes size={400} animated opacity={0.3} position="top-right" />

      <div className="space-y-8 animate-fade-in" style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
              <h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: '48px', fontWeight: 400, color: 'white', lineHeight: 1, margin: 0 }}>
                <span style={{ fontStyle: 'italic', color: '#FF9933' }}>Procurement</span>{' '}
                <span>Monitor</span>
              </h1>
              <DataSourceBadge usingRealData={usingRealData} recordCount={tenderCount} />
            </div>
            <p style={{ color: '#888', fontSize: '13px' }}>Welcome back, {user?.name || 'Officer'} · {user?.role || 'N/A'}</p>
          </div>

          {/* Right: block counter + IST clock */}
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', color: '#4ade80', fontWeight: 500 }}>
              ⛓ Block #{stats?.last_block || 1421}
            </p>
            <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '20px', color: '#888' }}>
              {istTime} IST
            </p>
          </div>
        </div>

        {/* Critical Alert Banner (AIIMS) */}
        <div
          onClick={() => router.push('/dashboard/tenders/TDR-MoH-2025-000003')}
          style={{
            padding: '16px 24px', borderRadius: '14px', cursor: 'pointer',
            background: 'rgba(204,51,0,0.06)',
            border: '1px solid rgba(204,51,0,0.15)',
            display: 'flex', alignItems: 'center', gap: '14px',
            transition: 'all 200ms',
          }}
        >
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', animation: 'pulse 1.5s infinite', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#f87171' }}>
              🚨 CRITICAL — AIIMS Delhi Medical Equipment (₹120 Cr) frozen by AI
            </p>
            <p style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
              Risk: 94/100 · Shell company cartel · BioMed Corp & Pharma Plus · CAG Case: CAG-AI-2025-4521
            </p>
          </div>
          <span style={{ fontSize: '12px', color: '#ff6600', fontWeight: 600 }}>View →</span>
        </div>

        {/* 4 Stat Cards — glass with left accent */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <div key={i} style={{
              padding: '20px', borderRadius: '16px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderLeftWidth: '3px', borderLeftColor: stat.color,
              transition: 'all 200ms',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '18px' }}>{stat.icon}</span>
                <span style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#888', fontWeight: 600 }}>{stat.label}</span>
              </div>
              <p style={{ fontSize: '32px', fontWeight: 700, color: stat.color, fontFamily: "'Rajdhani', 'DM Sans', sans-serif", lineHeight: 1 }}>
                {(stat.value as number).toLocaleString('en-IN')}
              </p>
            </div>
          ))}
        </div>

        {/* Value Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>💰 Total Procurement Value</p>
            <p style={{ fontSize: '36px', fontWeight: 700, fontFamily: "'Rajdhani', sans-serif", background: 'linear-gradient(135deg, #FF9933, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ₹{(stats?.total_tender_value_crore || 0).toLocaleString('en-IN')} Cr
            </p>
          </div>
          <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>🛡️ Fraud Prevented</p>
            <p style={{ fontSize: '36px', fontWeight: 700, fontFamily: "'Rajdhani', sans-serif", background: 'linear-gradient(135deg, #22c55e, #4ade80)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              ₹{(stats?.fraud_prevented_value_crore || 238.5).toFixed(1)} Cr
            </p>
          </div>
        </div>

        {/* Ministry Breakdown + Risk Distribution */}
        {stats?.ministry_breakdown && stats.ministry_breakdown.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'white' }}>Ministry Breakdown</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {stats.ministry_breakdown.map((m: any, i: number) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: '#ccc' }}>{m.ministry}</span>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: m.color }}>₹{m.value_crore} Cr</span>
                    </div>
                    <div style={{ height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.04)' }}>
                      <div style={{ height: '100%', borderRadius: '2px', width: `${(m.value_crore / 500) * 100}%`, background: m.ministry === 'MoH' ? '#ef4444' : '#FF9933', transition: 'width 1s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'white' }}>Risk Distribution</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(stats.risk_distribution || []).map((r: any, i: number) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', color: '#ccc' }}>{r.level}</span>
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
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', animation: 'pulse 1.5s infinite' }} />
              Live Blockchain Feed
            </h2>
            <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {blockchainFeed.length === 0 ? (
                <p style={{ color: '#888', padding: '32px 0', textAlign: 'center', fontSize: '13px' }}>No events yet.</p>
              ) : (
                blockchainFeed.slice(0, 12).map((event: any, i: number) => (
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

          <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px', color: 'white' }}>Network Status</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { label: 'Hyperledger Fabric', status: '🟢 Connected', sub: `${stats?.peers_online || 8} peers · ${stats?.orgs_online || 4} orgs` },
                { label: 'AI Engine', status: '🟢 Active', sub: '5 detectors loaded' },
                { label: 'Throughput', status: `${stats?.tps || 127} TPS`, sub: 'Transactions/sec' },
                { label: 'Last Block', status: `#${stats?.last_block || 1421}`, sub: stats?.network_health || 'HEALTHY' },
              ].map((svc, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: '8px', background: 'rgba(255,255,255,0.02)' }}>
                  <div>
                    <p style={{ fontSize: '12px', fontWeight: 500, color: '#ccc' }}>{svc.label}</p>
                    <p style={{ fontSize: '10px', color: '#666' }}>{svc.sub}</p>
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 500, color: '#4ade80' }}>{svc.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.4 } }`}</style>
    </div>
  );
}
