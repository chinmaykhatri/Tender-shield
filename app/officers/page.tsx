'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface OfficerSummary {
  id: string;
  name: string;
  ministry: string;
  designation: string;
  integrity_score: number;
  integrity_grade: string;
  tenders_managed: number;
  ai_overrides: number;
  flags_count: number;
}

const DEMO_OFFICERS: OfficerSummary[] = [
  { id: 'officer_002', name: 'Sunita Devi', ministry: 'Ministry of Finance', designation: 'Under Secretary', integrity_score: 96, integrity_grade: 'A+', tenders_managed: 31, ai_overrides: 0, flags_count: 0 },
  { id: 'officer_003', name: 'Vikram Singh', ministry: 'Ministry of Defence', designation: 'Director (Procurement)', integrity_score: 91, integrity_grade: 'A+', tenders_managed: 18, ai_overrides: 0, flags_count: 0 },
  { id: 'officer_004', name: 'Priya Mehta', ministry: 'Ministry of Health', designation: 'Joint Secretary', integrity_score: 88, integrity_grade: 'A', tenders_managed: 42, ai_overrides: 1, flags_count: 0 },
  { id: 'officer_001', name: 'Rajesh Kumar Sharma', ministry: 'Ministry of Road Transport', designation: 'Deputy Director', integrity_score: 72, integrity_grade: 'B', tenders_managed: 24, ai_overrides: 2, flags_count: 2 },
  { id: 'officer_005', name: 'Anil Gupta', ministry: 'Ministry of Railways', designation: 'Deputy Secretary', integrity_score: 58, integrity_grade: 'C', tenders_managed: 15, ai_overrides: 4, flags_count: 3 },
];

const GRADE_COLORS: Record<string, string> = {
  'A+': '#22c55e', A: '#22c55e', B: '#fbbf24', C: '#f97316', D: '#ef4444',
};

export default function OfficersListPage() {
  const router = useRouter();
  const [officers, setOfficers] = useState<OfficerSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Demo mode: use hardcoded data
    setOfficers(DEMO_OFFICERS);
    setLoading(false);
  }, []);

  const filtered = officers.filter(
    (o) =>
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      o.ministry.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '32px 24px', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>👤 Officer Accountability Ledger</h1>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
          Every officer&#39;s decisions are tracked and scored. Ranked by integrity score.
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Search by name or ministry..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(255,255,255,0.03)',
            color: '#fff',
            fontSize: '13px',
            outline: 'none',
          }}
        />
      </div>

      {/* Officers List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="shimmer" style={{ height: '72px', borderRadius: '14px' }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtered.map((officer, idx) => {
            const gradeColor = GRADE_COLORS[officer.integrity_grade] || '#ef4444';
            return (
              <div
                key={officer.id}
                onClick={() => router.push(`/officers/${officer.id}`)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  borderRadius: '14px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '14px', textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
                    {idx + 1}
                  </div>
                  <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: `${gradeColor}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: gradeColor }}>
                    {officer.name[0]}
                  </div>
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>{officer.name}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>
                      {officer.designation} — {officer.ministry}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Tenders</p>
                    <p style={{ fontSize: '14px', fontWeight: 600 }}>{officer.tenders_managed}</p>
                  </div>
                  {officer.ai_overrides > 0 && (
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Overrides</p>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#f97316' }}>{officer.ai_overrides}</p>
                    </div>
                  )}
                  {officer.flags_count > 0 && (
                    <span style={{ fontSize: '11px', background: 'rgba(239,68,68,0.12)', color: '#ef4444', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                      {officer.flags_count} flags
                    </span>
                  )}
                  <div style={{ background: `${gradeColor}15`, borderRadius: '10px', padding: '6px 14px', textAlign: 'center', minWidth: '60px' }}>
                    <p style={{ fontSize: '18px', fontWeight: 800, color: gradeColor, lineHeight: 1 }}>{officer.integrity_score}</p>
                    <p style={{ fontSize: '9px', color: gradeColor, opacity: 0.7 }}>{officer.integrity_grade}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
