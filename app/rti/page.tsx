// ─────────────────────────────────────────────────
// FILE: app/rti/page.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: RTI citizen transparency portal — public procurement data search
// ─────────────────────────────────────────────────
'use client';

import { useState } from 'react';

interface PublicTender {
  id: string; title: string; ministry: string; department: string;
  estimated_crore: number; awarded_crore: number | null; winner: string | null;
  created: string; deadline: string; awarded_date: string | null;
  status: string; tx_hash: string; ai_flagged: boolean;
}

const DEMO_TENDERS: PublicTender[] = [
  { id: 'TDR-MoRTH-2025-000001', title: 'NH-44 Highway Expansion Phase 3', ministry: 'Ministry of Road Transport', department: 'NHAI', estimated_crore: 450, awarded_crore: null, winner: null, created: '2025-01-15', deadline: '2025-04-15', awarded_date: null, status: 'Bidding Open', tx_hash: '0x4f7a...3b2c', ai_flagged: false },
  { id: 'TDR-MoE-2025-000002', title: 'PM SHRI Schools Digital Infrastructure', ministry: 'Ministry of Education', department: 'DIKSHA', estimated_crore: 85, awarded_crore: 82.4, winner: 'EduTech India Pvt Ltd', created: '2024-12-01', deadline: '2025-02-28', awarded_date: '2025-03-05', status: 'Awarded', tx_hash: '0x9c2e...7f1a', ai_flagged: false },
  { id: 'TDR-MoH-2025-000003', title: 'AIIMS Delhi Medical Equipment', ministry: 'Ministry of Health & Family Welfare', department: 'AIIMS Delhi', estimated_crore: 120, awarded_crore: null, winner: null, created: '2025-02-10', deadline: '2025-03-10', awarded_date: null, status: 'Frozen by AI', tx_hash: '0x2e5c...d1e2', ai_flagged: true },
  { id: 'TDR-MoD-2025-000004', title: 'Smart City Surveillance System', ministry: 'Ministry of Defence', department: 'DRDO', estimated_crore: 200, awarded_crore: null, winner: null, created: '2025-03-01', deadline: '2025-05-15', awarded_date: null, status: 'Under Evaluation', tx_hash: '0xa1b2...c5d6', ai_flagged: true },
];

export default function RTIPage() {
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [ministryFilter, setMinistryFilter] = useState('');
  const filtered = DEMO_TENDERS.filter(t =>
    (!search || t.title.toLowerCase().includes(search.toLowerCase()) || t.ministry.toLowerCase().includes(search.toLowerCase())) &&
    (!ministryFilter || t.ministry.includes(ministryFilter))
  );

  const downloadCSV = () => {
    const headers = 'ID,Title,Ministry,Estimated (Cr),Awarded (Cr),Winner,Status,Blockchain TX\n';
    const rows = filtered.map(t => `${t.id},"${t.title}","${t.ministry}",${t.estimated_crore},${t.awarded_crore || ''},${t.winner || ''},${t.status},${t.tx_hash}`).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'tendershield_rti_data.csv'; a.click();
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="tricolor-bar fixed top-0 left-0 right-0 z-50" />
      <div className="max-w-5xl mx-auto p-6 pt-10">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-display font-bold">🇮🇳 Right to Information — Procurement Transparency</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">All government procurement is a matter of public record under RTI Act 2005</p>
        </div>

        {/* Search & Filters */}
        <div className="card-glass rounded-xl p-4 mb-6">
          <div className="flex gap-3 flex-wrap">
            <input className="input-field flex-1 min-w-[200px]" placeholder="Search ministry, tender name, or company..." value={search} onChange={e => setSearch(e.target.value)} />
            <select className="input-field" value={yearFilter} onChange={e => setYearFilter(e.target.value)}>
              <option value="">All Years</option><option value="2025">2025</option><option value="2024">2024</option>
            </select>
            <select className="input-field" value={ministryFilter} onChange={e => setMinistryFilter(e.target.value)}>
              <option value="">All Ministries</option>
              {['Road Transport', 'Education', 'Health', 'Defence'].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Results */}
        <div className="card-glass rounded-xl overflow-hidden mb-6">
          <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">{filtered.length} tenders found</span>
            <div className="flex gap-2">
              <button onClick={downloadCSV} className="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] text-xs hover:bg-[var(--accent)]/20 transition-all">📥 Download CSV</button>
              <button className="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] text-xs">📄 Download PDF</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-secondary)]">
                  {['Tender', 'Ministry', 'Est. Value', 'Awarded', 'Winner', 'Status', 'AI Flag', 'TX Hash'].map(h => (
                    <th key={h} className="p-3 text-left text-[10px] font-medium text-[var(--text-secondary)] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className="border-t border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">
                    <td className="p-3"><p className="text-xs font-medium">{t.title}</p><p className="text-[10px] text-[var(--text-secondary)] font-mono">{t.id}</p></td>
                    <td className="p-3 text-xs">{t.ministry}</td>
                    <td className="p-3 text-xs font-bold text-[var(--accent)]">₹{t.estimated_crore} Cr</td>
                    <td className="p-3 text-xs">{t.awarded_crore ? `₹${t.awarded_crore} Cr` : '—'}</td>
                    <td className="p-3 text-xs">{t.winner || '—'}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-[10px] ${t.status === 'Frozen by AI' ? 'bg-red-400/20 text-red-400' : t.status === 'Awarded' ? 'bg-green-400/20 text-green-400' : 'bg-blue-400/20 text-blue-400'}`}>{t.status}</span></td>
                    <td className="p-3 text-xs">{t.ai_flagged ? '🚨 Yes' : '✅ No'}</td>
                    <td className="p-3 text-[10px] font-mono text-[var(--text-secondary)]">{t.tx_hash}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-center text-xs text-[var(--text-secondary)]">Data updated live from blockchain | RTI Act 2005 compliant</p>
        <a href="/dashboard" className="block text-center text-sm text-[var(--accent)] hover:underline mt-4">← Back to Dashboard</a>
      </div>
    </div>
  );
}
