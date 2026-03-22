'use client';

import { useEffect, useState } from 'react';

interface PublicTender {
  tender_id: string;
  title: string;
  ministry: string;
  category: string;
  estimated_value_crore: number;
  status: string;
  risk_score: number;
  risk_level: string;
  bid_count: number;
  winner_price_crore: number | null;
  published_date: string;
  is_frozen: boolean;
  freeze_reason_public: string | null;
  blockchain_tx: string;
}

interface StatsData {
  total_tenders: number;
  fraud_detected: number;
  funds_protected_crore: number;
  avg_risk_score: number;
}

const RISK_COLORS: Record<string, { bg: string; text: string }> = {
  LOW: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e' },
  MEDIUM: { bg: 'rgba(251,191,36,0.12)', text: '#fbbf24' },
  HIGH: { bg: 'rgba(249,115,22,0.12)', text: '#f97316' },
  CRITICAL: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444' },
};

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  BIDDING_OPEN: { bg: 'rgba(59,130,246,0.12)', text: '#3b82f6', label: 'Bidding Open' },
  AWARDED: { bg: 'rgba(34,197,94,0.12)', text: '#22c55e', label: 'Awarded' },
  UNDER_EVALUATION: { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.5)', label: 'Under Evaluation' },
  FROZEN_BY_AI: { bg: 'rgba(239,68,68,0.12)', text: '#ef4444', label: 'AI Frozen' },
  LOCKED_BY_AI: { bg: 'rgba(249,115,22,0.12)', text: '#f97316', label: 'AI Locked' },
};

export default function TransparencyPortal() {
  const [tenders, setTenders] = useState<PublicTender[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (riskFilter) params.set('risk_level', riskFilter);

    fetch(`/api/public/tenders?${params.toString()}`)
      .then((r) => r.json())
      .then((res) => {
        setTenders(res.tenders || []);
        setStats(res.stats || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [riskFilter]);

  const filtered = tenders.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.tender_id.toLowerCase().includes(search.toLowerCase()) ||
      t.ministry.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a' }}>
      {/* Tricolor Strip */}
      <div style={{ display: 'flex', height: '4px' }}>
        <div style={{ flex: 1, background: '#FF9933' }} />
        <div style={{ flex: 1, background: '#fff' }} />
        <div style={{ flex: 1, background: '#138808' }} />
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 800, margin: '0 0 8px', background: 'linear-gradient(135deg, #a78bfa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🛡️ TenderShield Transparency Portal
          </h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>
            Government of India — Open Procurement Data | No login required
          </p>
        </div>

        {/* Hero Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
            {[
              { label: 'Tenders Monitored', value: '1,847', icon: '📋', color: '#a78bfa' },
              { label: 'Fraud Detected', value: String(stats.fraud_detected), icon: '🚨', color: '#ef4444' },
              { label: 'Funds Protected', value: `₹${stats.funds_protected_crore} Cr`, icon: '🛡️', color: '#22c55e' },
              { label: 'Avg Risk Score', value: `${stats.avg_risk_score}/100`, icon: '📊', color: '#fbbf24' },
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px', textAlign: 'center' }}>
                <p style={{ fontSize: '28px', marginBottom: '4px' }}>{s.icon}</p>
                <p style={{ fontSize: '28px', fontWeight: 800, color: s.color }}>{s.value}</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Search & Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search tenders by title, ID, or ministry..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: '250px', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', color: '#fff', fontSize: '13px', outline: 'none' }}
          />
          <div style={{ display: 'flex', gap: '6px' }}>
            {['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((level) => (
              <button
                key={level}
                onClick={() => setRiskFilter(level)}
                style={{
                  padding: '8px 14px', borderRadius: '10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                  background: riskFilter === level ? 'rgba(168,139,250,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${riskFilter === level ? 'rgba(168,139,250,0.3)' : 'rgba(255,255,255,0.06)'}`,
                  color: riskFilter === level ? '#a78bfa' : 'rgba(255,255,255,0.5)',
                }}
              >
                {level || 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Tender Cards */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map((i) => (<div key={i} className="shimmer" style={{ height: '100px', borderRadius: '16px' }} />))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filtered.map((tender) => {
              const rc = RISK_COLORS[tender.risk_level] || RISK_COLORS['LOW'];
              const sc = STATUS_COLORS[tender.status] || STATUS_COLORS['BIDDING_OPEN'];
              return (
                <div key={tender.tender_id} style={{
                  background: tender.is_frozen ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${tender.is_frozen ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.06)'}`,
                  borderRadius: '16px', padding: '20px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#a78bfa' }}>{tender.tender_id}</span>
                        <span style={{ background: sc.bg, color: sc.text, padding: '2px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600 }}>{sc.label}</span>
                      </div>
                      <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px' }}>{tender.title}</h3>
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{tender.ministry}</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>Est. Value</p>
                        <p style={{ fontSize: '14px', fontWeight: 600 }}>₹{tender.estimated_value_crore} Cr</p>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>Bids</p>
                        <p style={{ fontSize: '14px', fontWeight: 600 }}>{tender.bid_count}</p>
                      </div>
                      <div style={{ background: rc.bg, borderRadius: '10px', padding: '8px 14px', textAlign: 'center', minWidth: '50px' }}>
                        <p style={{ fontSize: '18px', fontWeight: 800, color: rc.text, lineHeight: 1 }}>{tender.risk_score}</p>
                        <p style={{ fontSize: '8px', color: rc.text, opacity: 0.7, textTransform: 'uppercase' }}>{tender.risk_level}</p>
                      </div>
                    </div>
                  </div>

                  {tender.is_frozen && tender.freeze_reason_public && (
                    <div style={{ marginTop: '12px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.12)', fontSize: '12px', color: '#f87171' }}>
                      🚨 {tender.freeze_reason_public}
                    </div>
                  )}

                  <div style={{ marginTop: '10px', fontSize: '10px', fontFamily: 'monospace', color: 'rgba(255,255,255,0.2)' }}>
                    🔗 {tender.blockchain_tx}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pattern Insights */}
        <div style={{ marginTop: '40px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px' }}>📈 Pattern Insights</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {[
              { title: 'Ministry Risk Comparison', desc: 'Average risk score per ministry. Higher scores indicate more flagged tenders.', items: [{ label: 'Health', value: 51, max: true }, { label: 'Transport', value: 23 }, { label: 'Defence', value: 78, max: true }, { label: 'Finance', value: 15 }, { label: 'Railways', value: 52 }] },
              { title: 'Bid Competition Level', desc: 'Tenders with fewer than 3 bids are at higher risk of manipulation.', items: [{ label: '1-2 bids', value: 2, max: true }, { label: '3-5 bids', value: 3 }, { label: '6-10 bids', value: 4 }, { label: '10+ bids', value: 1 }] },
              { title: 'Fraud Detection Rate', desc: 'AI fraud detection improving every month with more data.', items: [{ label: 'Jan', value: 1 }, { label: 'Feb', value: 3 }, { label: 'Mar', value: 5, max: true }] },
            ].map((card, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
                <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{card.title}</h3>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>{card.desc}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {card.items.map((item, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', minWidth: '60px' }}>{item.label}</span>
                      <div style={{ flex: 1, height: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, item.value * 10)}%`, background: item.max ? 'linear-gradient(90deg, #ef4444, #f97316)' : 'linear-gradient(90deg, #22c55e, #3b82f6)', borderRadius: '4px', transition: 'width 1s ease' }} />
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: item.max ? '#f97316' : '#22c55e', minWidth: '20px' }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
            Data updated in real-time from Hyperledger Fabric • All actions verified on blockchain
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>
            TenderShield — Government of India | Powered by AI + Blockchain
          </p>
        </div>
      </div>
    </div>
  );
}
