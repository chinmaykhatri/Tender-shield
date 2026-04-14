'use client';

export default function RoadmapPage() {
  const phases = [
    {
      title: 'Phase 1 — Foundation',
      period: 'Q1 2025',
      status: 'COMPLETE',
      color: '#22c55e',
      items: [
        { text: 'AI-powered fraud detection (6 statistical detectors)', done: true },
        { text: 'Zero-Knowledge sealed bidding (SHA-256 Hash Commitments)', done: true },
        { text: 'SHA-256 hash chain audit trail (Hyperledger Fabric-ready)', done: true },
        { text: '3-tier registration with Aadhaar + GSTIN + PAN verification (demo)', done: true },
        { text: 'Auto-lock enforcement on high-risk tenders', done: true },
        { text: 'Officer accountability scorecards', done: true },
        { text: 'Public transparency portal', done: true },
        { text: 'Anonymous whistleblower engine (UI)', done: true },
      ],
    },
    {
      title: 'Phase 2 — Adaptive Intelligence',
      period: 'Q3 2025',
      status: 'COMPLETE',
      color: '#a78bfa',
      items: [
        { text: 'HMAC-SHA256 dynamic thresholds — per-tender unpredictable CV range [2-5%]', done: true },
        { text: 'Boundary gaming meta-detector — clustering at detection boundary IS a signal', done: true },
        { text: 'Cross-ministry pattern correlation — detect multi-ministry cartel operations', done: true },
        { text: 'GFR 2017 compliance engine — 7 rules as executable code (Rules 149-177)', done: true },
        { text: '6-language i18n — EN, HI, TA, BN, TE, MR (80 keys per language)', done: true },
        { text: 'Live fraud playground — 5 scenarios, 6 detectors, public access, no login', done: true },
        { text: 'D3.js shell company network graph — director cross-referencing', done: true },
        { text: 'Paillier homomorphic encryption (64-bit demo, 2048-bit production target)', done: true },
        { text: 'Federated learning simulation — FedAvg visualization across 5 ministry nodes', done: true },
        { text: 'Gemini RAG AI analyst chatbot — natural language procurement queries', done: true },
        { text: 'CAG national risk dashboard — state heatmap, ministry scores, top-5 risky', done: true },
        { text: 'RTI portal — public information request UI', done: true },
        { text: 'Impact dashboard — savings & prosecution metrics', done: true },
        { text: 'Behavioral learning pipeline — JSONL ground truth store (cold-start, needs 50+ labels)', done: false, partial: true },
        { text: 'Real-time GSTIN monitoring — shell company detection exists, live API pending', done: false, partial: true },
      ],
    },
    {
      title: 'Phase 3 — Financial Intelligence',
      period: 'Q1 2026',
      status: 'IN_PROGRESS',
      color: '#3b82f6',
      items: [
        { text: 'PFMS API integration — track government-to-contractor money flow', done: false },
        { text: 'Politically Exposed Persons (PEP) database cross-referencing', done: false },
        { text: 'Subcontractor chain analysis — detect pass-through entities', done: false },
        { text: 'Real-time payment anomaly detection', done: false },
        { text: 'RBI API integration for high-value transaction monitoring', done: false },
        { text: 'Hyperledger Fabric single-node deployment — migrate from hash chain to Fabric', done: false },
        { text: 'KYC verification — PAN/GSTIN via real API (currently demo mock)', done: false },
        { text: 'ML model retraining on real procurement data (currently synthetic)', done: false },
        { text: 'Paillier upgrade to 2048-bit keys with HSM integration', done: false },
      ],
    },
    {
      title: 'Phase 4 — National Scale',
      period: 'Q3 2026',
      status: 'VISION',
      color: '#f97316',
      items: [
        { text: 'GFR 2017 amendment — mandatory risk scoring for all ₹10L+ tenders', done: false },
        { text: 'GeM/CPPP platform integration — live data pipeline', done: false },
        { text: 'State government procurement portal integration (30 states)', done: false },
        { text: 'Multi-language expansion — add 12 more languages beyond current 6', done: false },
        { text: 'Mobile app for field auditors', done: false },
        { text: 'NIC Cloud deployment + STQC certification', done: false },
        { text: 'Federated learning backend — real distributed training with PyTorch', done: false },
        { text: 'CAG partnership — real officer label collection for data moat', done: false },
      ],
    },
  ];

  const totalItems = phases.reduce((sum, p) => sum + p.items.length, 0);
  const doneItems = phases.reduce((sum, p) => sum + p.items.filter(i => i.done).length, 0);
  const partialItems = phases.reduce((sum, p) => sum + p.items.filter(i => (i as any).partial).length, 0);
  const progressPct = Math.round(((doneItems + partialItems * 0.5) / totalItems) * 100);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 8px', background: 'linear-gradient(135deg, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            TenderShield Roadmap
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: '0 0 20px' }}>
            From detection tool → enforcement mechanism → national infrastructure
          </p>

          {/* Overall progress bar */}
          <div style={{ maxWidth: '400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px' }}>
              <span style={{ color: '#94a3b8' }}>{doneItems} of {totalItems} features shipped</span>
              <span style={{ color: '#a78bfa', fontWeight: 700 }}>{progressPct}%</span>
            </div>
            <div style={{ height: '6px', borderRadius: '3px', background: 'rgba(255,255,255,0.06)' }}>
              <div style={{ height: '100%', borderRadius: '3px', width: `${progressPct}%`, background: 'linear-gradient(90deg, #22c55e, #a78bfa)', transition: 'width 1s ease' }} />
            </div>
          </div>
        </div>

        {/* Adaptive AI Feature Detail */}
        <div style={{ background: 'rgba(168,139,250,0.06)', border: '1px solid rgba(168,139,250,0.15)', borderRadius: '20px', padding: '28px', marginBottom: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#a78bfa', marginBottom: '12px' }}>
            Adaptive AI — Why Static Thresholds Fail
          </h2>
          <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#f87171', marginBottom: '6px' }}>The Problem</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
              Cartels study detection systems and adapt. If they know the threshold is CV &lt; 3%, they submit bids at CV = 3.1% — just above it. Static rules are gameable.
            </p>
          </div>
          <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.12)', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: '#22c55e', marginBottom: '6px' }}>TenderShield Solution — SHIPPED ✓</p>
            <ul style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, paddingLeft: '18px', margin: 0 }}>
              <li><strong style={{ color: '#22c55e' }}>HMAC-SHA256 dynamic thresholds</strong> — CV threshold changes unpredictably per tender (2-5%). Cartels cannot predict which value applies.</li>
              <li><strong style={{ color: '#22c55e' }}>Boundary gaming meta-detector</strong> — if bids cluster exactly at the detection boundary, that clustering itself becomes a fraud signal.</li>
              <li><strong style={{ color: '#22c55e' }}>Behavioral learning pipeline</strong> — officers label outcomes → ground truth accumulates → model improves → this is the data moat.</li>
            </ul>
          </div>
        </div>

        {/* Status legend */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', fontSize: '10px' }}>
          {[
            { color: '#22c55e', label: 'COMPLETE', icon: '✓' },
            { color: '#f59e0b', label: 'PARTIAL', icon: '◐' },
            { color: '#a78bfa', label: 'IN PROGRESS', icon: '○' },
            { color: '#f97316', label: 'PLANNED', icon: '○' },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: s.color }}>
              <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: s.label === 'COMPLETE' ? s.color : 'transparent', border: `2px solid ${s.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#fff' }}>
                {s.label === 'COMPLETE' ? '✓' : s.label === 'PARTIAL' ? '◐' : ''}
              </span>
              {s.label}
            </div>
          ))}
        </div>

        {/* Timeline */}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', left: '20px', top: 0, bottom: 0, width: '2px', background: 'rgba(255,255,255,0.06)' }} />

          {phases.map((phase, i) => (
            <div key={i} style={{ position: 'relative', paddingLeft: '52px', marginBottom: '32px' }}>
              <div style={{ position: 'absolute', left: '12px', top: '4px', width: '18px', height: '18px', borderRadius: '50%', background: phase.status === 'COMPLETE' ? phase.color : 'transparent', border: `2px solid ${phase.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#fff' }}>
                {phase.status === 'COMPLETE' && '✓'}
                {phase.status === 'IN_PROGRESS' && <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: phase.color, animation: 'pulse 2s infinite' }} />}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: phase.color, margin: 0 }}>{phase.title}</h3>
                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: `${phase.color}15`, color: phase.color, fontWeight: 600 }}>
                  {phase.period}
                </span>
                <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '6px', background: phase.status === 'COMPLETE' ? 'rgba(34,197,94,0.15)' : phase.status === 'IN_PROGRESS' ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)', color: phase.status === 'COMPLETE' ? '#22c55e' : phase.status === 'IN_PROGRESS' ? '#3b82f6' : '#94a3b8', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                  {phase.status === 'COMPLETE' ? 'SHIPPED' : phase.status === 'IN_PROGRESS' ? 'IN PROGRESS' : phase.status === 'VISION' ? 'VISION' : 'PLANNED'}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {phase.items.map((item, j) => {
                  const isPartial = (item as any).partial;
                  const itemColor = item.done ? '#22c55e' : isPartial ? '#f59e0b' : 'rgba(255,255,255,0.25)';
                  return (
                    <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px', color: item.done ? 'rgba(255,255,255,0.65)' : isPartial ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.4)' }}>
                      <span style={{ color: itemColor, marginTop: '2px', fontWeight: 700 }}>
                        {item.done ? '✓' : isPartial ? '◐' : '○'}
                      </span>
                      <span style={{ textDecoration: item.done ? 'none' : 'none' }}>{item.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Honest status footer */}
        <div style={{ marginTop: '32px', padding: '20px', borderRadius: '16px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#f59e0b', marginBottom: '10px' }}>Honest Status Note</p>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.8 }}>
            <p>This roadmap reflects the <strong style={{ color: '#e2e8f0' }}>actual implementation state</strong>, not aspirational goals. Items marked ✓ have working code and passing tests. Items marked ◐ have partial implementations that need production dependencies (APIs, real data, or infrastructure) to become fully operational.</p>
            <p style={{ marginTop: '8px' }}>Key dependencies for Phase 3: GeM/CPPP data access approval, NIC Cloud hosting clearance, Hyperledger Fabric node provisioning, real government procurement data for ML retraining.</p>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
    </div>
  );
}
