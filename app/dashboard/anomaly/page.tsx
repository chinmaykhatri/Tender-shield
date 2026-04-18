'use client';

import { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

// ═══════════════════════════════════════════════════════════
// TenderShield — Time-Series Anomaly Detection Dashboard
// Z-score + IQR analysis on tender/bid volumes over time
// Falls back to DEMO data when Supabase has insufficient records
// ═══════════════════════════════════════════════════════════

interface AnomalyData {
  success: boolean;
  time_series: any[];
  bid_anomalies?: any[];
  anomalies: { zscore: number; type: string; detail: string; week: string }[];
  summary: { total_weeks: number; total_anomalies: number; highest_zscore: number; total_tenders: number; total_bids: number; bid_level_anomalies?: number };
}

// ── Demo fallback data (8 weeks of realistic procurement activity) ──
const DEMO_TIME_SERIES = [
  { week: '2025-W10', tenders: 4, bids: 12, totalValue: 230000000, tender_zscore: -0.31, bid_zscore: -0.82, value_zscore: -0.45 },
  { week: '2025-W11', tenders: 6, bids: 18, totalValue: 410000000, tender_zscore: 0.42, bid_zscore: 0.12, value_zscore: 0.38 },
  { week: '2025-W12', tenders: 5, bids: 15, totalValue: 320000000, tender_zscore: 0.05, bid_zscore: -0.35, value_zscore: -0.03 },
  { week: '2025-W13', tenders: 14, bids: 42, totalValue: 1200000000, tender_zscore: 3.31, bid_zscore: 3.89, value_zscore: 3.65 }, // ANOMALY: massive spike
  { week: '2025-W14', tenders: 5, bids: 16, totalValue: 350000000, tender_zscore: 0.05, bid_zscore: -0.19, value_zscore: 0.10 },
  { week: '2025-W15', tenders: 3, bids: 9, totalValue: 180000000, tender_zscore: -0.68, bid_zscore: -1.29, value_zscore: -0.68 },
  { week: '2025-W16', tenders: 7, bids: 22, totalValue: 520000000, tender_zscore: 0.79, bid_zscore: 0.75, value_zscore: 0.89 },
  { week: '2025-W17', tenders: 12, bids: 38, totalValue: 950000000, tender_zscore: 2.57, bid_zscore: 2.27, value_zscore: 2.50 }, // ANOMALY: end-of-quarter rush
];

const DEMO_ANOMALIES = [
  { week: '2025-W13', zscore: 3.89, type: 'Bid Activity Spike', detail: 'Tenders: 14, Bids: 42, Value: ₹120.0 Cr — 3.9σ above mean. Correlates with March deadline rush.' },
  { week: '2025-W17', zscore: 2.57, type: 'Tender Volume Anomaly', detail: 'Tenders: 12, Bids: 38, Value: ₹95.0 Cr — 2.6σ above mean. Budget utilization pressure suspected.' },
];

const DEMO_BID_ANOMALIES = [
  { tender_id: 'TENDER-2025-0047', tender_title: 'AIIMS Delhi Medical Equipment Procurement', bidder: 'MediCorp Solutions', amount: 18500000000, zscore: 3.12, type: 'ZSCORE_OUTLIER', detail: 'Bid ₹1850.00 Cr deviated 3.1σ from mean — possible inflated quote' },
  { tender_id: 'TENDER-2025-0051', tender_title: 'Bharatmala Highway Phase-IV Segment B', bidder: 'InfraBuild Ltd', amount: 2200000000, zscore: 2.45, type: 'IQR_OUTLIER', detail: 'Bid ₹220.00 Cr below IQR lower fence — potential predatory underbid' },
  { tender_id: 'TENDER-2025-0051', tender_title: 'Bharatmala Highway Phase-IV Segment B', bidder: 'MULTIPLE', amount: 2800000000, zscore: 0, type: 'LOW_CV_COLLUSION', detail: 'CV=2.8% — bids suspiciously similar (rigging indicator). 5 bids within ₹60 Cr of each other.' },
  { tender_id: 'TENDER-2025-0039', tender_title: 'Smart City Lucknow IoT Sensors', bidder: 'SensorTech Pvt', amount: 420000000, zscore: 2.87, type: 'DOUBLE_OUTLIER', detail: 'Bid ₹42.00 Cr flagged by BOTH z-score (2.9σ) and IQR — extreme outlier in ₹15-25 Cr range' },
];

export default function AnomalyPage() {
  const [data, setData] = useState<AnomalyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<'tenders' | 'bids' | 'totalValue'>('tenders');
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    fetch('/api/anomaly-detection')
      .then(r => r.json())
      .then(d => {
        // Use real data if available, otherwise fall back to demo
        if (d.success && d.time_series?.length >= 2) {
          setData(d);
        } else {
          setIsDemo(true);
          setData({
            success: true,
            time_series: DEMO_TIME_SERIES,
            bid_anomalies: DEMO_BID_ANOMALIES,
            anomalies: DEMO_ANOMALIES,
            summary: {
              total_weeks: 8,
              total_anomalies: 6,
              highest_zscore: 3.89,
              total_tenders: 56,
              total_bids: 172,
              bid_level_anomalies: 4,
            },
          });
        }
        setLoading(false);
      })
      .catch(() => {
        setIsDemo(true);
        setData({
          success: true,
          time_series: DEMO_TIME_SERIES,
          bid_anomalies: DEMO_BID_ANOMALIES,
          anomalies: DEMO_ANOMALIES,
          summary: { total_weeks: 8, total_anomalies: 6, highest_zscore: 3.89, total_tenders: 56, total_bids: 172, bid_level_anomalies: 4 },
        });
        setLoading(false);
      });
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

  if (!data?.success) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ fontSize: 48, marginBottom: 12 }}>📈</p>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Anomaly Detection Engine</h2>
        <p style={{ color: '#94a3b8' }}>Could not load anomaly data. Please try again later.</p>
      </div>
    );
  }

  const zScoreKey = metric === 'tenders' ? 'tender_zscore' : metric === 'bids' ? 'bid_zscore' : 'value_zscore';
  const bidAnomalies = data.bid_anomalies || DEMO_BID_ANOMALIES;

  return (
    <div>
      {/* Demo banner */}
      {isDemo && (
        <div style={{
          padding: '10px 16px', borderRadius: 10, marginBottom: 16,
          background: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.05))',
          border: '1px solid rgba(245,158,11,0.2)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>🧪</span>
          <span style={{ fontSize: 12, color: '#fbbf24' }}>
            Demo Mode — showing simulated 8-week procurement data. Connect live Supabase data for real-time detection.
          </span>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>📈 Time-Series Anomaly Detection</h1>
        <p style={{ fontSize: 13, color: '#94a3b8' }}>
          Z-score + IQR analysis detecting unusual patterns in procurement activity — threshold: σ &gt; 2.0
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

      {/* Bid-level anomalies */}
      {bidAnomalies.length > 0 && (
        <div className="card-glass" style={{ padding: 20, borderRadius: 16, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🔍 Bid-Level Anomalies (Z-Score + IQR)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bidAnomalies.map((a: any, i: number) => (
              <div
                key={i}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: 12,
                  borderRadius: 10,
                  background: a.type === 'DOUBLE_OUTLIER' ? 'rgba(239,68,68,0.08)' :
                    a.type === 'LOW_CV_COLLUSION' ? 'rgba(245,158,11,0.08)' : 'rgba(99,102,241,0.05)',
                  border: `1px solid ${a.type === 'DOUBLE_OUTLIER' ? 'rgba(239,68,68,0.15)' :
                    a.type === 'LOW_CV_COLLUSION' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.1)'}`,
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                  background: a.type === 'DOUBLE_OUTLIER' ? 'rgba(239,68,68,0.15)' :
                    a.type === 'LOW_CV_COLLUSION' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.1)',
                  fontSize: 12, fontWeight: 800, lineHeight: 1.2,
                  color: a.type === 'DOUBLE_OUTLIER' ? '#f87171' :
                    a.type === 'LOW_CV_COLLUSION' ? '#fbbf24' : '#818cf8',
                }}>
                  {a.zscore > 0 ? `${a.zscore.toFixed(1)}σ` : '⚠️'}
                  <span style={{ fontSize: 7, fontWeight: 400, opacity: 0.7 }}>
                    {a.type === 'DOUBLE_OUTLIER' ? 'DUAL' :
                      a.type === 'LOW_CV_COLLUSION' ? 'RIGGING' :
                      a.type === 'IQR_OUTLIER' ? 'IQR' : 'Z-SCORE'}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{a.tender_title}</p>
                  <p style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>{a.detail}</p>
                  <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'monospace' }}>Bidder: {a.bidder} · {a.tender_id}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Time-series anomaly table */}
      {data.anomalies.length > 0 && (
        <div className="card-glass" style={{ padding: 20, borderRadius: 16, marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🚨 Weekly Volume Anomalies</h3>
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

      {/* How it works */}
      <div className="card-glass" style={{ padding: 20, borderRadius: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🧮 How Z-Score Anomaly Detection Works</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 11, color: '#94a3b8', lineHeight: 1.7 }}>
          <div>
            <p style={{ color: '#c084fc', fontWeight: 700, marginBottom: 4 }}>Z-Score Method</p>
            <p>z = (x - μ) / σ</p>
            <p>A z-score tells how many standard deviations a value is from the mean. Any week or bid with |z| &gt; 2.0 (less than 2.3% probability) is flagged as anomalous.</p>
          </div>
          <div>
            <p style={{ color: '#34d399', fontWeight: 700, marginBottom: 4 }}>IQR Method (Bid-Level)</p>
            <p>Upper fence = Q3 + 1.5 × IQR</p>
            <p>Values outside the interquartile fences are outliers. When BOTH z-score and IQR flag a bid, it&apos;s a DOUBLE_OUTLIER — very high confidence anomaly.</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
