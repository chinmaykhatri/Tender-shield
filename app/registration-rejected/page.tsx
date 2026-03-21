'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';

export default function RegistrationRejectedPage() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [retrying, setRetrying] = useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/'); return; }
      await supabase.from('user_verifications').delete().eq('user_id', session.user.id);
      router.push('/register');
    } catch (e) { console.error(e); }
    setRetrying(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#060612', position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      {/* Red ambient glow */}
      <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(239,68,68,0.06) 0%, transparent 70%)', filter: 'blur(80px)' }} />

      {/* Tricolor */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '3px', zIndex: 50, display: 'flex' }}>
        <div style={{ flex: 1, background: '#FF9933' }} /><div style={{ flex: 1, background: '#FFFFFF' }} /><div style={{ flex: 1, background: '#138808' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
        <div style={{ maxWidth: '520px', width: '100%', animation: 'slideUp 0.6s cubic-bezier(0.16,1,0.3,1)' }}>

          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <span style={{ fontSize: '20px', fontWeight: 600, color: 'white', fontFamily: "'Outfit', sans-serif" }}>
              🛡️ TenderShield
            </span>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px', padding: '48px 36px', textAlign: 'center',
            backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}>
            {/* Error icon */}
            <div style={{
              width: '80px', height: '80px', margin: '0 auto 28px', borderRadius: '20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.08))',
              border: '1px solid rgba(239,68,68,0.2)',
            }}>
              <span style={{ fontSize: '36px' }}>⛔</span>
            </div>

            <h1 style={{ fontSize: '26px', fontWeight: 700, color: '#f87171', marginBottom: '8px', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>
              Registration Rejected
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', lineHeight: 1.6, marginBottom: '32px', maxWidth: '360px', margin: '0 auto 32px' }}>
              Your registration was not approved by the NIC Administrator.
              Please review the possible reasons below.
            </p>

            {/* Reasons */}
            <div style={{
              background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.08)',
              borderRadius: '16px', padding: '20px 24px', marginBottom: '28px', textAlign: 'left',
            }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '14px', margin: '0 0 14px' }}>
                Possible Reasons
              </p>
              {[
                'Identity documents could not be verified',
                'Employee ID does not match ministry records',
                'Shell company risk was flagged as too high',
                'Duplicate registration detected in the system',
              ].map((reason, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: i < 3 ? '10px' : 0 }}>
                  <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(248,113,113,0.5)', marginTop: '7px', flexShrink: 0 }} />
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', lineHeight: 1.5 }}>{reason}</span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <a href="mailto:admin@nic.in"
                style={{
                  padding: '14px 24px', borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '14px',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: 'white', display: 'block',
                  boxShadow: '0 4px 12px rgba(99,102,241,0.25)', transition: 'all 200ms', textAlign: 'center',
                }}>
                ✉ Contact NIC Admin
              </a>
              <button onClick={handleRetry} disabled={retrying}
                style={{
                  padding: '14px 24px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.5)',
                  border: '1px solid rgba(255,255,255,0.06)', fontWeight: 500, fontSize: '14px',
                  cursor: 'pointer', transition: 'all 200ms',
                }}>
                {retrying ? 'Clearing data...' : '↻ Try Again with Different Details'}
              </button>
              <button onClick={() => { logout(); router.push('/'); }}
                style={{
                  padding: '14px 24px', borderRadius: '12px', background: 'transparent',
                  color: 'rgba(255,255,255,0.25)', border: 'none', fontWeight: 500, fontSize: '14px', cursor: 'pointer',
                }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        button:hover, a:hover { filter: brightness(1.1); }
      `}</style>
    </div>
  );
}
