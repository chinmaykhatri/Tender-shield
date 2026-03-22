'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface OfficerData {
  officer_id: string;
  name: string;
  ministry: string;
  designation: string;
  joined: string;
  metrics: {
    total_tenders_created: number;
    high_risk_tenders_approved: number;
    ai_overrides: number;
    avg_alert_response_minutes: number;
    fraud_caught_on_their_tenders: number;
    total_value_managed_crore: number;
    risk_score_distribution: { low: number; medium: number; high: number; critical: number };
  };
  recent_decisions: {
    tender_id: string;
    action: string;
    risk_score_at_time: number;
    decision: string;
    outcome: string;
    date_ist: string;
  }[];
  integrity_score: number;
  integrity_grade: string;
  flags: string[];
}

const GRADE_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  'A+': { bg: 'rgba(34,197,94,0.12)', text: '#22c55e', ring: '#22c55e' },
  A: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e', ring: '#22c55e' },
  B: { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24', ring: '#fbbf24' },
  C: { bg: 'rgba(249,115,22,0.12)', text: '#f97316', ring: '#f97316' },
  D: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', ring: '#ef4444' },
};

const OUTCOME_COLORS: Record<string, { bg: string; text: string }> = {
  CLEAN: { bg: 'rgba(34,197,94,0.1)', text: '#22c55e' },
  FRAUD_CONFIRMED: { bg: 'rgba(239,68,68,0.1)', text: '#ef4444' },
  PENDING: { bg: 'rgba(255,255,255,0.05)', text: 'rgba(255,255,255,0.5)' },
};

export default function OfficerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const officerId = params.officer_id as string;
  const [data, setData] = useState<OfficerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/officers/${officerId}/metrics`)
      .then((r) => r.json())
      .then((res) => { setData(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [officerId]);

  if (loading) {
    return (
      <div style={{ padding: '40px', maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="shimmer" style={{ height: '80px', borderRadius: '16px' }} />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <p style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>Officer not found</p>;

  const gc = GRADE_COLORS[data.integrity_grade] || GRADE_COLORS['D'];
  const dist = data.metrics.risk_score_distribution;
  const totalDist = dist.low + dist.medium + dist.high + dist.critical || 1;

  return (
    <div style={{ padding: '32px 24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Back button */}
      <button onClick={() => router.back()} style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '20px' }}>
        ← Back
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(99,102,241,0.3), rgba(168,85,247,0.3))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700, color: '#a78bfa' }}>
          {data.name[0]}
        </div>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0 }}>{data.name}</h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '2px 0' }}>{data.designation} — {data.ministry}</p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Member since {new Date(data.joined).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}</p>
        </div>
      </div>

      {/* Integrity Score */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ background: gc.bg, border: `1px solid ${gc.text}33`, borderRadius: '20px', padding: '28px', textAlign: 'center', minWidth: '200px', flex: '0 0 auto' }}>
          <div style={{ position: 'relative', width: '100px', height: '100px', margin: '0 auto 12px' }}>
            <svg width="100" height="100" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none" stroke={gc.ring} strokeWidth="8" strokeDasharray={`${data.integrity_score * 2.64} 264`} strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 1s ease' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '28px', fontWeight: 800, color: gc.text }}>{data.integrity_grade}</span>
            </div>
          </div>
          <p style={{ fontSize: '32px', fontWeight: 800, color: gc.text }}>{data.integrity_score}</p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Integrity Score</p>
        </div>

        {/* 4 Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flex: 1 }}>
          {[
            { label: 'Tenders Managed', value: data.metrics.total_tenders_created, sub: `₹${data.metrics.total_value_managed_crore} Cr`, color: '#a78bfa' },
            { label: 'High-Risk Approved', value: data.metrics.high_risk_tenders_approved, sub: data.metrics.high_risk_tenders_approved > 0 ? 'Needs review' : 'Clean record', color: data.metrics.high_risk_tenders_approved > 0 ? '#ef4444' : '#22c55e' },
            { label: 'AI Overrides', value: data.metrics.ai_overrides, sub: data.metrics.ai_overrides > 0 ? 'Overrode AI warnings' : 'No overrides', color: data.metrics.ai_overrides > 0 ? '#f97316' : '#22c55e' },
            { label: 'Avg Response', value: `${data.metrics.avg_alert_response_minutes}m`, sub: data.metrics.avg_alert_response_minutes > 60 ? 'Slow response' : 'Within target', color: data.metrics.avg_alert_response_minutes > 60 ? '#ef4444' : '#22c55e' },
          ].map((stat, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px 18px' }}>
              <p style={{ fontSize: '24px', fontWeight: 700, color: stat.color }}>{stat.value}</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>{stat.label}</p>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Flags */}
      {data.flags.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Accountability Flags</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.flags.map((flag, i) => (
              <div key={i} style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#f87171' }}>
                ⚠️ {flag.replace(/_/g, ' ')}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Risk Distribution */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', marginBottom: '24px' }}>
        <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>Risk Distribution of Managed Tenders</p>
        <div style={{ display: 'flex', gap: '4px', height: '32px', borderRadius: '8px', overflow: 'hidden' }}>
          {[
            { key: 'low' as const, color: '#22c55e', label: 'Low' },
            { key: 'medium' as const, color: '#fbbf24', label: 'Med' },
            { key: 'high' as const, color: '#f97316', label: 'High' },
            { key: 'critical' as const, color: '#ef4444', label: 'Critical' },
          ].map((d) => (
            <div key={d.key} style={{ width: `${(dist[d.key] / totalDist) * 100}%`, background: d.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600, color: '#000', minWidth: dist[d.key] > 0 ? '30px' : '0' }} title={`${d.label}: ${dist[d.key]}`}>
              {dist[d.key] > 0 && dist[d.key]}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
          {[{ label: 'Low', color: '#22c55e' }, { label: 'Medium', color: '#fbbf24' }, { label: 'High', color: '#f97316' }, { label: 'Critical', color: '#ef4444' }].map((l) => (
            <span key={l.label} style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: l.color }} /> {l.label}
            </span>
          ))}
        </div>
      </div>

      {/* Recent Decisions Table */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', overflow: 'auto' }}>
        <p style={{ fontSize: '13px', fontWeight: 600, marginBottom: '14px' }}>Recent Decisions</p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Tender', 'Action', 'Risk', 'Decision', 'Outcome', 'Date'].map((h) => (
                <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 500, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.recent_decisions.map((d, i) => {
              const oc = OUTCOME_COLORS[d.outcome] || OUTCOME_COLORS['PENDING'];
              return (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: d.outcome === 'FRAUD_CONFIRMED' ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                  <td style={{ padding: '10px', fontFamily: 'monospace', color: '#a78bfa', fontSize: '11px' }}>{d.tender_id}</td>
                  <td style={{ padding: '10px', color: 'rgba(255,255,255,0.6)' }}>{d.action.replace(/_/g, ' ')}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ background: d.risk_score_at_time >= 70 ? 'rgba(239,68,68,0.12)' : 'rgba(34,197,94,0.12)', color: d.risk_score_at_time >= 70 ? '#ef4444' : '#22c55e', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>{d.risk_score_at_time}</span>
                  </td>
                  <td style={{ padding: '10px', color: 'rgba(255,255,255,0.6)', maxWidth: '200px' }}>{d.decision}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ background: oc.bg, color: oc.text, padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600 }}>{d.outcome}</span>
                  </td>
                  <td style={{ padding: '10px', color: 'rgba(255,255,255,0.3)', fontSize: '11px' }}>{new Date(d.date_ist).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
