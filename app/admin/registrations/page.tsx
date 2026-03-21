// FILE: app/admin/registrations/page.tsx
// PURPOSE: NIC Admin dashboard to review/approve/reject pending registrations
// INDIA API: none — reads from Supabase
// MOCK MODE: YES — pre-loaded demo registrations

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Registration {
  id: string;
  user_id: string;
  role: string;
  email: string;
  full_name: string;
  submitted_at: string;
  status: string;
  gstin?: string;
  gstin_legal_name?: string;
  gstin_age_months?: number;
  pan?: string;
  pan_name?: string;
  aadhaar_verified?: boolean;
  gem_verified?: boolean;
  udyam_verified?: boolean;
  is_shell_company_risk?: boolean;
  shared_pan?: boolean;
  trust_score?: number;
}

const DEMO_REGISTRATIONS: Registration[] = [
  {
    id: '1', user_id: 'u1', role: 'MINISTRY_OFFICER', email: 'r.sharma@morth.gov.in',
    full_name: 'Rajesh Kumar Sharma', submitted_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    status: 'WAITING', aadhaar_verified: true, trust_score: 85,
  },
  {
    id: '2', user_id: 'u2', role: 'BIDDER', email: 'vendor@medtechsolutions.com',
    full_name: 'MedTech Solutions Pvt Ltd', submitted_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    status: 'WAITING', gstin: '07AABCM1234A1ZK', gstin_legal_name: 'MEDTECH SOLUTIONS PVT LTD',
    gstin_age_months: 83, pan: 'MEDTK1234M', pan_name: 'MEDTECH SOLUTIONS',
    aadhaar_verified: true, gem_verified: true, udyam_verified: false,
    is_shell_company_risk: false, trust_score: 80,
  },
  {
    id: '3', user_id: 'u3', role: 'BIDDER', email: 'admin@biomedicorp.com',
    full_name: 'BioMed Corp India', submitted_at: new Date(Date.now() - 1 * 3600000).toISOString(),
    status: 'WAITING', gstin: '07AABCB5678B1ZP', gstin_legal_name: 'BIOMED CORP INDIA PVT LTD',
    gstin_age_months: 3, pan: 'ABCDE1234F', pan_name: 'FRAUD DIRECTOR',
    aadhaar_verified: true, gem_verified: false, udyam_verified: false,
    is_shell_company_risk: true, shared_pan: true, trust_score: 20,
  },
  {
    id: '4', user_id: 'u4', role: 'SENIOR_OFFICER', email: 'v.singh@finmin.gov.in',
    full_name: 'Vikram Singh', submitted_at: new Date(Date.now() - 6 * 3600000).toISOString(),
    status: 'WAITING', aadhaar_verified: true, trust_score: 90,
  },
];

const ROLE_LABELS: Record<string, string> = {
  MINISTRY_OFFICER: 'Ministry Officer',
  SENIOR_OFFICER: 'Senior Officer',
  BIDDER: 'Bidder',
  CAG_AUDITOR: 'CAG Auditor',
};

const FILTER_TABS = ['All', 'Ministry Officers', 'Senior Officers', 'Bidders', 'Flagged'];

export default function AdminRegistrationsPage() {
  const [registrations, setRegistrations] = useState<Registration[]>(DEMO_REGISTRATIONS);
  const [filter, setFilter] = useState('All');
  const [generatedCode, setGeneratedCode] = useState('');

  const filtered = registrations.filter(r => {
    if (filter === 'All') return true;
    if (filter === 'Ministry Officers') return r.role === 'MINISTRY_OFFICER';
    if (filter === 'Senior Officers') return r.role === 'SENIOR_OFFICER';
    if (filter === 'Bidders') return r.role === 'BIDDER';
    if (filter === 'Flagged') return r.is_shell_company_risk || r.shared_pan;
    return true;
  });

  const pending = registrations.filter(r => r.status === 'WAITING').length;
  const approved = registrations.filter(r => r.status === 'APPROVED').length;
  const rejected = registrations.filter(r => r.status === 'REJECTED').length;

  function approve(id: string) {
    setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status: 'APPROVED' } : r));
  }

  function reject(id: string) {
    setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status: 'REJECTED' } : r));
  }

  function generateAccessCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'TS-AUD-';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setGeneratedCode(code);
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return `${Math.floor(diff / 60000)} min ago`;
    return `${hrs} hour${hrs > 1 ? 's' : ''} ago`;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#080818', padding: '40px 20px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <Link href="/dashboard" style={{ color: '#666', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '24px' }}>← Back to Dashboard</Link>

        <h1 style={{ fontSize: '28px', fontWeight: 700, color: 'white', marginBottom: '8px' }}>
          👥 Pending Registrations
        </h1>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '24px' }}>
          <span style={{ color: '#fbbf24', fontWeight: 600 }}>{pending} Pending</span> · {approved} Approved · {rejected} Rejected
        </p>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {FILTER_TABS.map(tab => (
            <button key={tab} onClick={() => setFilter(tab)} style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: filter === tab ? '#6366f1' : 'rgba(255,255,255,0.04)',
              color: filter === tab ? 'white' : '#888', fontSize: '13px', fontWeight: 500,
            }}>{tab}</button>
          ))}
        </div>

        {/* Generate Access Code */}
        <div style={{ padding: '16px 20px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ color: '#f87171', fontSize: '14px', fontWeight: 600 }}>🔑 Generate CAG Auditor Access Code</p>
            <p style={{ color: '#666', fontSize: '12px' }}>Create one-time codes for new CAG auditors. Expires in 24h.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {generatedCode && (
              <code style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', color: '#4ade80', fontSize: '14px', fontWeight: 700, fontFamily: 'monospace' }}>
                {generatedCode}
              </code>
            )}
            <button onClick={generateAccessCode} style={{
              padding: '8px 16px', borderRadius: '8px', background: '#ef4444', color: 'white',
              border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>Generate Code</button>
          </div>
        </div>

        {/* Registration Cards */}
        {filtered.map(reg => {
          const isFlagged = reg.is_shell_company_risk || reg.shared_pan;
          const isDone = reg.status === 'APPROVED' || reg.status === 'REJECTED';

          return (
            <div key={reg.id} style={{
              padding: '24px', marginBottom: '16px', borderRadius: '14px',
              background: isDone ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${isFlagged ? 'rgba(239,68,68,0.25)' : isDone ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)'}`,
              opacity: isDone ? 0.5 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'white' }}>
                    {isFlagged && '🚨 '}{reg.full_name}
                    <span style={{ fontSize: '11px', fontWeight: 500, padding: '3px 8px', borderRadius: '6px', marginLeft: '10px', background: isFlagged ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.15)', color: isFlagged ? '#f87171' : '#a5b4fc' }}>
                      {ROLE_LABELS[reg.role] || reg.role}{isFlagged ? ' — FLAGGED' : ''}
                    </span>
                  </h3>
                  <p style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>Submitted: {timeAgo(reg.submitted_at)}</p>
                </div>
                {reg.trust_score !== undefined && (
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trust Score</p>
                    <p style={{ fontSize: '20px', fontWeight: 800, color: reg.trust_score >= 60 ? '#4ade80' : reg.trust_score >= 40 ? '#fbbf24' : '#f87171' }}>
                      {reg.trust_score}/100
                    </p>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                <Badge ok={!!reg.aadhaar_verified} label="Aadhaar" />
                <Badge ok={!!reg.email} label={reg.email} />
                {reg.gstin && <Badge ok={!reg.is_shell_company_risk} label={`GSTIN: ${reg.gstin}`} warning={reg.is_shell_company_risk ? `${reg.gstin_age_months}mo old — SHELL RISK` : undefined} />}
                {reg.pan && <Badge ok={!reg.shared_pan} label={`PAN: ${reg.pan}`} warning={reg.shared_pan ? 'SAME DIRECTOR — COLLUSION RISK' : undefined} />}
                {reg.gem_verified && <Badge ok={true} label="GeM Verified" />}
              </div>

              {isDone ? (
                <p style={{ color: reg.status === 'APPROVED' ? '#4ade80' : '#f87171', fontSize: '13px', fontWeight: 600 }}>
                  {reg.status === 'APPROVED' ? '✅ Approved' : '❌ Rejected'}
                </p>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => approve(reg.id)} style={{ padding: '8px 20px', borderRadius: '8px', background: '#22c55e', color: 'white', border: 'none', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    ✅ Approve
                  </button>
                  <button onClick={() => reject(reg.id)} style={{ padding: '8px 20px', borderRadius: '8px', background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    ❌ Reject
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Badge({ ok, label, warning }: { ok: boolean; label: string; warning?: string }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', background: ok ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', color: ok ? '#4ade80' : '#f87171', border: `1px solid ${ok ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}` }}>
      {ok ? '✅' : '⚠️'} {label}
      {warning && <span style={{ color: '#f87171', fontWeight: 600, marginLeft: '4px' }}>← {warning}</span>}
    </div>
  );
}
