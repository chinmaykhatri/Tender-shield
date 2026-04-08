'use client';
import { smBtn } from './shared-styles';
import type { TenderItem } from '../types';

const REPORT_TYPES = [
  { icon: '📋', title: 'Tender Investigation Report', desc: 'Complete audit of one tender — all bids, actors, AI analysis, blockchain proof, Section 65B certificate.', type: 'tender' },
  { icon: '🏛️', title: 'Ministry Compliance Report', desc: 'Monthly compliance summary — risk distribution, fraud cases, officer performance.', type: 'ministry' },
  { icon: '📊', title: 'CAG Annual Summary', desc: 'All ministries, all tenders, fraud statistics — for CAG annual audit.', type: 'summary' },
];

const RECENT_REPORTS = [
  { name: 'AIIMS Delhi Investigation', type: 'Tender', ministry: 'MoH', date: '15 Mar 2025', size: '2.4 MB' },
  { name: 'MoD Q1 Compliance', type: 'Ministry', ministry: 'MoD', date: '12 Mar 2025', size: '1.8 MB' },
  { name: 'NH-44 Fraud Evidence', type: 'Tender', ministry: 'MoRTH', date: '10 Mar 2025', size: '3.1 MB' },
  { name: 'MoH Monthly Summary', type: 'Ministry', ministry: 'MoH', date: '08 Mar 2025', size: '1.2 MB' },
  { name: 'MeitY Spec Bias Analysis', type: 'Tender', ministry: 'MeitY', date: '05 Mar 2025', size: '0.9 MB' },
  { name: 'Q4 2024 CAG Summary', type: 'Summary', ministry: 'All', date: '01 Mar 2025', size: '5.6 MB' },
  { name: 'MoF Infrastructure Review', type: 'Tender', ministry: 'MoF', date: '25 Feb 2025', size: '1.4 MB' },
];

interface ReportsTabProps {
  onGenerate: (t?: Partial<TenderItem>) => void;
  loading: boolean;
}

export default function ReportsTab({ onGenerate, loading }: ReportsTabProps) {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>📄 CAG Report Generator</h2>
      <p style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>Generate compliance reports with Section 65B certificate — court admissible</p>

      <div style={{ display: 'grid', gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {REPORT_TYPES.map(rt => (
          <div key={rt.type} style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{rt.icon}</div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{rt.title}</h3>
            <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12, lineHeight: 1.4 }}>{rt.desc}</p>
            <button onClick={() => onGenerate()} disabled={loading} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', width: '100%' }}>
              {loading ? '⏳ Generating...' : 'Generate →'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>📁 Recent Reports</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {['Report','Type','Ministry','Generated','Size',''].map(h =>
              <th key={h} style={{ textAlign: 'left', padding: '6px 4px', color: '#64748b', fontWeight: 600, fontSize: 10 }}>{h}</th>
            )}
          </tr></thead>
          <tbody>
            {RECENT_REPORTS.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '8px 4px', color: '#e2e8f0' }}>{r.name}</td>
                <td style={{ padding: '8px 4px' }}><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>{r.type}</span></td>
                <td style={{ padding: '8px 4px', color: '#94a3b8' }}>{r.ministry}</td>
                <td style={{ padding: '8px 4px', color: '#94a3b8' }}>{r.date}</td>
                <td style={{ padding: '8px 4px', color: '#64748b' }}>{r.size}</td>
                <td style={{ padding: '8px 4px' }}><button onClick={() => onGenerate()} style={smBtn('#6366f1')}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
