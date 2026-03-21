// FILE: app/register/page.tsx
// PURPOSE: Role selection page — first page new users see
// INDIA API: none
// MOCK MODE: N/A — just UI

'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ROLES = [
  {
    id: 'ministry-officer',
    icon: '🏛️',
    title: 'Ministry Officer',
    description: 'I work in a government ministry and create procurement tenders',
    requirements: ['.gov.in or .nic.in email', 'Aadhaar OTP verification', 'Employee ID'],
    color: '#6366f1',
  },
  {
    id: 'senior-officer',
    icon: '⭐',
    title: 'Senior Officer',
    description: 'I approve large tenders above ₹100 Crore',
    requirements: ['.gov.in email', 'Aadhaar OTP verification', 'Employee ID (senior)', 'Admin approval'],
    color: '#f59e0b',
  },
  {
    id: 'bidder',
    icon: '🏢',
    title: 'Bidder / Company',
    description: 'I represent a company and want to bid on government tenders',
    requirements: ['Valid GSTIN', 'PAN number', 'Aadhaar OTP', 'Admin approval'],
    color: '#22c55e',
  },
  {
    id: 'auditor',
    icon: '🔍',
    title: 'CAG Auditor',
    description: 'I work at the Comptroller & Auditor General of India',
    requirements: ['@cag.gov.in email only', 'Aadhaar OTP', 'CAG Employee ID', 'Special Access Code'],
    color: '#ef4444',
  },
];

export default function RegisterPage() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh', background: '#080818', padding: '40px 20px',
      fontFamily: "'DM Sans', 'Inter', sans-serif",
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
          <span style={{ fontSize: '28px' }}>🛡️</span>
          <span style={{ fontSize: '22px', fontWeight: 600, color: 'white', fontFamily: "'Outfit', sans-serif" }}>
            TenderShield
          </span>
        </div>
        <p style={{ color: '#888', fontSize: '14px', marginBottom: '4px' }}>Create your verified account</p>
        <p style={{ color: '#555', fontSize: '13px' }}>🇮🇳 India&apos;s AI-secured government procurement platform</p>
      </div>

      {/* Title */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <h1 style={{
          fontSize: '48px', fontWeight: 700, color: 'white',
          fontFamily: "'Outfit', 'Rajdhani', sans-serif", marginBottom: '8px',
        }}>
          Who are you?
        </h1>
        <p style={{ color: '#888', fontSize: '16px' }}>
          Select your role to begin identity verification
        </p>
      </div>

      {/* 2x2 Grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px',
        maxWidth: '900px', margin: '0 auto 48px',
      }}>
        {ROLES.map(role => (
          <div
            key={role.id}
            onClick={() => router.push(`/register/${role.id}`)}
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '16px',
              padding: '32px',
              cursor: 'pointer',
              transition: 'all 250ms ease',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = `${role.color}50`;
              (e.currentTarget as HTMLDivElement).style.background = `${role.color}08`;
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)';
              (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.02)';
              (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
            }}
          >
            <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>{role.icon}</span>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'white', marginBottom: '8px' }}>
              {role.title}
            </h3>
            <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px', lineHeight: 1.5 }}>
              {role.description}
            </p>
            <div style={{ marginBottom: '20px' }}>
              <p style={{ fontSize: '11px', color: '#666', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Requires:
              </p>
              {role.requirements.map((req, i) => (
                <p key={i} style={{ fontSize: '12px', color: '#555', paddingLeft: '12px', lineHeight: 1.7 }}>
                  • {req}
                </p>
              ))}
            </div>
            <button style={{
              width: '100%', padding: '10px 20px', borderRadius: '10px',
              background: `linear-gradient(135deg, ${role.color}, ${role.color}cc)`,
              color: 'white', border: 'none', fontWeight: 600, fontSize: '13px',
              cursor: 'pointer', transition: 'opacity 200ms',
            }}>
              I am a {role.title} →
            </button>
          </div>
        ))}
      </div>

      {/* Bottom */}
      <p style={{ textAlign: 'center', fontSize: '13px', color: '#555' }}>
        Already have an account?{' '}
        <Link href="/" style={{ color: '#6366f1', textDecoration: 'none' }}>Sign in →</Link>
      </p>
    </div>
  );
}
