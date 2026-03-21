'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/lib/store';

export default function VerifyPendingPage() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [checking, setChecking] = useState(false);
  const [verificationData, setVerificationData] = useState<Record<string, unknown> | null>(null);
  const [dots, setDots] = useState('');

  const checkStatus = async () => {
    setChecking(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('user_verifications')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      if (data) {
        setVerificationData(data);
        if (data.admin_approved) router.push('/dashboard');
      }
    } catch (e) { console.error(e); }
    setChecking(false);
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animated dots
  useEffect(() => {
    const i = setInterval(() => setDots(d => d.length >= 3 ? '' : d + '.'), 500);
    return () => clearInterval(i);
  }, []);

  // Realtime
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const setup = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      channel = supabase.channel('verification-status')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'user_verifications', filter: `user_id=eq.${session.user.id}` },
          (payload: { new: Record<string, unknown> }) => { if (payload.new.admin_approved) router.push('/dashboard'); })
        .subscribe();
    };
    setup();
    return () => { if (channel) supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#060612', position: 'relative', overflow: 'hidden', fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      {/* Ambient background orbs */}
      <div style={{ position: 'absolute', top: '-20%', left: '-10%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', filter: 'blur(80px)', animation: 'float 8s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '-15%', right: '-10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'float 10s ease-in-out infinite reverse' }} />
      
      {/* Tricolor top bar */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '3px', zIndex: 50, display: 'flex' }}>
        <div style={{ flex: 1, background: '#FF9933' }} />
        <div style={{ flex: 1, background: '#FFFFFF' }} />
        <div style={{ flex: 1, background: '#138808' }} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '20px' }}>
        <div style={{ maxWidth: '520px', width: '100%', animation: 'slideUp 0.6s cubic-bezier(0.16,1,0.3,1)' }}>
          
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <span style={{ fontSize: '20px', fontWeight: 600, color: 'white', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>
              🛡️ TenderShield
            </span>
          </div>

          {/* Main card */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '24px', padding: '48px 36px', textAlign: 'center',
            backdropFilter: 'blur(20px)', boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}>
            {/* Animated hourglass */}
            <div style={{
              width: '80px', height: '80px', margin: '0 auto 28px',
              borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.1))',
              border: '1px solid rgba(99,102,241,0.2)',
              animation: 'gentlePulse 3s ease-in-out infinite',
            }}>
              <span style={{ fontSize: '36px' }}>⏳</span>
            </div>
            
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: 'white', marginBottom: '8px', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em' }}>
              Account Under Review
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '14px', lineHeight: 1.6, marginBottom: '32px', maxWidth: '380px', margin: '0 auto 32px' }}>
              Your identity verification is being reviewed by NIC Admin{dots}
              <br />You&apos;ll be redirected automatically when approved.
            </p>

            {/* Verification progress */}
            <div style={{
              background: 'rgba(255,255,255,0.02)', borderRadius: '16px', padding: '24px',
              border: '1px solid rgba(255,255,255,0.04)', marginBottom: '28px', textAlign: 'left',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, margin: 0 }}>
                  Verification Progress
                </p>
                <div style={{
                  fontSize: '10px', fontWeight: 600, padding: '3px 10px', borderRadius: '20px',
                  background: 'rgba(251,191,36,0.1)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.15)',
                }}>IN REVIEW</div>
              </div>
              
              {verificationData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <StatusRow label="Email Address" verified={true} />
                  <StatusRow label="Aadhaar eKYC" verified={!!verificationData.aadhaar_verified} />
                  {verificationData.role === 'BIDDER' && (
                    <>
                      <StatusRow label="GSTIN Verification" verified={!!verificationData.gstin_verified} />
                      <StatusRow label="PAN Verification" verified={!!verificationData.pan_verified} />
                    </>
                  )}
                  {(verificationData.role === 'MINISTRY_OFFICER' || verificationData.role === 'SENIOR_OFFICER') && (
                    <StatusRow label="Employee ID" verified={!!verificationData.employee_verified} />
                  )}
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.04)', margin: '4px 0' }} />
                  <StatusRow label="Admin Approval" verified={false} pending />
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(99,102,241,0.4)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: '13px' }}>Loading status...</span>
                </div>
              )}
            </div>

            {/* Estimated time */}
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

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={checkStatus} disabled={checking}
                style={{
                  padding: '14px 24px', borderRadius: '12px', border: 'none', fontWeight: 600, fontSize: '14px',
                  cursor: checking ? 'not-allowed' : 'pointer',
                  background: checking ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white', transition: 'all 200ms', opacity: checking ? 0.7 : 1,
                  boxShadow: '0 4px 12px rgba(99,102,241,0.25)',
                }}>
                {checking ? '↻ Checking...' : '↻ Refresh Status'}
              </button>
              <button onClick={() => { logout(); router.push('/'); }}
                style={{
                  padding: '14px 24px', borderRadius: '12px',
                  background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.4)',
                  border: '1px solid rgba(255,255,255,0.06)', fontWeight: 500, fontSize: '14px', cursor: 'pointer',
                  transition: 'all 200ms',
                }}>
                Sign Out
              </button>
            </div>
          </div>

          {/* Footer */}
          <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.15)', fontSize: '11px', marginTop: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'blink 2s ease-in-out infinite' }} />
            Live monitoring · Auto-refresh every 30s
          </p>
        </div>
      </div>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes gentlePulse { 0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(99,102,241,0.1); } 50% { transform: scale(1.05); box-shadow: 0 0 20px 4px rgba(99,102,241,0.08); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        button:hover { filter: brightness(1.1); }
      `}</style>
    </div>
  );
}

function StatusRow({ label, verified, pending }: { label: string; verified: boolean; pending?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>{label}</span>
      {pending ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24', animation: 'blink 2s ease-in-out infinite' }} />
          <span style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 600 }}>Pending</span>
        </div>
      ) : verified ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: '10px' }}>✓</span>
          </div>
          <span style={{ color: '#4ade80', fontSize: '12px', fontWeight: 600 }}>Verified</span>
        </div>
      ) : (
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '12px' }}>—</span>
      )}
    </div>
  );
}
