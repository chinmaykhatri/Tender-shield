'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { getTenderById, getAuditTrail } from '@/lib/dataLayer';
import { getStatusBadge } from '@/lib/api';
import StreamingAnalysis from '@/components/StreamingAnalysis';
import AgentInvestigation from '@/app/tenders/[id]/AgentInvestigation';
import PredictiveCartelGraph from '@/components/PredictiveCartelGraph';
import BlockchainQRCode from '@/components/BlockchainQRCode';
import GlowStripes from '@/components/GlowStripes';

// ═══════════════════════════════════════════════
// TENDER DETAIL — Competition Demo Page
// 5 tabs: Overview, Bids, AI Analysis, Blockchain, Audit
// ═══════════════════════════════════════════════

export default function TenderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { isAuthenticated } = useAuthStore();
  const [tender, setTender] = useState<any>(null);
  const [auditTrail, setAuditTrail] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'bids' | 'ai' | 'blockchain' | 'audit'>('overview');
  const [riskAnimated, setRiskAnimated] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/'); return; }
    const load = async () => {
      const id = params.id as string;
      const [tenderRes, auditRes] = await Promise.all([getTenderById(id), getAuditTrail(id)]);
      setTender(tenderRes.data);
      setAuditTrail(auditRes.data || []);
      setLoading(false);
    };
    load();
  }, [isAuthenticated, params.id, router]);

  // Animate risk gauge when AI tab opens
  useEffect(() => {
    if (activeTab === 'ai' && tender?.risk_score) {
      setRiskAnimated(0);
      const target = tender.risk_score;
      const duration = 1500;
      const start = Date.now();
      const animate = () => {
        const elapsed = Date.now() - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setRiskAnimated(Math.round(target * eased));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }
  }, [activeTab, tender?.risk_score]);

  if (loading) return <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-32 shimmer rounded-2xl" />)}</div>;
  if (!tender) return <div style={{ textAlign: 'center', padding: '64px 0' }}><p style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</p><p style={{ color: '#888' }}>Tender not found</p></div>;

  const badge = getStatusBadge(tender.status);
  const riskColor = tender.risk_level === 'CRITICAL' ? '#ef4444' : tender.risk_level === 'HIGH' ? '#f97316' : tender.risk_level === 'MEDIUM' ? '#f59e0b' : '#22c55e';

  const tabs = [
    { id: 'overview', label: '📋 Overview' },
    { id: 'bids', label: `🔒 Bids (${tender.bids?.length || tender.bids_count || 0})` },
    { id: 'ai', label: `🤖 AI Analysis${tender.risk_score >= 75 ? ' 🔴' : ''}` },
    { id: 'blockchain', label: '⛓ Blockchain' },
    { id: 'audit', label: `📜 Audit (${auditTrail.length})` },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${tender.status === 'FROZEN_BY_AI' ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span className={`badge ${badge.class}`}>{badge.label}</span>
              <span style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: '#666' }}>{tender.id || tender.tender_id}</span>
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginBottom: '8px', fontFamily: "'DM Sans', sans-serif" }}>{tender.title}</h1>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '12px', color: '#888' }}>
              <span>🏛️ {tender.ministry || tender.ministry_code}</span>
              <span>📦 {tender.category}</span>
              <span>📅 {tender.deadline_display || 'N/A'}</span>
              <span>📜 {tender.gfr_reference}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '28px', fontWeight: 700, color: '#FF9933', fontFamily: "'Rajdhani', sans-serif" }}>
              {tender.estimated_value_display || `₹${tender.estimated_value_crore} Cr`}
            </p>
            {tender.risk_score !== undefined && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <span style={{ fontSize: '12px', color: riskColor, fontWeight: 600 }}>Risk: {tender.risk_score}</span>
                <div className="risk-meter" style={{ width: '80px' }}>
                  <div className="risk-meter-fill" style={{ width: `${tender.risk_score}%`, background: riskColor }} />
                </div>
              </div>
            )}
          </div>
        </div>
        {tender.blockchain_tx && (
          <div style={{ marginTop: '16px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>⛓️</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '10px', color: '#666' }}>Blockchain Transaction</p>
              <p style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: '#a5b4fc' }}>{tender.blockchain_tx}</p>
            </div>
            <span style={{ fontSize: '10px', fontFamily: "'JetBrains Mono', monospace", color: '#666' }}>Block #{tender.block_number}</span>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '4px', padding: '4px', borderRadius: '14px', background: 'rgba(255,255,255,0.02)' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} style={{
            flex: 1, padding: '10px', borderRadius: '10px', border: 'none',
            background: activeTab === tab.id ? '#6366f1' : 'transparent',
            color: activeTab === tab.id ? 'white' : '#888',
            fontSize: '12px', fontWeight: 500, cursor: 'pointer', transition: 'all 200ms',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '16px', color: 'white' }}>📋 Tender Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                ['Department', tender.department], ['Category', tender.category],
                ['GeM Category', tender.gem_category], ['GFR Reference', tender.gfr_reference],
                ['Bid Security', tender.bid_security_crore ? `₹${tender.bid_security_crore} Cr` : 'N/A'],
                ['Created By', tender.created_by], ['Compliance', tender.compliance_status],
              ].map(([label, value]) => (
                <div key={label as string} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                  <span style={{ color: '#888' }}>{label}</span>
                  <span style={{ fontWeight: 500, color: '#ccc' }}>{(value as string) || 'N/A'}</span>
                </div>
              ))}
            </div>
          </div>
          {tender.status === 'FROZEN_BY_AI' && (
            <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <h3 style={{ fontWeight: 600, marginBottom: '12px', color: '#f87171' }}>🚨 Frozen by AI</h3>
              <p style={{ fontSize: '13px', color: '#fca5a5', lineHeight: 1.7 }}>{tender.freeze_reason}</p>
              <p style={{ fontSize: '11px', color: '#888', marginTop: '12px' }}>Frozen at: {tender.frozen_at}</p>
              {tender.freeze_tx && <p style={{ fontSize: '11px', fontFamily: "'JetBrains Mono', monospace", color: '#666', marginTop: '4px' }}>TX: {tender.freeze_tx}</p>}
            </div>
          )}
          {/* Predictive Cartel Graph on overview if score > 60 */}
          {tender.risk_score >= 60 && (
            <div className="lg:col-span-2">
              <PredictiveCartelGraph tenderId={tender.tender_id || tender.id} tenderTitle={tender.title} />
            </div>
          )}
        </div>
      )}

      {/* ═══ BIDS TAB ═══ */}
      {activeTab === 'bids' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {(!tender.bids || tender.bids.length === 0) ? (
            <div style={{ textAlign: 'center', padding: '48px 0', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ fontSize: '32px', marginBottom: '8px' }}>🔒</p>
              <p style={{ color: '#888' }}>No bids available</p>
            </div>
          ) : (
            tender.bids.map((bid: any) => (
              <div key={bid.bid_id} style={{
                padding: '20px', borderRadius: '14px',
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid ${bid.shell_company || bid.is_shell_company ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.06)'}`,
                borderLeftWidth: '3px',
                borderLeftColor: bid.shell_company || bid.is_shell_company ? '#ef4444' : bid.is_winner_candidate ? '#22c55e' : 'rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: 'white', fontSize: '14px' }}>{bid.bidder_name || bid.company_name}</span>
                      {(bid.shell_company || bid.is_shell_company) && <span className="badge badge-danger">⚠️ Shell</span>}
                      {bid.is_winner_candidate && <span className="badge badge-success">👑 L1</span>}
                      {bid.zkp_verified && <span className="badge badge-info">🔐 ZKP</span>}
                    </div>
                    <p style={{ fontSize: '11px', color: '#888' }}>GSTIN: {bid.gstin} · {(bid.submitted_at || '').slice(0, 19)}</p>
                    {bid.shell_evidence && <p style={{ fontSize: '11px', color: '#f87171', marginTop: '4px' }}>⚠️ {bid.shell_evidence}</p>}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '18px', fontWeight: 700, color: 'white', fontFamily: "'Rajdhani', sans-serif" }}>{bid.revealed_amount_display || `₹${bid.revealed_amount_crore || bid.amount_crore} Cr`}</p>
                    <span className={`badge ${(bid.ai_risk || bid.ai_risk_score) >= 75 ? 'badge-danger' : (bid.ai_risk || bid.ai_risk_score) >= 40 ? 'badge-warning' : 'badge-success'}`}>
                      Risk: {bid.ai_risk || bid.ai_risk_score}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ═══ AI ANALYSIS TAB ★ THE DEMO STAR ═══ */}
      {activeTab === 'ai' && (
        <div style={{ position: 'relative' }}>
          <GlowStripes size={500} animated opacity={0.2} position="top-right" />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>

            {/* Risk Score Hero */}
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: '120px', fontWeight: 400, color: 'white', lineHeight: 1, margin: 0 }}>
                {riskAnimated}
              </p>
              <p style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.2em', color: riskColor, fontWeight: 600, marginTop: '8px' }}>
                {tender.risk_level || 'UNKNOWN'}
              </p>
              <p style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>Detected in 3.2 seconds</p>

              {/* SVG Semicircle Gauge */}
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
                <svg width="240" height="130" viewBox="0 0 240 130">
                  <defs>
                    <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#22c55e" />
                      <stop offset="50%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                  </defs>
                  {/* Background arc */}
                  <path d="M 20 120 A 100 100 0 0 1 220 120" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="10" strokeLinecap="round" />
                  {/* Active arc */}
                  <path d="M 20 120 A 100 100 0 0 1 220 120" fill="none" stroke="url(#gaugeGrad)" strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${(riskAnimated / 100) * 314} 314`} style={{ transition: 'stroke-dasharray 1.5s ease' }} />
                  {/* Needle */}
                  <line
                    x1="120" y1="120"
                    x2={120 + 70 * Math.cos(Math.PI - (riskAnimated / 100) * Math.PI)}
                    y2={120 - 70 * Math.sin(Math.PI - (riskAnimated / 100) * Math.PI)}
                    stroke="white" strokeWidth="2" strokeLinecap="round"
                    style={{ transition: 'all 1.5s ease' }}
                  />
                  <circle cx="120" cy="120" r="4" fill="white" />
                </svg>
              </div>
            </div>

            {/* Fraud Flag Cards */}
            {tender.ai_alert && tender.ai_alert.flags && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {tender.ai_alert.flags.map((flag: any, i: number) => (
                  <div key={i} style={{
                    padding: '20px', borderRadius: '14px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderLeftWidth: '3px',
                    borderLeftColor: flag.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <span className={`badge ${flag.severity === 'CRITICAL' ? 'badge-danger' : 'badge-warning'}`}>{flag.type}</span>
                      <span style={{ fontSize: '11px', color: '#888' }}>Confidence: {(flag.confidence * 100).toFixed(0)}%</span>
                    </div>
                    <p style={{ fontSize: '13px', color: '#ccc', lineHeight: 1.6 }}>{flag.evidence}</p>
                    {/* Evidence strength bar */}
                    <div style={{ marginTop: '10px', height: '3px', borderRadius: '2px', background: 'rgba(255,255,255,0.04)' }}>
                      <div style={{
                        height: '100%', borderRadius: '2px',
                        width: `${flag.confidence * 100}%`,
                        background: flag.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                        transition: 'width 1s ease',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Streaming Analysis Terminal */}
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '12px' }}>▶ Live AI Analysis</h3>
              <StreamingAnalysis tenderId={tender.tender_id || tender.id} tenderData={{
                title: tender.title,
                ministry: tender.ministry || tender.ministry_code,
                value_crore: tender.estimated_value_crore,
                bids: (tender.bids || []).map((b: any) => ({
                  company: b.bidder_name || b.company_name || 'Unknown',
                  amount_crore: b.revealed_amount_crore || b.amount_crore || 0,
                  submitted_at: b.submitted_at || new Date().toISOString(),
                  gstin: b.gstin || 'N/A',
                })),
              }} />
            </div>

            {/* Agent Investigation */}
            {tender.risk_score >= 50 && (
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'white', marginBottom: '12px' }}>🤖 Autonomous Agent Investigation</h3>
                <AgentInvestigation tenderId={tender.tender_id || tender.id} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ BLOCKCHAIN TAB ═══ */}
      {activeTab === 'blockchain' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* QR Code for verification */}
          {tender.blockchain_tx && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <BlockchainQRCode
                txHash={tender.blockchain_tx}
                blockNumber={tender.block_number || 1289}
                label="Tender Creation — Scan to Verify"
              />
            </div>
          )}

          {/* Blockchain history from audit trail */}
          <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <h3 style={{ fontWeight: 600, marginBottom: '16px', color: 'white' }}>⛓ Transaction History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {auditTrail.length === 0 ? (
                <p style={{ color: '#888', textAlign: 'center', padding: '32px 0' }}>No blockchain records yet</p>
              ) : (
                auditTrail.map((event: any, i: number) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 14px', borderRadius: '8px',
                    borderLeft: `2px solid ${event.highlight ? '#ef4444' : '#6366f1'}`,
                  }}>
                    <span style={{ fontSize: '14px' }}>{event.highlight ? '🚨' : '⛓'}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '12px', fontWeight: 500, color: '#ccc' }}>{event.action}</p>
                      <p style={{ fontSize: '10px', color: '#666' }}>{event.actor} · {event.timestamp}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#a5b4fc' }}>
                        {(event.blockchain_tx || '').slice(0, 16)}...
                      </p>
                      <p style={{ fontSize: '10px', color: '#666' }}>Block #{event.block}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Freeze QR if frozen */}
          {tender.status === 'FROZEN_BY_AI' && tender.freeze_tx && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <BlockchainQRCode
                txHash={tender.freeze_tx || '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f'}
                blockNumber={1345}
                label="AI Freeze Action — Immutable Record"
              />
            </div>
          )}
        </div>
      )}

      {/* ═══ AUDIT TAB ═══ */}
      {activeTab === 'audit' && (
        <div style={{ padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {auditTrail.map((event: any, i: number) => (
              <div key={i} style={{
                display: 'flex', gap: '16px', padding: '16px 0',
                borderLeft: i < auditTrail.length - 1 ? '2px solid rgba(255,255,255,0.06)' : 'none',
                marginLeft: '12px', paddingLeft: '24px',
                background: event.highlight ? 'rgba(239,68,68,0.04)' : 'transparent',
                borderRadius: event.highlight ? '8px' : '0',
              }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'white' }}>{event.action}</p>
                  <p style={{ fontSize: '11px', color: '#888' }}>{event.actor} · {event.actor_role}</p>
                  <p style={{ fontSize: '11px', color: '#888' }}>{event.timestamp}</p>
                  {event.highlight_reason && <p style={{ fontSize: '11px', color: '#f87171', marginTop: '4px' }}>⚠️ {event.highlight_reason}</p>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color: '#a5b4fc' }}>{event.blockchain_tx}</p>
                  <p style={{ fontSize: '10px', color: '#666' }}>Block #{event.block}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
