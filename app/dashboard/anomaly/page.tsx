'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

// ═══════════════════════════════════════════════════════════
// TenderShield — Time-Series Anomaly Detection Dashboard
// Z-score analysis on tender/bid volumes over time
// ═══════════════════════════════════════════════════════════

export default function AnomalyPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<'tenders' | 'bids' | 'totalValue'>('tenders');

  useEffect(() => {
    fetch('/api/anomaly-detection')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '4px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#94a3b8' }}>Running anomaly detection...</p>
        </div>
      </div>
    );
  }

  if (!data?.success || !data.time_series?.length) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ fontSize: 48, marginBottom: 12 }}>📈</p>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Anomaly Detection Engine</h2>
        <p style={{ color: '#94a3b8', marginBottom: 16 }}>
          Insufficient data for time-series analysis. Create more tenders and bids to enable z-score anomaly detection.
        </p>
        <div className="card-glass" style={{ padding: 20, borderRadius: 14, maxWidth: 500, margin: '0 auto' }}>
          <p style={{ fontSize: 12, color: '#64748b' }}>
            This engine uses sliding-window z-score analysis (σ &gt; 2.0 threshold) to detect unusual spikes in tender volumes,
            bid activity, and procurement values. At least 4 weeks of data are needed.
          </p>
        </div>
      </div>
    );
  }

  const zScoreKey = metric === 'tenders' ? 'tender_zscore' : metric === 'bids' ? 'bid_zscore' : 'value_zscore';

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>📈 Time-Series Anomaly Detection</h1>
        <p style={{ fontSize: 13, color: '#94a3b8' }}>
          Z-score analysis detecting unusual patterns in procurement activity — threshold: σ &gt; 2.0
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { icon: '📅', label: 'Weeks Analyzed', value: data.summary.total_weeks, color: '#6366f1' },
          { icon: '⚠️', label: 'Anomalies Found', value: data.summary.total_anomalies, color: '#ef4444' },
          { icon: '📊', label: 'Highest Z-Score', value: data.summary.highest_zscore.toFixed(1) + 'σ', color: '#f59e0b' },
          { icon: '📋', label: 'Total Events', value: data.summary.total_tenders + data.summary.total_bids, color: '#22c55e' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span>{s.icon}</span>
              <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase' }}>{s.label}</span>
            </div>
            <p style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Metric toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'tenders' as const, label: '📋 Tender Volume', color: '#6366f1' },
          { key: 'bids' as const, label: '🔒 Bid Activity', color: '#22c55e' },
          { key: 'totalValue' as const, label: '💰 Procurement Value', color: '#f59e0b' },
        ].map(m => (
          <button
            key={m.key}
            onClick={() => setMetric(m.key)}
            style={{
              padding: '8px 16px', borderRadius: 10, fontSize: 12, fontWeight: 600,
              background: metric === m.key ? `${m.color}20` : 'transparent',
              border: `1px solid ${metric === m.key ? `${m.color}40` : 'rgba(255,255,255,0.06)'}`,
              color: metric === m.key ? m.color : '#94a3b8',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="card-glass" style={{ padding: 20, borderRadius: 16, marginBottom: 20 }}>
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={data.time_series}>
            <defs>
              <linearGradient id="anomalyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="week" stroke="#475569" fontSize={10} />
            <YAxis stroke="#475569" fontSize={10} />
            <Tooltip
              contentStyle={{
                background: '#1e293b', border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 10, fontSize: 11, color: '#e2e8f0',
              }}
            />
            <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
            <Area
              type="monotone"
              dataKey={metric}
              stroke="#6366f1"
              fill="url(#anomalyGrad)"
              strokeWidth={2}
              dot={(props: any) => {
                const entry = data.time_series[props.index];
                if (!entry) return <circle key={props.index} cx={0} cy={0} r={0} />;
                const isAnomaly = Math.abs(entry[zScoreKey]) > 2;
                return (
                  <circle
                    key={props.index}
                    cx={props.cx}
                    cy={props.cy}
                    r={isAnomaly ? 6 : 3}
                    fill={isAnomaly ? '#ef4444' : '#6366f1'}
                    stroke={isAnomaly ? '#ef4444' : 'none'}
                    strokeWidth={isAnomaly ? 2 : 0}
                    opacity={isAnomaly ? 1 : 0.6}
                  />
                );
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 8, fontSize: 10, color: '#64748b' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1' }} /> Normal
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} /> Anomaly (σ &gt; 2.0)
          </span>
        </div>
      </div>

      {/* Anomaly table */}
      {data.anomalies.length > 0 && (
        <div className="card-glass" style={{ padding: 20, borderRadius: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🚨 Detected Anomalies</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.anomalies.map((a: any, i: number) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                  borderRadius: 10, background: 'rgba(239,68,68,0.05)',
                  border: '1px solid rgba(239,68,68,0.1)',
                }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `rgba(239,68,68,${Math.min(0.3, a.zscore / 10)})`, fontSize: 14, fontWeight: 800, color: '#f87171',
                }}>
                  {a.zscore.toFixed(1)}σ
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{a.type}</p>
                  <p style={{ fontSize: 10, color: '#94a3b8' }}>{a.detail}</p>
                </div>
                <span style={{ fontSize: 10, color: '#64748b', fontFamily: 'monospace' }}>{a.week}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
