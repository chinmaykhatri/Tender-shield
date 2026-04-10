'use client';

import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ═══════════════════════════════════════════════════════════
// TenderShield — Impact Metrics Dashboard (A/B Comparison)
// Before vs After TenderShield deployment metrics
// ═══════════════════════════════════════════════════════════

export default function MetricsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/metrics/comparison')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, border: '4px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
          <p style={{ color: '#94a3b8' }}>Computing impact metrics...</p>
        </div>
      </div>
    );
  }

  if (!data?.success) return <p style={{ color: '#f87171' }}>Failed to load metrics</p>;

  const metrics = [
    { label: 'Fraud Detection Rate', before: data.baseline.fraud_detection_rate, after: data.after.fraud_detection_rate, unit: '%', improvement: data.improvements.fraud_detection },
    { label: 'Bid Rigging Caught', before: data.baseline.bid_rigging_caught_pct, after: data.after.bid_rigging_caught_pct, unit: '%', improvement: data.improvements.bid_rigging },
    { label: 'Shell Company Detection', before: data.baseline.shell_company_detection, after: data.after.shell_company_detection, unit: '%', improvement: '+2500%' },
    { label: 'Transparency Score', before: data.baseline.transparency_score, after: data.after.transparency_score, unit: '/100', improvement: data.improvements.transparency },
    { label: 'Audit Coverage', before: data.baseline.audit_coverage_pct, after: data.after.audit_coverage_pct, unit: '%', improvement: '+567%' },
    { label: 'Cost Overrun', before: data.baseline.cost_overrun_pct, after: data.after.cost_overrun_pct, unit: '%', improvement: '-79%', inverted: true },
  ];

  const chartData = metrics.map(m => ({
    name: m.label,
    Before: m.before,
    After: m.after,
  }));

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>📊 Impact Metrics — Before vs After</h1>
        <p style={{ fontSize: 13, color: '#94a3b8' }}>
          Measurable fraud reduction and transparency improvements since TenderShield deployment
        </p>
      </div>

      {/* Headline stat */}
      <div style={{
        padding: '20px 30px', borderRadius: 20, marginBottom: 24, textAlign: 'center',
        background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(99,102,241,0.05))',
        border: '1px solid rgba(34,197,94,0.15)',
      }}>
        <p style={{ fontSize: 48, fontWeight: 900, color: '#22c55e', fontFamily: 'monospace', marginBottom: 6 }}>
          {data.improvements.fraud_detection}
        </p>
        <p style={{ fontSize: 14, color: '#94a3b8' }}>Improvement in fraud detection rate</p>
        <p style={{ fontSize: 11, color: '#64748b', marginTop: 6 }}>
          Detection time: {data.improvements.detection_speed} • {data.improvements.cost_savings}
        </p>
      </div>

      {/* Platform stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { icon: '📋', label: 'Tenders Monitored', value: data.platform_stats.total_tenders, color: '#6366f1' },
          { icon: '🔒', label: 'Bids Analyzed', value: data.platform_stats.total_bids, color: '#22c55e' },
          { icon: '🚩', label: 'Flagged Bids', value: data.platform_stats.flagged_bids, color: '#ef4444' },
          { icon: '📜', label: 'Audit Events', value: data.platform_stats.audit_events, color: '#f59e0b' },
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

      {/* Bar chart */}
      <div className="card-glass" style={{ padding: 20, borderRadius: 16, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>📊 Before vs After Comparison</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="name" stroke="#475569" fontSize={9} angle={-15} textAnchor="end" height={60} />
            <YAxis stroke="#475569" fontSize={10} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, fontSize: 11 }}
            />
            <Bar dataKey="Before" name="Before TenderShield" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => <Cell key={i} fill="rgba(239,68,68,0.5)" />)}
            </Bar>
            <Bar dataKey="After" name="After TenderShield" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => <Cell key={i} fill="#22c55e" />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 8, fontSize: 10 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b' }}>
            <span style={{ width: 12, height: 8, borderRadius: 2, background: 'rgba(239,68,68,0.5)' }} /> Before
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#64748b' }}>
            <span style={{ width: 12, height: 8, borderRadius: 2, background: '#22c55e' }} /> After TenderShield
          </span>
        </div>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
        {metrics.map((m, i) => (
          <div key={i} className="card-glass" style={{
            padding: 16, borderRadius: 14,
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>{m.label}</p>
              <div style={{ display: 'flex', gap: 12 }}>
                <div>
                  <p style={{ fontSize: 9, color: '#ef4444' }}>BEFORE</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: 'rgba(239,68,68,0.6)', fontFamily: 'monospace' }}>
                    {m.before}{m.unit}
                  </p>
                </div>
                <div style={{ fontSize: 18, color: '#475569', alignSelf: 'center' }}>→</div>
                <div>
                  <p style={{ fontSize: 9, color: '#22c55e' }}>AFTER</p>
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#22c55e', fontFamily: 'monospace' }}>
                    {m.after}{m.unit}
                  </p>
                </div>
              </div>
            </div>
            <div style={{
              padding: '8px 12px', borderRadius: 10,
              background: m.inverted ? 'rgba(34,197,94,0.1)' : 'rgba(34,197,94,0.1)',
              border: '1px solid rgba(34,197,94,0.15)',
            }}>
              <p style={{ fontSize: 14, fontWeight: 800, color: '#22c55e' }}>{m.improvement}</p>
            </div>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
