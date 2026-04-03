'use client';

import { useRouter } from 'next/navigation';

export default function NotFound() {
  const router = useRouter();

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#080808',
      fontFamily: "'DM Sans', sans-serif",
      padding: '24px',
    }}>
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <div style={{ fontSize: '80px', marginBottom: '16px', opacity: 0.8 }}>🛡️</div>
        
        <h1 style={{
          fontSize: '72px',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #FF9933, #6366f1)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontFamily: "'Rajdhani', sans-serif",
          lineHeight: 1,
          margin: '0 0 8px 0',
        }}>
          404
        </h1>
        
        <h2 style={{
          fontSize: '20px',
          fontWeight: 600,
          color: 'white',
          marginBottom: '12px',
          fontFamily: "'Instrument Serif', serif",
          fontStyle: 'italic',
        }}>
          Page Not Found
        </h2>
        
        <p style={{ color: '#888', fontSize: '14px', lineHeight: 1.6, marginBottom: '28px' }}>
          This route doesn&apos;t exist in the TenderShield platform. 
          The audit trail shows no record of this page. 🔍
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              padding: '12px 28px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              minHeight: '44px',
            }}
          >
            📊 Go to Dashboard
          </button>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '12px 28px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.04)',
              color: '#888',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 500,
              minHeight: '44px',
            }}
          >
            🏠 Home
          </button>
        </div>
        
        <p style={{ marginTop: '40px', fontSize: '11px', color: '#444', letterSpacing: '0.05em' }}>
          TenderShield · AI-Secured Government Procurement
        </p>
      </div>
    </div>
  );
}
