'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { getAIAlerts, DEMO_TENDERS, DEMO_MODE } from '@/lib/dataLayer';

export default function AIMonitorPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/'); return; }
    const load = async () => {
      const res = await getAIAlerts();
      setAlerts(res.data || []);
      setLoading(false);
    };
    load();
  }, [isAuthenticated, router]);

  const detectors = [
    { name: 'Bid Rigging Detector', weight: 30, icon: '📊', desc: 'Analyzes bid variance, cover bids, Benford\'s Law, round numbers, bid gaps', status: '🟢 Active' },
    { name: 'Shell Company Detector', weight: 20, icon: '🏢', desc: 'Checks GSTIN mismatch, recent incorporation, low turnover, shared directors/address', status: '🟢 Active' },
    { name: 'Timing Anomaly Detector', weight: 10, icon: '⏱️', desc: 'Detects burst submissions, last-minute bids, off-hours activity, sequential intervals', status: '🟢 Active' },
    { name: 'Collusion Graph Detector', weight: 25, icon: '🕸️', desc: 'Maps bidder networks, identifies clusters, detects coordination patterns', status: '🟢 Active' },
    { name: 'Cartel Rotation Detector', weight: 15, icon: '🔄', desc: 'Detects turn-taking patterns across tenders, geographic market allocation', status: '🟢 Active' },
  ];

  const riskColor = (level: string) => ({ CRITICAL: '#ef4444', HIGH: '#f97316', MEDIUM: '#f59e0b', LOW: '#22c55e' }[level] || '#6366f1');

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold">🤖 AI Fraud Detection Center</h1>
        <p className="text-sm text-[var(--text-secondary)]">Real-time analysis of procurement patterns</p>
      </div>

      {/* AI Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: '🔍', label: 'Detectors Active', value: '5/5', color: '#22c55e' },
          { icon: '🚨', label: 'Active Alerts', value: alerts.length, color: '#ef4444' },
          { icon: '🛡️', label: 'Fraud Prevented', value: '₹238.5 Cr', color: '#6366f1' },
          { icon: '⚡', label: 'Avg Detection', value: '3.2s', color: '#f59e0b' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="flex items-center gap-2 mb-2"><span>{s.icon}</span><span className="text-xs text-[var(--text-secondary)] uppercase">{s.label}</span></div>
            <p className="text-2xl font-display font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Detectors */}
      <div className="card-glass p-6">
        <h2 className="font-semibold mb-4">🧠 AI Detectors</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {detectors.map((d, i) => (
            <div key={i} className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{d.icon}</span>
                  <span className="font-medium text-sm">{d.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-secondary)]">Weight: {d.weight}%</span>
                  <span className="text-xs">{d.status}</span>
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)]">{d.desc}</p>
              <div className="risk-meter mt-2">
                <div className="risk-meter-fill" style={{ width: `${d.weight}%`, background: '#6366f1' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Alerts */}
      <div className="card-glass p-6">
        <h2 className="font-semibold mb-4">🚨 Active Alerts</h2>
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 shimmer rounded-xl" />)}</div>
        ) : alerts.length === 0 ? (
          <p className="text-center py-8 text-[var(--text-secondary)]">No active alerts</p>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert: any, i: number) => (
              <div key={i} className={`p-5 rounded-xl bg-[var(--bg-secondary)] border-l-4`} style={{ borderLeftColor: riskColor(alert.risk_level) }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`badge ${alert.risk_level === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}`}>{alert.risk_level}</span>
                      <span className="text-sm font-semibold">{alert.tender_title || alert.tender_id}</span>
                    </div>
                    <p className="text-xs text-[var(--text-secondary)]">{alert.tender_id} · {alert.ministry}</p>
                    {alert.flags && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {(Array.isArray(alert.flags) ? alert.flags : []).map((flag: any, j: number) => (
                          <span key={j} className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-card)] text-[var(--text-secondary)]">
                            {flag.type || flag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold" style={{ color: riskColor(alert.risk_level) }}>{alert.risk_score}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{alert.recommended_action}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
