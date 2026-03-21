'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { getAIAlerts, getTenders, DEMO_TENDERS, DEMO_MODE } from '@/lib/dataLayer';
import Link from 'next/link';

export default function AuditorPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [frozenTenders, setFrozenTenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/'); return; }
    const load = async () => {
      const [alertsRes, tendersRes] = await Promise.all([getAIAlerts(), getTenders({ status: 'FROZEN_BY_AI' })]);
      setAlerts(alertsRes.data || []);
      setFrozenTenders(tendersRes.data || []);
      setLoading(false);
    };
    load();
  }, [isAuthenticated, router]);

  const riskColor = (score: number) => score >= 75 ? '#ef4444' : score >= 50 ? '#f97316' : score >= 25 ? '#f59e0b' : '#22c55e';

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold">🔍 CAG Auditor Panel</h1>
        <p className="text-sm text-[var(--text-secondary)]">Comptroller and Auditor General — Fraud Review Dashboard</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: '🚨', label: 'Pending Review', value: alerts.filter((a: any) => a.risk_level === 'CRITICAL').length, color: '#ef4444' },
          { icon: '❄️', label: 'Frozen Tenders', value: frozenTenders.length, color: '#8b5cf6' },
          { icon: '📋', label: 'Total Alerts', value: alerts.length, color: '#f59e0b' },
          { icon: '🛡️', label: 'Fraud Value', value: '₹238.5 Cr', color: '#6366f1' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <div className="flex items-center gap-2 mb-2"><span>{s.icon}</span><span className="text-xs text-[var(--text-secondary)] uppercase">{s.label}</span></div>
            <p className="text-2xl font-display font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Frozen Tenders - Priority Review */}
      <div className="card-glass p-6">
        <h2 className="font-semibold mb-4 text-red-400">🚨 Priority: Frozen Tenders</h2>
        {loading ? (
          <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 shimmer rounded-xl" />)}</div>
        ) : frozenTenders.length === 0 ? (
          <p className="text-center py-8 text-[var(--text-secondary)]">No frozen tenders</p>
        ) : (
          <div className="space-y-3">
            {frozenTenders.map((tender: any) => (
              <Link key={tender.id} href={`/dashboard/tenders/${tender.id}`}
                className="block p-5 rounded-xl bg-[var(--bg-secondary)] border border-red-500/20 hover:border-red-500/40 transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold mb-1">{tender.title}</h3>
                    <p className="text-xs text-[var(--text-secondary)]">{tender.id} · {tender.ministry_code}</p>
                    <p className="text-xs text-red-400 mt-1">{tender.freeze_reason || 'AI detected fraud pattern'}</p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {(tender.ai_flags || []).map((flag: string, j: number) => (
                        <span key={j} className="badge badge-danger text-[10px]">{flag}</span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{tender.estimated_value_display || `₹${tender.estimated_value_crore} Cr`}</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: riskColor(tender.risk_score) }}>{tender.risk_score}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* All Alerts */}
      <div className="card-glass p-6">
        <h2 className="font-semibold mb-4">📋 All AI Alerts for Review</h2>
        {alerts.length === 0 ? (
          <p className="text-center py-8 text-[var(--text-secondary)]">No alerts to review</p>
        ) : (
          <table className="table-premium">
            <thead><tr><th>Tender</th><th>Ministry</th><th>Risk</th><th>Level</th><th>Action</th><th>Review</th></tr></thead>
            <tbody>
              {alerts.map((alert: any, i: number) => (
                <tr key={i}>
                  <td className="font-medium">{alert.tender_title || alert.tender_id}</td>
                  <td>{alert.ministry}</td>
                  <td><span className="font-bold" style={{ color: riskColor(alert.risk_score) }}>{alert.risk_score}</span></td>
                  <td><span className={`badge ${alert.risk_level === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}`}>{alert.risk_level}</span></td>
                  <td className="text-xs">{alert.recommended_action}</td>
                  <td><Link href={`/dashboard/tenders/${alert.tender_id}`} className="text-[var(--accent)] text-sm hover:underline">View →</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
