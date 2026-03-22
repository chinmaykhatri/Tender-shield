'use client';

export default function PolicyPage() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a' }}>
      {/* Tricolor */}
      <div style={{ display: 'flex', height: '4px' }}>
        <div style={{ flex: 1, background: '#FF9933' }} />
        <div style={{ flex: 1, background: '#fff' }} />
        <div style={{ flex: 1, background: '#138808' }} />
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 8px', background: 'linear-gradient(135deg, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            📜 Policy Impact — GFR 2017 Amendment
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
            From optional tool → mandatory national infrastructure
          </p>
        </div>

        {/* Current State */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '28px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: '#fbbf24' }}>📍 Current State</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
            <p>• TenderShield today: <strong style={{ color: '#fbbf24' }}>optional tool</strong></p>
            <p>• Impact: Protects only tenders that use it</p>
            <p>• Coverage: Limited to participating ministries</p>
          </div>
        </div>

        {/* Proposed Amendment */}
        <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)', borderRadius: '20px', padding: '28px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: '#22c55e' }}>📋 Proposed GFR 2017 Amendment</h2>
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '12px', padding: '20px', fontFamily: 'Georgia, serif', fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.8, borderLeft: '3px solid #22c55e' }}>
            <p style={{ fontWeight: 600, marginBottom: '8px', color: '#22c55e' }}>GFR 2017 Rule 144 — Proposed Amendment:</p>
            <p>&ldquo;All procurement above ₹10 lakh must receive an AI risk assessment before tender publication. Tenders with risk score above 80 require dual-party approval before award, with written justification recorded on an immutable audit trail.&rdquo;</p>
          </div>
        </div>

        {/* Scale of Impact */}
        <div style={{ background: 'rgba(168,139,250,0.06)', border: '1px solid rgba(168,139,250,0.15)', borderRadius: '20px', padding: '28px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px', color: '#a78bfa' }}>📊 Scale of Impact</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {[
              { label: 'Annual Procurement', value: '₹45 Lakh Crore', sub: 'Government of India' },
              { label: 'Estimated Fraud', value: '₹4,500 Crore', sub: 'At 1% leakage rate' },
              { label: 'If 10% Goes Through TenderShield', value: '₹45,000 Crore', sub: 'Fraud prevention potential' },
              { label: 'Equivalent To', value: '2,26,130 Schools', sub: 'That can be built instead' },
            ].map((stat, i) => (
              <div key={i} style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '14px', padding: '18px', textAlign: 'center' }}>
                <p style={{ fontSize: '22px', fontWeight: 800, color: '#a78bfa' }}>{stat.value}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>{stat.label}</p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Approval Path */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '28px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>🏛️ Approval Path</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {[
              { step: 1, label: 'MeitY Recommendation', desc: 'Based on Blockchain India Challenge results', status: 'IN_PROGRESS' },
              { step: 2, label: 'Finance Ministry Approval', desc: 'Budget allocation and policy clearance', status: 'PENDING' },
              { step: 3, label: 'GFR 2017 Amendment', desc: 'Rule 144 amendment for mandatory AI assessment', status: 'PENDING' },
              { step: 4, label: 'NIC Deployment', desc: 'Integration with existing NIC procurement platforms', status: 'PENDING' },
              { step: 5, label: 'National Rollout', desc: 'Mandatory for all central government procurement', status: 'PENDING' },
            ].map((s) => (
              <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', borderRadius: '12px', background: s.status === 'IN_PROGRESS' ? 'rgba(168,139,250,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${s.status === 'IN_PROGRESS' ? 'rgba(168,139,250,0.15)' : 'rgba(255,255,255,0.04)'}` }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: s.status === 'IN_PROGRESS' ? 'rgba(168,139,250,0.2)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: s.status === 'IN_PROGRESS' ? '#a78bfa' : 'rgba(255,255,255,0.3)' }}>
                  {s.step}
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: s.status === 'IN_PROGRESS' ? '#a78bfa' : 'rgba(255,255,255,0.7)' }}>{s.label}</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Precedent */}
        <div style={{ background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: '20px', padding: '28px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: '#3b82f6' }}>📚 Precedent: GeM Success Story</h2>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
            <strong style={{ color: '#3b82f6' }}>GeM was optional in 2016. Mandatory in 2020.</strong> Now it handles 
            <strong style={{ color: '#3b82f6' }}> ₹4 lakh crore annually</strong>. TenderShield follows the same path — from innovation to infrastructure.
          </p>
        </div>

        {/* Pitch Quote */}
        <div style={{ background: 'linear-gradient(135deg, rgba(168,139,250,0.1), rgba(129,140,248,0.1))', border: '1px solid rgba(168,139,250,0.2)', borderRadius: '20px', padding: '32px', textAlign: 'center' }}>
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', lineHeight: 1.8, fontStyle: 'italic' }}>
            &ldquo;Without policy mandate, TenderShield is an optional tool that protects some tenders. With a GFR 2017 amendment requiring risk scoring for all tenders above ₹10 lakh, TenderShield becomes <strong style={{ color: '#a78bfa' }}>national infrastructure</strong> protecting <strong style={{ color: '#22c55e' }}>₹45 lakh crore</strong> of public money every year.&rdquo;
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '12px' }}>
            That is not a student project. That is a governance transformation.
          </p>
        </div>
      </div>
    </div>
  );
}
