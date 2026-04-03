// FILE: app/pitch/page.tsx
// PURPOSE: Competition pitch deck — judges see the full narrative
// Problem → Solution → Tech → Demo → Impact

'use client';

import Link from 'next/link';

const PROBLEM_STATS = [
  { value: '₹4-6L Cr', label: 'Annual procurement fraud', source: 'CAG Report 2023' },
  { value: '32%', label: 'Tenders with bid anomalies', source: 'CVC Study 2022' },
  { value: '0', label: 'AI systems deployed at scale', source: 'Current state' },
  { value: '180+ days', label: 'Average fraud detection time', source: 'Manual audit lag' },
];

const SOLUTION_POINTS = [
  { icon: '⛓️', title: 'Hyperledger Fabric', detail: 'Every tender state change is immutable. 4-org consensus ensures no single point of corruption.' },
  { icon: '🔐', title: 'Cryptographic Commitments', detail: 'SHA-256 commitment scheme hides bid amounts cryptographically — verified without revealing values until deadline.' },
  { icon: '🤖', title: 'AI Fraud Detection', detail: '5 detectors analyze every bid in <3 seconds. Shell companies, bid rigging, cartel rotation — caught in real-time.' },
  { icon: '❄️', title: 'Auto-Freeze Engine', detail: 'Risk > 85/100 → tender frozen automatically on-chain. No human delay. CAG notified instantly.' },
];

const IMPACT_METRICS = [
  { before: '180+ days', after: '<3 seconds', label: 'Fraud detection time' },
  { before: '₹4-6L Cr/yr', after: '₹0', label: 'Target: fraud losses' },
  { before: 'Manual', after: 'AI + Blockchain', label: 'Audit mechanism' },
  { before: '0%', after: '100%', label: 'Tender immutability' },
];

const DIFFERENTIATORS = [
  { icon: '🇮🇳', text: 'India-first: Aadhaar eKYC, GSTIN, GFR 2017, GeM integration' },
  { icon: '🔒', text: 'Non-crypto blockchain (Hyperledger) — MeitY compliant' },
  { icon: '🧠', text: 'Constitutional AI with safety logging — no hallucinated accusations' },
  { icon: '📋', text: 'GFR Rule 149/166 auto-validation on every tender' },
  { icon: '🌍', text: 'Works offline-first with sync — for rural government offices' },
  { icon: '🛡️', text: 'Aadhaar Act §29 compliant — only last 4 digits stored' },
];

export default function PitchPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080818', padding: '40px 20px', fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        
        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: '48px', paddingTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: 'rgba(255,153,51,0.1)', color: '#FF9933' }}>MeitY + C-DAC</span>
            <span style={{ padding: '4px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 700, background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>e-Procurement Track</span>
          </div>
          <h1 style={{ fontSize: '52px', fontWeight: 700, color: 'white', fontFamily: "'Outfit', 'Rajdhani', sans-serif", lineHeight: 1.1 }}>
            <span style={{ color: '#FF9933' }}>Tender</span>Shield
          </h1>
          <p style={{ fontSize: '20px', color: '#888', marginTop: '12px', fontStyle: 'italic' }}>
            AI + Blockchain = Zero Fraud in Government Procurement
          </p>
          <p style={{ fontSize: '13px', color: '#555', marginTop: '8px' }}>
            Blockchain India Challenge 2026 · MVP Submission
          </p>
        </div>

        {/* === SLIDE 1: The Problem === */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', color: '#ef4444', textTransform: 'uppercase', marginBottom: '16px' }}>
            ⚠️ The Problem
          </h2>
          <h3 style={{ fontSize: '28px', fontWeight: 700, color: 'white', marginBottom: '20px', lineHeight: 1.3 }}>
            India loses <span style={{ color: '#ef4444' }}>₹4-6 Lakh Crore</span> annually to procurement fraud.
            <br />Current systems catch it <span style={{ color: '#f59e0b' }}>6+ months later</span> — if at all.
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {PROBLEM_STATS.map((s, i) => (
              <div key={i} style={{
                padding: '20px', borderRadius: '14px', textAlign: 'center',
                background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.1)',
              }}>
                <p style={{ fontSize: '28px', fontWeight: 700, color: '#f87171', fontFamily: "'Rajdhani', sans-serif" }}>{s.value}</p>
                <p style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{s.label}</p>
                <p style={{ fontSize: '9px', color: '#555', marginTop: '4px' }}>{s.source}</p>
              </div>
            ))}
          </div>
        </section>

        {/* === SLIDE 2: The Solution === */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', color: '#22c55e', textTransform: 'uppercase', marginBottom: '16px' }}>
            ✅ Our Solution
          </h2>
          <h3 style={{ fontSize: '28px', fontWeight: 700, color: 'white', marginBottom: '20px', lineHeight: 1.3 }}>
            Real-time fraud detection powered by <span style={{ color: '#6366f1' }}>AI</span> +{' '}
            <span style={{ color: '#3b82f6' }}>Blockchain</span> +{' '}
            <span style={{ color: '#8b5cf6' }}>Zero-Knowledge Proofs</span>
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            {SOLUTION_POINTS.map((s, i) => (
              <div key={i} style={{
                padding: '20px', borderRadius: '14px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex', gap: '14px',
              }}>
                <span style={{ fontSize: '28px' }}>{s.icon}</span>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>{s.title}</p>
                  <p style={{ fontSize: '12px', color: '#888', marginTop: '4px', lineHeight: 1.5 }}>{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* === SLIDE 3: Impact === */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', color: '#6366f1', textTransform: 'uppercase', marginBottom: '16px' }}>
            📊 Impact
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {IMPACT_METRICS.map((m, i) => (
              <div key={i} style={{
                padding: '20px', borderRadius: '14px', textAlign: 'center',
                background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)',
              }}>
                <p style={{ fontSize: '12px', color: '#ef4444', textDecoration: 'line-through', marginBottom: '4px' }}>{m.before}</p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: '#4ade80', fontFamily: "'Rajdhani', sans-serif" }}>{m.after}</p>
                <p style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>{m.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* === SLIDE 4: Why Us === */}
        <section style={{ marginBottom: '48px' }}>
          <h2 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.2em', color: '#f59e0b', textTransform: 'uppercase', marginBottom: '16px' }}>
            🏆 Why TenderShield Wins
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
            {DIFFERENTIATORS.map((d, i) => (
              <div key={i} style={{
                padding: '14px 18px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                display: 'flex', gap: '10px', alignItems: 'center',
              }}>
                <span style={{ fontSize: '18px' }}>{d.icon}</span>
                <p style={{ fontSize: '13px', color: '#ccc' }}>{d.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div style={{
          textAlign: 'center', padding: '32px', borderRadius: '16px', marginBottom: '48px',
          background: 'linear-gradient(135deg, rgba(255,153,51,0.06), rgba(99,102,241,0.06))',
          border: '1px solid rgba(255,153,51,0.15)',
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '12px' }}>
            See It Live
          </h2>
          <p style={{ color: '#888', fontSize: '14px', marginBottom: '20px' }}>
            Watch a ₹120 Crore fraud get detected and frozen in under 15 seconds
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            <Link href="/demo" style={{
              padding: '14px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: 700,
              background: 'linear-gradient(135deg, #FF9933, #6366f1)', color: 'white',
              textDecoration: 'none', display: 'inline-block',
              boxShadow: '0 4px 24px rgba(99,102,241,0.3)',
            }}>▶️ Run Live Demo</Link>
            <Link href="/architecture" style={{
              padding: '14px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: 600,
              border: '1px solid rgba(255,255,255,0.15)', color: '#ccc',
              textDecoration: 'none', display: 'inline-block',
            }}>🏗️ Architecture</Link>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingBottom: '40px' }}>
          <p style={{ fontSize: '12px', color: '#555' }}>
            Built for 🇮🇳 India · Hyperledger Fabric · GFR 2017 Compliant · Aadhaar Act §29 Privacy · Constitutional AI Safety
          </p>
        </div>
      </div>
    </div>
  );
}
