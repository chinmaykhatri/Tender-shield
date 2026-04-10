'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/dataLayer';

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

const GRADE_COLORS: Record<string, string> = {
  'A+': '#22c55e', A: '#22c55e', B: '#fbbf24', C: '#f97316', D: '#ef4444',
};

function computeGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  return 'D';
}

export default function OfficersListPage() {
  const router = useRouter();
  const [officers, setOfficers] = useState<OfficerSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'supabase' | 'empty'>('empty');

  useEffect(() => {
    async function loadOfficers() {
      try {
        // Query profiles with role = OFFICER
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id, name, email, role, org, created_at')
          .in('role', ['OFFICER', 'NIC_ADMIN']);

        if (error || !profiles || profiles.length === 0) {
          // Also try tenders table for created_by officers
          const { data: tenders } = await supabase
            .from('tenders')
            .select('created_by, ministry_code, status, risk_score');

          if (tenders && tenders.length > 0) {
            // Build officer profiles from tender data
            const officerMap: Record<string, { tenders: number; frozenCount: number; totalRisk: number; ministries: Set<string> }> = {};
            for (const t of tenders) {
              const officer = (t as any).created_by || 'unknown';
              if (!officerMap[officer]) officerMap[officer] = { tenders: 0, frozenCount: 0, totalRisk: 0, ministries: new Set() };
              officerMap[officer].tenders += 1;
              officerMap[officer].totalRisk += (t as any).risk_score || 0;
              officerMap[officer].ministries.add((t as any).ministry_code || 'N/A');
              if ((t as any).status === 'FROZEN_BY_AI') officerMap[officer].frozenCount += 1;
            }

            const computed: OfficerSummary[] = Object.entries(officerMap).map(([email, data]) => {
              const avgRisk = data.tenders > 0 ? Math.round(data.totalRisk / data.tenders) : 0;
              const score = Math.max(0, Math.min(100, 100 - avgRisk - (data.frozenCount * 10)));
              return {
                id: email,
                name: email.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
                ministry: [...data.ministries].join(', '),
                designation: 'Procurement Officer',
                integrity_score: score,
                integrity_grade: computeGrade(score),
                tenders_managed: data.tenders,
                ai_overrides: data.frozenCount,
                flags_count: data.frozenCount,
              };
            }).sort((a, b) => b.integrity_score - a.integrity_score);

            setOfficers(computed);
            setDataSource('supabase');
          } else {
            setDataSource('empty');
          }
          setLoading(false);
          return;
        }

        // Build officers from profile data + cross-reference with tenders
        const { data: tenders } = await supabase
          .from('tenders')
          .select('created_by, ministry_code, status, risk_score');

        const tenderMap: Record<string, { count: number; frozen: number; totalRisk: number; ministry: string }> = {};
        for (const t of (tenders || [])) {
          const key = (t as any).created_by || '';
          if (!tenderMap[key]) tenderMap[key] = { count: 0, frozen: 0, totalRisk: 0, ministry: '' };
          tenderMap[key].count += 1;
          tenderMap[key].totalRisk += (t as any).risk_score || 0;
          tenderMap[key].ministry = (t as any).ministry_code || tenderMap[key].ministry;
          if ((t as any).status === 'FROZEN_BY_AI') tenderMap[key].frozen += 1;
        }

        const officerList: OfficerSummary[] = profiles.map((p: any) => {
          const td = tenderMap[p.email] || { count: 0, frozen: 0, totalRisk: 0, ministry: '' };
          const avgRisk = td.count > 0 ? Math.round(td.totalRisk / td.count) : 0;
          const score = Math.max(0, Math.min(100, 100 - avgRisk - (td.frozen * 10)));
          return {
            id: p.id,
            name: p.name || p.email.split('@')[0],
            ministry: p.org || td.ministry || 'Unassigned',
            designation: p.role === 'NIC_ADMIN' ? 'NIC Administrator' : 'Procurement Officer',
            integrity_score: score,
            integrity_grade: computeGrade(score),
            tenders_managed: td.count,
            ai_overrides: td.frozen,
            flags_count: td.frozen,
          };
        }).sort((a, b) => b.integrity_score - a.integrity_score);

        setOfficers(officerList);
        setDataSource(officerList.length > 0 ? 'supabase' : 'empty');
      } catch (err) {
        console.error('Officers load error:', err);
        setDataSource('empty');
      }
      setLoading(false);
    }

    loadOfficers();
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
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: dataSource === 'supabase' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)', color: dataSource === 'supabase' ? '#22c55e' : '#f59e0b', fontWeight: 600 }}>
            {dataSource === 'supabase' ? '🟢 Live from Supabase' : '⚪ No officers registered'}
          </span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{officers.length} officers</span>
        </div>
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
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, background: 'rgba(255,255,255,0.02)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>👤</div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>No Officers Found</h3>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', maxWidth: 400, margin: '0 auto' }}>
            {officers.length === 0
              ? 'No officers have been registered yet. Officer integrity scores are computed from their tender management activity in Supabase.'
              : 'No officers match your search criteria.'}
          </p>
          <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 8 }}>
            Data source: Supabase (profiles + tenders tables)
          </p>
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
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Frozen</p>
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
