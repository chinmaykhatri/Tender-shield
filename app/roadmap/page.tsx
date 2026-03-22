'use client';

export default function RoadmapPage() {
  const phases = [
    {
      title: 'Phase 1 — Foundation',
      period: 'Q1 2025',
      status: 'COMPLETE',
      color: '#22c55e',
      items: [
        'AI-powered fraud detection (5 detectors)',
        'Zero-Knowledge sealed bidding (Pedersen Commitments)',
        'Hyperledger Fabric audit trail',
        '3-tier registration with Aadhaar + GSTIN + PAN verification',
        'Auto-lock enforcement on high-risk tenders',
        'Officer accountability scorecards',
        'Public transparency portal',
        'Anonymous whistleblower engine',
      ],
    },
    {
      title: 'Phase 2 — Adaptive Intelligence',
      period: 'Q3 2025',
      status: 'PLANNED',
      color: '#a78bfa',
      items: [
        'Randomized detection thresholds — cartels cannot know current CV threshold (2-5% range)',
        'Behavioral learning — model trains on every tender outcome',
        'Anti-gaming checksum — clustering at detection boundary becomes a signal',
        'Cross-ministry pattern correlation — detect multi-ministry cartel operations',
        'Real-time GSTIN monitoring — detect newly registered shell entities',
      ],
    },
    {
      title: 'Phase 3 — Financial Intelligence',
      period: 'Q1 2026',
      status: 'PLANNED',
      color: '#3b82f6',
      items: [
        'PFMS API integration — track government-to-contractor money flow',
        'Politically Exposed Persons (PEP) database cross-referencing',
        'Subcontractor chain analysis — detect pass-through entities',
        'Real-time payment anomaly detection',
        'RBI API integration for high-value transaction monitoring',
      ],
    },
    {
      title: 'Phase 4 — National Scale',
      period: 'Q3 2026',
      status: 'VISION',
      color: '#f97316',
      items: [
        'GFR 2017 amendment — mandatory risk scoring for all ₹10L+ tenders',
        'GeM platform integration',
        'State government procurement portal integration',
        'Multi-language support (Hindi, Tamil, Bengali, + 12 more)',
        'Mobile app for field auditors',
        'National risk score dashboard for CAG headquarters',
      ],
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 8px', background: 'linear-gradient(135deg, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🛡️ TenderShield Roadmap
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
            From detection tool → enforcement mechanism → national infrastructure
          </p>
        </div>

        {/* Adaptive AI Feature Detail */}
        <div style={{ background: 'rgba(168,139,250,0.06)', border: '1px solid rgba(168,139,250,0.15)', borderRadius: '20px', padding: '28px', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#a78bfa', marginBottom: '12px' }}>
            🧠 Adaptive AI — Why Static Thresholds Fail
          </h2>
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#f87171', marginBottom: '6px' }}>The Problem</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
              Cartels study detection systems and adapt. If they know the threshold is CV &lt; 3%, they submit bids at CV = 3.1% — just above it. Static rules are gameable.
            </p>
          </div>
          <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#22c55e', marginBottom: '6px' }}>TenderShield Phase 2 Solution</p>
            <ul style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, paddingLeft: '18px', margin: 0 }}>
              <li><strong style={{ color: '#22c55e' }}>Randomized thresholds</strong> — CV threshold changes unpredictably (2-5%). Cartels cannot know current threshold.</li>
              <li><strong style={{ color: '#22c55e' }}>Behavioral learning</strong> — model trains on every tender outcome. When a &quot;clean&quot; tender is later confirmed fraud, all similar patterns get higher weights automatically.</li>
              <li><strong style={{ color: '#22c55e' }}>Anti-gaming checksum</strong> — if 3 bids cluster exactly at the detection boundary, that clustering itself becomes a fraud signal.</li>
            </ul>
          </div>
        </div>

        {/* Timeline */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: '20px', top: 0, bottom: 0, width: '2px', background: 'rgba(255,255,255,0.06)' }} />

          {phases.map((phase, i) => (
            <div key={i} style={{ position: 'relative', paddingLeft: '52px', marginBottom: '32px' }}>
              <div style={{ position: 'absolute', left: '12px', top: '4px', width: '18px', height: '18px', borderRadius: '50%', background: phase.status === 'COMPLETE' ? phase.color : 'transparent', border: `2px solid ${phase.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                {phase.status === 'COMPLETE' && '✓'}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: phase.color, margin: 0 }}>{phase.title}</h3>
                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: `${phase.color}15`, color: phase.color, fontWeight: 600 }}>
                  {phase.period}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {phase.items.map((item, j) => (
                  <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                    <span style={{ color: phase.color, marginTop: '2px' }}>
                      {phase.status === 'COMPLETE' ? '✓' : '○'}
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
