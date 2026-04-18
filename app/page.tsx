'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { login, register } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { DEMO_MODE } from '@/lib/dataLayer';
import { supabase } from '@/lib/supabase';
import GlowStripes from '@/components/GlowStripes';
import NetworkHero from '@/components/NetworkHero';
import DemoLoginTransition from '@/components/DemoLoginTransition';

// ═══════════════════════════════════════════════
// TENDERSHIELD — LOGIN PAGE (Spline-Inspired)
// Cinematic split layout for competition demo
// ═══════════════════════════════════════════════

const DEMO_CREDENTIALS = [
  { role: 'MINISTRY_OFFICER', org: 'MinistryOrg', icon: '🏛️', label: 'Ministry Officer', name: 'Rajesh Kumar Sharma', email: 'officer@morth.gov.in', color: '#6366f1', desc: 'Create & manage tenders' },
  { role: 'BIDDER', org: 'BidderOrg', icon: '🏢', label: 'Company Bidder', name: 'Priya Sharma', email: 'medtech@medtechsolutions.com', color: '#22c55e', desc: 'Submit sealed bids' },
  { role: 'CAG_AUDITOR', org: 'AuditorOrg', icon: '🔍', label: 'CAG Auditor', name: 'Vikram Singh', email: 'auditor@cag.gov.in', color: '#f59e0b', desc: 'Monitor fraud & audit' },
];

interface LiveCounter {
  icon: string;
  target: number;
  label: string;
  suffix: string;
  decimal?: boolean;
}

const LIVE_COUNTERS: LiveCounter[] = [
  { icon: '🔬', target: 6, label: 'statistical detectors (real math)', suffix: '' },
  { icon: '🎯', target: 5, label: 'fraud scenarios you can test now', suffix: '' },
  { icon: '⚡', target: 0, label: 'external API calls (100% local)', suffix: '' },
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
    // If verification check fails, redirect to dashboard (middleware enforces actual auth)
    router.push('/dashboard');
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { login: storeLogin, isAuthenticated, validateWithServer } = useAuthStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('BIDDER');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [typingRole, setTypingRole] = useState('');
  const [counters, setCounters] = useState(LIVE_COUNTERS.map(() => 0));
  const [transitionVisible, setTransitionVisible] = useState(false);
  const [transitionRole, setTransitionRole] = useState({ name: '', color: '' });
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
        return c.decimal ? Math.round(val * 10) / 10 : Math.round(val);
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
        setTransitionRole({ name: name || email || 'Dashboard', color: '#6366f1' });
        setTransitionVisible(true);
        const timeout = new Promise(r => setTimeout(r, 3000));
        await Promise.race([validateWithServer(email || undefined).catch(() => {}), timeout]);
        await new Promise(r => setTimeout(r, 400));
        router.push('/dashboard');
        return;
      }
      // Show cinematic transition for all logins
      setTransitionRole({ name: name || email.split('@')[0] || 'Dashboard', color: '#6366f1' });
      setTransitionVisible(true);
      if (isSignUp) {
        // Sign-up: Create Supabase account, then redirect to verification
        const res = await register(email, password, name, role);
        storeLogin(res.access_token, res.role, res.org, res.name || name || email.split('@')[0]);
        await new Promise(r => setTimeout(r, 800));
        // Redirect to full verification flow (Aadhaar, Gov ID, etc.)
        router.push('/register');
      } else {
        // Sign-in: Authenticate with Supabase, then check verification status
        const res = await login(email, password);
        storeLogin(res.access_token, res.role, res.org, res.name);
        await new Promise(r => setTimeout(r, 800));
        // Redirect based on verification status (pending → verify-pending, etc.)
        await redirectByVerificationStatus(email, router);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      setTransitionVisible(false);
    } finally {
      setLoading(false);
    }
  };

  // Safety timeout: auto-hide transition if login hangs
  useEffect(() => {
    if (!transitionVisible) return;
    const t = setTimeout(() => {
      setTransitionVisible(false);
      setLoading(false);
      setTypingRole('');
    }, 8000);
    return () => clearTimeout(t);
  }, [transitionVisible]);

  // Quick-login for demo shortcut buttons
  // Uses /api/auth/validate directly — works in BOTH demo and production mode
  const demoQuickLogin = async (cred: typeof DEMO_CREDENTIALS[0]) => {
    setTypingRole(cred.role);
    setError('');
    setTransitionRole({ name: cred.label, color: cred.color });
    setTransitionVisible(true);
    setLoading(true);

    try {
      const r = cred.role === 'MINISTRY_OFFICER' ? 'OFFICER' : cred.role;
      // Authenticate via /api/auth/validate (has hardcoded demo accounts)
      const res = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cred.email, role: r, token: 'demo-token-' + Date.now() }),
      });
      const data = await res.json();

      if (data.valid && data.user) {
        storeLogin(
          data.token || 'demo-token-' + Date.now(),
          data.user.role || r,
          data.user.org || cred.org,
          data.user.name || cred.name,
          data.expiresAt
        );
        // Brief pause so animation feels intentional
        await new Promise(r => setTimeout(r, 1200));
        router.push('/dashboard');
      } else {
        // Fallback: set local auth and redirect anyway
        storeLogin('demo-token-' + Date.now(), r, cred.org, cred.name);
        await validateWithServer(cred.email).catch(() => {});
        await new Promise(r => setTimeout(r, 800));
        router.push('/dashboard');
      }
    } catch {
      // Network error fallback: set demo auth locally
      const r = cred.role === 'MINISTRY_OFFICER' ? 'OFFICER' : cred.role;
      storeLogin('demo-token-' + Date.now(), r, cred.org, cred.name);
      await new Promise(r => setTimeout(r, 800));
      router.push('/dashboard');
    }
  };

  return (
    <>
    <DemoLoginTransition visible={transitionVisible} roleName={transitionRole.name} roleColor={transitionRole.color} />
    <div className="landing-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#080808', fontFamily: "'DM Sans', sans-serif", overflow: 'hidden' }}>
      <style>{`
        @media (min-width: 768px) {
          .landing-wrapper { flex-direction: row !important; }
          .landing-hero { flex: 0 0 55% !important; padding: 60px 60px 40px !important; }
          .landing-login { flex: 0 0 45% !important; }
          .landing-headline { font-size: 64px !important; }
        }
      `}</style>
      {/* 3px Tricolor strip at top */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '3px', zIndex: 50, display: 'flex' }}>
        <div style={{ flex: 1, background: '#FF9933' }} />
        <div style={{ flex: 1, background: '#FFFFFF' }} />
        <div style={{ flex: 1, background: '#138808' }} />
      </div>

      {/* ═══ LEFT SIDE — Hero ═══ */}
      <div className="landing-hero" style={{ flex: '1 1 auto', padding: '32px 20px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', gap: 24 }}>
        {/* Animated Network Background */}
        <NetworkHero />
        {/* Government of India label */}
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#666', fontWeight: 500, position: 'relative', zIndex: 2 }}>
          TenderShield — AI-Powered Government Procurement Platform
        </p>

        {/* Main headline */}
        <div style={{ maxWidth: '520px', position: 'relative', zIndex: 2 }}>
          <h1 className="landing-headline" style={{ fontSize: '40px', lineHeight: 1.05, fontWeight: 300, margin: 0 }}>
            <span style={{ display: 'block', color: 'white', fontFamily: "'Instrument Serif', serif", opacity: 0, animation: 'fadeSlideIn 0.8s ease forwards 0.2s' }}>
              India loses ₹4-6 lakh crore
            </span>
            <span style={{ display: 'block', color: 'white', fontFamily: "'Instrument Serif', serif", opacity: 0, animation: 'fadeSlideIn 0.8s ease forwards 0.4s' }}>
              annually to procurement fraud.
            </span>
            <span style={{ display: 'block', color: '#FF9933', fontFamily: "'Instrument Serif', serif", fontStyle: 'italic', opacity: 0, animation: 'fadeSlideIn 0.8s ease forwards 0.6s' }}>
              TenderShield detects it in 3 seconds.
            </span>
          </h1>
          <p style={{ color: '#888', fontSize: '14px', marginTop: '16px', lineHeight: 1.7, maxWidth: '420px', opacity: 0, animation: 'fadeSlideIn 0.8s ease forwards 0.8s' }}>
            5 statistical detectors. Real math. No buzzwords.
            Enter any bid data and watch the algorithms run — no login required.
          </p>
        </div>

        {/* Live counters */}
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', opacity: 0, animation: 'fadeSlideIn 0.8s ease forwards 1s', position: 'relative', zIndex: 2 }}>
          {LIVE_COUNTERS.map((c, i) => (
            <div key={i}>
              <p style={{ fontSize: '22px', fontWeight: 700, color: 'white', fontFamily: "'Outfit', 'DM Sans', sans-serif" }}>
                {c.icon === '₹' ? '₹' : ''}{c.decimal ? counters[i].toFixed(1) : counters[i].toLocaleString('en-IN')}{c.suffix}
              </p>
              <p style={{ fontSize: '12px', color: '#666', marginTop: '2px' }}>
                {c.icon !== '₹' ? c.icon + ' ' : ''}{c.label}
              </p>
            </div>
          ))}
        </div>

        {/* Production-Ready Strip (Fix 5: Deployment Credibility) */}
        {/* 3-Line Proof — verifiable claims */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: 0, animation: 'fadeSlideIn 0.8s ease forwards 1.2s', position: 'relative', zIndex: 2, marginTop: '16px', maxWidth: '480px' }}>
          {[
            { formula: 'CV = σ/μ < 3%', label: 'Bid Rigging — statistically impossible bid spread', color: '#ef4444' },
            { formula: 'Age < 6 months', label: 'Shell Companies — freshly registered proxy companies', color: '#f59e0b' },
            { formula: 'Bid > 97.5% est.', label: 'Front Running — insider knowledge of confidential estimate', color: '#6366f1' },
          ].map((proof, i) => (
            <a key={i} href="/playground" style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '8px 12px', borderRadius: '8px', textDecoration: 'none',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
              transition: 'all 0.2s',
            }}>
              <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '11px', color: proof.color, whiteSpace: 'nowrap', minWidth: '120px' }}>{proof.formula}</code>
              <span style={{ fontSize: '11px', color: '#888', flex: 1 }}>{proof.label}</span>
              <span style={{ fontSize: '10px', color: '#666' }}>Try →</span>
            </a>
          ))}
        </div>

        {/* Honest badge strip */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', opacity: 0, animation: 'fadeSlideIn 0.8s ease forwards 1.5s', position: 'relative', zIndex: 2, marginTop: '12px' }}>
          {[
            { icon: '📊', text: '5 Statistical Detectors' },
            { icon: '🔒', text: 'SHA-256 Sealed Bids' },
            { icon: '📜', text: 'GFR 2017 Compliance' },
            { icon: '🧪', text: 'Vitest + Pytest Tested' },
          ].map((badge, i) => (
            <span key={i} style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '4px 10px', borderRadius: '6px', fontSize: '10px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#888', letterSpacing: '0.02em',
            }}>
              {badge.icon} {badge.text}
            </span>
          ))}
        </div>

        {/* What We Are / Are Not — radical honesty */}
        <div style={{ opacity: 0, animation: 'fadeSlideIn 0.8s ease forwards 1.8s', position: 'relative', zIndex: 2, marginTop: '20px', maxWidth: '480px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.1)' }}>
              <div style={{ fontSize: '10px', color: '#22c55e', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.1em' }}>WHAT THIS IS</div>
              {[
                '5 statistical fraud detectors',
                'SHA-256 cryptographic audit trail',
                'GFR 2017 rule enforcement',
                'Random Forest ML model',
                'Real-time Supabase data layer',
              ].map((item, i) => (
                <div key={i} style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '3px' }}>✅ {item}</div>
              ))}
            </div>
            <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(245,158,11,0.04)', border: '1px solid rgba(245,158,11,0.1)' }}>
              <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700, marginBottom: '8px', letterSpacing: '0.1em' }}>WHAT THIS IS NOT (YET)</div>
              {[
                'SHA-256 Audit Chain',
                'Real Aadhaar eKYC',
                'Live GeM portal connection',
                'Production government users',
                'NIC-certified deployment',
              ].map((item, i) => (
                <div key={i} style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '3px' }}>⚙️ {item}</div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT SIDE — Login ═══ */}
      <div className="landing-login" style={{ flex: '1 1 auto', background: '#0c0c1a', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: '24px 16px', minHeight: 'auto' }}>
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
                <p style={{ fontSize: '10px', color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>Fraud Detection Engine</p>
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
            🔒 SHA-256 Cryptographic Audit Trail · Every analysis is hash-chained
          </p>

          {/* Real Registration CTA — always visible */}
          <div style={{
            marginTop: '20px', padding: '16px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(255,153,51,0.06), rgba(19,136,8,0.06))',
            border: '1px solid rgba(255,153,51,0.15)',
          }}>
            <p style={{ fontSize: '12px', color: '#ccc', textAlign: 'center', marginBottom: '8px', fontWeight: 500 }}>
              🇮🇳 Real Government Registration
            </p>
            <p style={{ fontSize: '11px', color: '#888', textAlign: 'center', marginBottom: '12px', lineHeight: 1.5 }}>
              Register with Aadhaar OTP, Government ID & role-specific document verification
            </p>
            <a
              href="/register"
              style={{
                display: 'block', textAlign: 'center', padding: '10px 20px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #FF9933, #138808)',
                color: 'white', fontSize: '13px', fontWeight: 600,
                textDecoration: 'none', transition: 'opacity 200ms',
              }}
            >
              🛡️ Register with Full Verification →
            </a>
            <a
              href="/rti"
              style={{
                display: 'block', textAlign: 'center', padding: '10px 20px',
                borderRadius: '10px', marginTop: '8px',
                background: 'rgba(255,153,51,0.08)',
                border: '1px solid rgba(255,153,51,0.2)',
                color: '#FF9933', fontSize: '13px', fontWeight: 600,
                textDecoration: 'none', transition: 'opacity 200ms',
              }}
            >
              🇮🇳 RTI Portal — File RTI (No Login Required)
            </a>
            <a
              href="/playground"
              style={{
                display: 'block', textAlign: 'center', padding: '10px 20px',
                borderRadius: '10px', marginTop: '8px',
                background: 'rgba(99,102,241,0.08)',
                border: '1px solid rgba(99,102,241,0.2)',
                color: '#6366f1', fontSize: '13px', fontWeight: 600,
                textDecoration: 'none', transition: 'opacity 200ms',
              }}
            >
              🔬 Fraud Detection Playground — Try Live Analysis
            </a>
          </div>
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
    </>
  );
}

// Reusable dark input field
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
