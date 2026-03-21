'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';

export default function AwaitingApprovalPage() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [checking, setChecking] = useState(false);

  const checkStatus = async () => {
    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('user_verifications')
        .select('admin_approved')
        .eq('user_id', session.user.id)
        .single();
      if (data?.admin_approved) router.push('/dashboard');
    } catch (e) { console.error(e); }
    setChecking(false);
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#060612', position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      {/* Ambient orbs */}
      <div style={{ position: 'absolute', top: '-15%', right: '-5%', width: '450px', height: '450px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)', filter: 'blur(80px)', animation: 'float 9s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '-20%', left: '-8%', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'float 11s ease-in-out infinite reverse' }} />

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
            {/* Success icon */}
            <div style={{
              width: '80px', height: '80px', margin: '0 auto 28px', borderRadius: '20px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(16,185,129,0.08))',
              border: '1px solid rgba(34,197,94,0.2)',
            }}>
              <span style={{ fontSize: '36px' }}>✅</span>
            </div>

            <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'white', marginBottom: '8px', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>
              Identity Verified!
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', lineHeight: 1.6, marginBottom: '32px', maxWidth: '360px', margin: '0 auto 32px' }}>
              All your documents have been verified successfully.
              Awaiting final admin approval to activate your account.
            </p>

            {/* Status banner */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.03))',
              border: '1px solid rgba(34,197,94,0.12)', borderRadius: '16px',
              padding: '20px', marginBottom: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%', background: '#4ade80',
                  boxShadow: '0 0 8px rgba(74,222,128,0.4)', animation: 'blink 2s ease-in-out infinite',
                }} />
                <span style={{ color: '#4ade80', fontSize: '14px', fontWeight: 600 }}>All Verifications Complete</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '8px', margin: '8px 0 0' }}>
                NIC Administrator will finalize your role access
              </p>
            </div>

            {/* Time estimate */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              padding: '12px 20px', borderRadius: '12px',
              background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)',
              marginBottom: '28px',
            }}>
              <span style={{ fontSize: '14px' }}>🕐</span>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                Estimated: <strong style={{ color: 'rgba(255,255,255,0.7)' }}>24-48 hours</strong>
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={checkStatus} disabled={checking}
                style={{
                  padding: '14px 24px', borderRadius: '12px', border: 'none', fontWeight: 600, fontSize: '14px',
                  cursor: checking ? 'not-allowed' : 'pointer',
                  background: checking ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white', transition: 'all 200ms', opacity: checking ? 0.7 : 1,
                  boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
                }}>
                {checking ? '↻ Checking...' : '↻ Check Approval Status'}
              </button>
              <button onClick={() => { logout(); router.push('/'); }}
                style={{
                  padding: '14px 24px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)',
                  border: '1px solid rgba(255,255,255,0.06)', fontWeight: 500, fontSize: '14px', cursor: 'pointer',
                }}>
                Sign Out
              </button>
            </div>
          </div>

          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '11px', marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'blink 2s ease-in-out infinite' }} />
            Auto-refresh every 30s
          </p>
        </div>
      </div>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        button:hover { filter: brightness(1.1); }
      `}</style>
    </div>
  );
}
