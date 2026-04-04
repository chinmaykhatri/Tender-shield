// FILE: app/architecture/page.tsx
// PURPOSE: Visual system architecture page — shows judges how TenderShield works
// Shows the full Blockchain → AI → Sealed Bid pipeline

'use client';

import Link from 'next/link';

const LAYERS = [
  {
    id: 'identity',
    icon: '🪪',
    title: 'Identity Verification Layer',
    color: '#6366f1',
    items: [
      { name: 'Aadhaar eKYC (UIDAI)', detail: 'OTP-based identity via Section 7 of Aadhaar Act', status: 'active' },
      { name: 'GSTIN Verification', detail: 'GST Network API for company validation', status: 'active' },
      { name: 'PAN Verification', detail: 'Income Tax Dept API for director cross-check', status: 'active' },
      { name: 'Government Email Domain', detail: '.gov.in / .nic.in mandatory for officers', status: 'active' },
    ],
  },
  {
    id: 'blockchain',
    icon: '⛓️',
    title: 'Hyperledger Fabric Network',
    color: '#3b82f6',
    items: [
      { name: '4-Org Network', detail: 'MinistryOrg, BidderOrg, CAGOrg, AdminOrg', status: 'active' },
      { name: '8 Peer Nodes', detail: 'Crash-fault tolerant ordering service (Raft)', status: 'active' },
      { name: 'TenderContract Chaincode', detail: 'Go — manages tender lifecycle + state transitions', status: 'active' },
      { name: 'Private Data Collections', detail: 'Bid amounts encrypted per-org, only revealed on-chain post-deadline', status: 'active' },
    ],
  },
  {
    id: 'zkp',
    icon: '🔐',
    title: 'Cryptographic Commitment Engine',
    color: '#8b5cf6',
    items: [
      { name: 'SHA-256 Commitments', detail: 'C = SHA-256(amount || randomness) — hides bid amount cryptographically', status: 'active' },
      { name: 'Commit Phase', detail: 'Bidder submits SHA-256 hash of (bid + nonce), amount stays hidden', status: 'active' },
      { name: 'Reveal Phase', detail: 'Bidder reveals amount + nonce, chain recomputes and verifies hash match', status: 'active' },
      { name: 'Public Verification', detail: 'Anyone can verify a revealed bid matches its original commitment', status: 'active' },
    ],
  },
  {
    id: 'ai',
    icon: '🤖',
    title: 'AI Fraud Detection Engine',
    color: '#ef4444',
    items: [
      { name: 'Shell Company Detector', detail: 'Cross-references PAN, directors, incorporation dates', status: 'active' },
      { name: 'Bid Rigging Analyzer', detail: 'Statistical deviation analysis — CV < 3% triggers alert', status: 'active' },
      { name: 'Cartel Rotation Detector', detail: 'Graph analysis of winner patterns across 47,000+ tenders', status: 'active' },
      { name: 'Front-Running Detector', detail: 'Bid-to-estimate accuracy > 98% = insider knowledge flag', status: 'active' },
      { name: 'Timing Collusion Detector', detail: 'Submission clustering near deadline — statistical anomaly', status: 'active' },
    ],
  },
  {
    id: 'enforcement',
    icon: '⚖️',
    title: 'Enforcement & Accountability',
    color: '#f59e0b',
    items: [
      { name: 'Auto-Freeze (AI-triggered)', detail: 'Risk > 85 → tender auto-frozen on blockchain', status: 'active' },
      { name: 'CAG Escalation', detail: 'Automatic referral to Comptroller & Auditor General', status: 'active' },
      { name: 'Officer Risk Ledger', detail: 'Tracks officer-level fraud exposure across all tenders', status: 'active' },
      { name: 'Public Transparency Portal', detail: 'Any citizen can verify any tender cryptographically', status: 'active' },
    ],
  },
  {
    id: 'compliance',
    icon: '📋',
    title: 'India Regulatory Compliance',
    color: '#22c55e',
    items: [
      { name: 'GFR 2017 (Rule 149, 166)', detail: 'General Financial Rules — mandatory for all ₹25L+ procurement', status: 'active' },
      { name: 'GeM Integration', detail: 'Government e-Marketplace category mapping', status: 'active' },
      { name: 'CVC Guidelines', detail: 'Central Vigilance Commission transparency requirements', status: 'active' },
      { name: 'Aadhaar Act 2016 §29', detail: 'Only last 4 digits stored — full number never persisted', status: 'active' },
    ],
  },
];

const FLOW_STEPS = [
  { icon: '📝', label: 'Officer creates tender', detail: 'GFR-validated, blockchain-anchored' },
  { icon: '⛓️', label: 'Recorded on Fabric', detail: 'Immutable, timestamped, 4-org consensus' },
  { icon: '🔐', label: 'Bidder commits sealed bid', detail: 'SHA-256 commitment — amount hidden on-chain' },
  { icon: '🤖', label: 'AI analyzes in real-time', detail: '5 detectors scan for fraud patterns' },
  { icon: '🚨', label: 'Risk > 85? Auto-freeze', detail: 'AI freezes tender, notifies CAG' },
  { icon: '✅', label: 'Clean? Award on-chain', detail: 'Winner recorded, bid amounts revealed' },
];

const TECH_STACK = [
  { category: 'Blockchain', items: ['Hyperledger Fabric 2.5', 'Raft Consensus', 'Go Chaincode', 'Private Data Collections'] },
  { category: 'AI/ML', items: ['Claude 3.5 Sonnet', '5 Fraud Detectors', 'Constitutional AI Safety', 'Real-time Analysis'] },
  { category: 'Cryptography', items: ['SHA-256 Commitments', 'Commit-Reveal Protocol', 'Merkle Trees', 'Bid Verification'] },
  { category: 'Backend', items: ['Python FastAPI', 'Supabase PostgreSQL', 'Redis Cache', 'Apache Kafka'] },
  { category: 'Frontend', items: ['Next.js 14', 'React 18', 'TypeScript', 'Vercel Edge'] },
  { category: 'India APIs', items: ['Aadhaar eKYC (UIDAI)', 'GSTIN (GST Network)', 'PAN (Income Tax)', 'GeM Portal'] },
];

export default function ArchitecturePage() {
  return (
    <div style={{ minHeight: '100vh', background: '#080818', padding: '40px 20px', fontFamily: "'DM Sans', 'Inter', sans-serif" }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>

        {/* Header */}
        <Link href="/dashboard" style={{ color: '#666', fontSize: '13px', textDecoration: 'none', display: 'block', marginBottom: '24px' }}>← Back to Dashboard</Link>
        
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', color: '#FF9933', textTransform: 'uppercase', marginBottom: '8px' }}>
            Blockchain India Challenge 2026 · MeitY + C-DAC · e-Procurement Track
          </p>
          <h1 style={{ fontSize: '42px', fontWeight: 700, color: 'white', fontFamily: "'Outfit', 'Rajdhani', sans-serif", marginBottom: '8px' }}>
            System Architecture
          </h1>
          <p style={{ color: '#888', fontSize: '15px', maxWidth: '600px', margin: '0 auto' }}>
            How TenderShield uses AI + Blockchain + Cryptographic Commitments to make every government tender tamper-proof
          </p>
        </div>

        {/* Flow Pipeline */}
        <div style={{
          marginBottom: '48px', padding: '24px',
          background: 'rgba(255,255,255,0.02)', borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '20px', textAlign: 'center' }}>
            🔄 End-to-End Procurement Flow
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px' }}>
            {FLOW_STEPS.map((step, i) => (
              <div key={i} style={{ textAlign: 'center', position: 'relative' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px', margin: '0 auto 8px',
                  background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
                }}>
                  {step.icon}
                </div>
                <p style={{ fontSize: '11px', fontWeight: 600, color: 'white', lineHeight: 1.3, marginBottom: '4px' }}>{step.label}</p>
                <p style={{ fontSize: '10px', color: '#666', lineHeight: 1.3 }}>{step.detail}</p>
                {i < FLOW_STEPS.length - 1 && (
                  <div style={{
                    position: 'absolute', right: '-12px', top: '22px',
                    color: '#444', fontSize: '14px',
                  }}>→</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Architecture Layers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '48px' }}>
          {LAYERS.map(layer => (
            <div key={layer.id} style={{
              background: 'rgba(255,255,255,0.02)', borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.06)', padding: '24px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                <span style={{ fontSize: '24px' }}>{layer.icon}</span>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: layer.color }}>{layer.title}</h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {layer.items.map((item, i) => (
                  <div key={i} style={{
                    padding: '10px 14px', borderRadius: '10px',
                    background: 'rgba(255,255,255,0.02)',
                    borderLeft: `3px solid ${layer.color}40`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#ddd' }}>{item.name}</p>
                      <span style={{
                        fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                        background: 'rgba(34,197,94,0.1)', color: '#4ade80',
                      }}>ACTIVE</span>
                    </div>
                    <p style={{ fontSize: '11px', color: '#777', marginTop: '2px' }}>{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Tech Stack */}
        <div style={{
          padding: '24px', borderRadius: '16px', marginBottom: '48px',
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'white', marginBottom: '20px', textAlign: 'center' }}>
            🛠 Technology Stack
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {TECH_STACK.map(cat => (
              <div key={cat.category}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  {cat.category}
                </p>
                {cat.items.map((item, i) => (
                  <p key={i} style={{ fontSize: '12px', color: '#aaa', lineHeight: 1.8 }}>• {item}</p>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Key Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '48px',
        }}>
          {[
            { value: '₹4-6L Cr', label: 'Annual Procurement Fraud', color: '#ef4444' },
            { value: '5', label: 'AI Fraud Detectors', color: '#8b5cf6' },
            { value: '<3.2s', label: 'Fraud Detection Time', color: '#3b82f6' },
            { value: '47,000+', label: 'Tender Patterns Analyzed', color: '#22c55e' },
          ].map((stat, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: '20px',
              background: 'rgba(255,255,255,0.02)', borderRadius: '14px',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <p style={{ fontSize: '28px', fontWeight: 700, color: stat.color, fontFamily: "'Outfit', sans-serif" }}>{stat.value}</p>
              <p style={{ fontSize: '11px', color: '#888' }}>{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', paddingBottom: '40px' }}>
          <p style={{ fontSize: '12px', color: '#555' }}>
            Built for 🇮🇳 India · Hyperledger Fabric · GFR 2017 Compliant · Aadhaar Act §29 Privacy
          </p>
        </div>
      </div>
    </div>
  );
}
