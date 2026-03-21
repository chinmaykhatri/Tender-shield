'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { login, register } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { DEMO_MODE } from '@/lib/dataLayer';
import { supabase } from '@/lib/supabase';
import GlowStripes from '@/components/GlowStripes';

// ═══════════════════════════════════════════════
// TENDERSHIELD — LOGIN PAGE (Spline-Inspired)
// Cinematic split layout for competition demo
// ═══════════════════════════════════════════════

const DEMO_CREDENTIALS = [
  { role: 'MINISTRY_OFFICER', org: 'MinistryOrg', icon: '🏛️', label: 'Ministry Officer', name: 'Rajesh Kumar Sharma', email: 'officer@morth.gov.in', password: 'Tender@2025', color: '#6366f1', desc: 'Create & manage tenders' },
  { role: 'BIDDER', org: 'BidderOrg', icon: '🏢', label: 'Company Bidder', name: 'Priya Sharma', email: 'medtech@medtechsolutions.com', password: 'Bid@2025', color: '#22c55e', desc: 'Submit encrypted bids' },
  { role: 'CAG_AUDITOR', org: 'AuditorOrg', icon: '🔍', label: 'CAG Auditor', name: 'Vikram Singh', email: 'auditor@cag.gov.in', password: 'Audit@2025', color: '#f59e0b', desc: 'Monitor fraud & audit' },
];

const LIVE_COUNTERS = [
  { icon: '⛓', target: 1847, label: 'blockchain transactions', suffix: '' },
  { icon: '₹', target: 238.5, label: 'fraud prevented', suffix: ' Cr', decimal: true },
  { icon: '📋', target: 47, label: 'active tenders', suffix: '' },
];
const DEMO_EMAILS = ['officer@morth.gov.in', 'medtech@medtechsolutions.com', 'auditor@cag.gov.in'];

/** Check user's verification status and redirect to the right page */
async function redirectByVerificationStatus(userEmail: string, router: ReturnType<typeof useRouter>) {
  // Demo accounts always go straight to dashboard
  if (DEMO_EMAILS.includes(userEmail)) {
    router.push('/dashboard');
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push('/dashboard'); return; }

    const { data: verification } = await supabase
      .from('user_verifications')
      .select('overall_status, admin_approved, role')
      .eq('user_id', session.user.id)
      .single();

    if (!verification) {
      router.push('/register');
    } else if (verification.overall_status === 'PENDING') {
      router.push('/verify-pending');
    } else if (verification.overall_status === 'VERIFIED' && !verification.admin_approved && verification.role !== 'CAG_AUDITOR') {
      router.push('/awaiting-approval');
    } else if (verification.overall_status === 'REJECTED') {
      router.push('/registration-rejected');
    } else {
      router.push('/dashboard');
    }
  } catch {
    // If check fails, go to dashboard (fail open for demo)
    router.push('/dashboard');
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { login: storeLogin, isAuthenticated } = useAuthStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('BIDDER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [typingRole, setTypingRole] = useState('');
  const [counters, setCounters] = useState(LIVE_COUNTERS.map(() => 0));
  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, router]);

  // Count-up animation on load
  useEffect(() => {
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCounters(LIVE_COUNTERS.map(c => {
        const val = c.target * eased;
        return (c as any).decimal ? Math.round(val * 10) / 10 : Math.round(val);
      }));
      if (step >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      if (DEMO_MODE) {
        const r = role === 'MINISTRY_OFFICER' ? 'OFFICER' : role;
        storeLogin('demo-token-' + Date.now(), r, r === 'OFFICER' ? 'MinistryOrg' : r === 'CAG_AUDITOR' ? 'AuditorOrg' : 'BidderOrg', name || email.split('@')[0]);
        router.push('/dashboard');
        return;
      }
      if (isSignUp) {
        const res = await register(email, password, name, role);
        storeLogin(res.access_token, res.role, res.org, res.name || name || email.split('@')[0]);
        // New users need to complete verification
        router.push('/register');
      } else {
        const res = await login(email, password);
        storeLogin(res.access_token, res.role, res.org, res.name);
        // Check verification status for real users
        await redirectByVerificationStatus(email, router);
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  // Typing animation for demo login
  const demoQuickLogin = async (cred: typeof DEMO_CREDENTIALS[0]) => {
    setTypingRole(cred.role);
    setError('');

    if (DEMO_MODE) {
      const r = cred.role === 'MINISTRY_OFFICER' ? 'OFFICER' : cred.role;
      setTimeout(() => {
        storeLogin('demo-token-' + Date.now(), r, cred.org, cred.name);
        router.push('/dashboard');
      }, 600);
      return;
    }

    // Real mode: typing animation
    setEmail('');
    setPassword('');
    for (let i = 0; i <= cred.email.length; i++) {
      await new Promise(r => setTimeout(r, 30));
      setEmail(cred.email.slice(0, i));
    }
    for (let i = 0; i <= cred.password.length; i++) {
      await new Promise(r => setTimeout(r, 25));
      setPassword(cred.password.slice(0, i));
    }
    // Auto-submit after delay
    setTimeout(async () => {
      setLoading(true);
      try {
        const res = await login(cred.email, cred.password);
        storeLogin(res.access_token, res.role, res.org, res.name);
        // Demo credentials bypass verification
        await redirectByVerificationStatus(cred.email, router);
      } catch (err: any) {
        setError(err.message || 'Login failed');
        setLoading(false);
        setTypingRole('');
      }
    }, 500);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#080808', fontFamily: "'DM Sans', sans-serif", overflow: 'hidden' }}>
      {/* 3px Tricolor strip at top */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '3px', zIndex: 50, display: 'flex' }}>
        <div style={{ flex: 1, background: '#FF9933' }} />
        <div style={{ flex: 1, background: '#FFFFFF' }} />
        <div style={{ flex: 1, background: '#138808' }} />
      </div>

      {/* ═══ LEFT SIDE (55%) — Hero ═══ */}
      <div style={{ flex: '0 0 55%', padding: '60px 60px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
        {/* Government of India label */}
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#666', fontWeight: 500 }}>
          Government of India · Blockchain India 2025
        </p>

        {/* Main headline */}
        <div style={{ maxWidth: '520px' }}>
          <h1 style={{ fontSize: '64px', lineHeight: 1.05, fontWeight: 300, margin: 0 }}>
            <span style={{ display: 'block', color: 'white', fontFamily: "'Instrument Serif', serif", opacity: 0, animation: 'fadeSlideIn 0.8s ease forwards 0.2s' }}>
              Ending
            </span>
            <span style={{ display: 'block', color: 'white', fontFamily: "'Instrument Serif', serif", opacity: 0, animation: 'fadeSlideIn 0.8s ease forwards 0.4s' }}>
              Procurement
            </span>
            <span style={{ display: 'block', color: '#FF9933', fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', opacity: 0, animation: 'fadeSlideIn 0.8s ease forwards 0.6s' }}>
              Fraud.
            </span>
          </h1>
          <p style={{ color: '#888', fontSize: '15px', marginTop: '24px', lineHeight: 1.7, maxWidth: '380px', opacity: 0, animation: 'fadeSlideIn 0.8s ease forwards 0.8s' }}>
            India loses ₹4-6 lakh crore annually to procurement fraud.
            TenderShield uses AI + Blockchain to make every tender tamper-proof.
          </p>
        </div>

        {/* Live counters */}
        <div style={{ display: 'flex', gap: '40px', opacity: 0, animation: 'fadeSlideIn 0.8s ease forwards 1s' }}>
          {LIVE_COUNTERS.map((c, i) => (
            <div key={i}>
              <p style={{ fontSize: '28px', fontWeight: 700, color: 'white', fontFamily: "'Outfit', 'DM Sans', sans-serif" }}>
                {c.icon === '₹' ? '₹' : ''}{(c as any).decimal ? counters[i].toFixed(1) : counters[i].toLocaleString('en-IN')}{c.suffix}
              </p>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                {c.icon !== '₹' ? c.icon + ' ' : ''}{c.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ RIGHT SIDE (45%) — Login ═══ */}
      <div style={{ flex: '0 0 45%', background: '#0c0c1a', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '40px' }}>
        <GlowStripes size={700} animated opacity={0.4} position="center" />

        <div style={{
          position: 'relative', zIndex: 10, width: '100%', maxWidth: '400px',
          padding: '40px', borderRadius: '20px',
          background: 'rgba(8,8,8,0.85)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', background: 'linear-gradient(135deg, #FF9933, #6366f1, #138808)' }}>🛡️</div>
              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'white', margin: 0, fontFamily: "'Rajdhani', 'DM Sans', sans-serif" }}>TenderShield</h2>
                <p style={{ fontSize: '10px', color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>AI-Secured Procurement</p>
              </div>
            </div>
          </div>

          {/* Sign In / Sign Up tabs (non-demo only) */}
          {!DEMO_MODE && (
            <div style={{ display: 'flex', gap: '4px', padding: '4px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', marginBottom: '24px' }}>
              <button onClick={() => { setIsSignUp(false); setError(''); }} style={{ flex: 1, padding: '8px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, background: !isSignUp ? '#6366f1' : 'transparent', color: !isSignUp ? 'white' : '#888' }}>
                Sign In
              </button>
              <button onClick={() => { setIsSignUp(true); setError(''); }} style={{ flex: 1, padding: '8px', borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, background: isSignUp ? '#6366f1' : 'transparent', color: isSignUp ? 'white' : '#888' }}>
                Sign Up
              </button>
            </div>
          )}

          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171', fontSize: '13px', marginBottom: '16px' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {(isSignUp || DEMO_MODE) && (
              <InputField label="Full Name" type="text" value={name} onChange={setName} placeholder="e.g. Rajesh Kumar" />
            )}
            <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="your@email.com" ref={emailRef} required={!DEMO_MODE} />
            <InputField label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" ref={passRef} required={!DEMO_MODE} />
            {(isSignUp || DEMO_MODE) && (
              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>Role</label>
                <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'white', fontSize: '13px', outline: 'none' }}>
                  <option value="BIDDER">🏢 Bidder (Company)</option>
                  <option value="MINISTRY_OFFICER">🏛️ Government Officer</option>
                  <option value="CAG_AUDITOR">🔍 CAG Auditor</option>
                </select>
              </div>
            )}
            <button type="submit" disabled={loading} style={{
              padding: '12px', borderRadius: '12px', border: '1px solid #FF9933',
              background: loading ? 'rgba(255,153,51,0.1)' : 'transparent',
              color: '#FF9933', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              transition: 'all 200ms', marginTop: '4px',
            }}>
              {loading ? '⏳ Please wait...' : DEMO_MODE ? '🚀 Enter Dashboard' : isSignUp ? '✨ Create Account' : '🔐 Sign In'}
            </button>
          </form>

          {/* Demo login divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '24px 0 16px' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
            <span style={{ fontSize: '11px', color: '#666' }}>or try a demo account</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Demo role buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {DEMO_CREDENTIALS.map(cred => (
              <button
                key={cred.role}
                onClick={() => demoQuickLogin(cred)}
                disabled={!!typingRole}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '12px 14px', borderRadius: '10px',
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${typingRole === cred.role ? cred.color : 'rgba(255,255,255,0.06)'}`,
                  borderLeftWidth: '3px',
                  borderLeftColor: typingRole === cred.role ? cred.color : 'rgba(255,255,255,0.06)',
                  cursor: typingRole ? 'wait' : 'pointer',
                  transition: 'all 200ms', textAlign: 'left', color: 'white', width: '100%',
                }}
              >
                <span style={{ fontSize: '20px' }}>{cred.icon}</span>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, display: 'block' }}>
                    {typingRole === cred.role ? `Logging in as ${cred.label}...` : cred.label}
                  </span>
                  <span style={{ fontSize: '11px', color: '#666' }}>{cred.desc}</span>
                </div>
                {typingRole === cred.role && <span style={{ animation: 'spin 1s linear infinite', fontSize: '14px' }}>⏳</span>}
              </button>
            ))}
          </div>

          {/* Footer */}
          <p style={{ textAlign: 'center', fontSize: '10px', color: '#555', marginTop: '20px' }}>
            🔒 All actions recorded on Hyperledger Fabric
          </p>

          {!DEMO_MODE && (
            <p style={{ textAlign: 'center', fontSize: '11px', marginTop: '8px' }}>
              <a href="/register" style={{ color: '#FF9933', textDecoration: 'none' }}>Register with full verification →</a>
            </p>
          )}
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Reusable dark input field
import React from 'react';
const InputField = React.forwardRef<HTMLInputElement, {
  label: string; type: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean;
}>(({ label, type, value, onChange, placeholder, required }, ref) => (
  <div>
    <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '6px' }}>{label}</label>
    <input
      ref={ref}
      type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} required={required}
      style={{
        width: '100%', padding: '10px 14px', borderRadius: '10px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: 'white', fontSize: '13px', outline: 'none',
        transition: 'border-color 200ms',
      }}
      onFocus={e => e.target.style.borderColor = 'rgba(255,153,51,0.4)'}
      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
    />
  </div>
));
InputField.displayName = 'InputField';
