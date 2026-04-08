'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';
import AuditTrailTab from './components/AuditTrailTab';
import InvestigationsTab from './components/InvestigationsTab';
import ReportsTab from './components/ReportsTab';
import { smBtn, selStyle, inpStyle, lbl, riskColor, statusBadge } from './components/shared-styles';
import type { TenderItem, AlertItem, FlagResult, FlagForm, StatCard, MinistryRisk, RecentAction } from './types';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

// ─── Demo Data ─────────────────────────────────
const STATS: StatCard[] = [
  { label: 'Active Investigations', value: 3, sub: '₹382.5 Cr under audit', color: '#a78bfa', icon: '🔍' },
  { label: 'Flagged Today', value: 2, sub: 'Requires your review', color: '#f59e0b', icon: '🚩', pulse: true },
  { label: 'Pending Escalations', value: 1, sub: 'Awaiting CAG decision', color: '#ef4444', icon: '⚠️' },
  { label: 'Reports This Month', value: 7, sub: 'Last: 2 hours ago', color: '#22c55e', icon: '📄' },
  { label: 'Tenders Monitored', value: 127, sub: 'Across 8 ministries', color: '#6366f1', icon: '📊' },
];

const ALERTS: AlertItem[] = [
  { id: 1, severity: 'CRITICAL', icon: '🚨', title: 'AIIMS Delhi — Shell company detected', detail: 'Risk: 94/100 | Auto-frozen | ₹120 Crore', time: '47 minutes ago', color: '#ef4444', tenderId: 'TDR-MoH-2025-000003' },
  { id: 2, severity: 'HIGH', icon: '⚠️', title: 'MoD Defence Supplies — Bid rigging suspected', detail: 'Risk: 72/100 | Under evaluation | ₹62 Crore', time: '3 hours ago', color: '#f59e0b', tenderId: 'TDR-MoD-2025-000004' },
  { id: 3, severity: 'HIGH', icon: '⚠️', title: 'MeitY AI Platform — Spec bias detected', detail: 'Risk: 45/100 | Bidding open | ₹180 Crore', time: '5 hours ago', color: '#f59e0b', tenderId: 'TDR-MeitY-2025-000007' },
  { id: 4, severity: 'MEDIUM', icon: '⚡', title: 'New officer registered — MoRTH', detail: 'Pending verification review', time: 'Yesterday', color: '#eab308', tenderId: null },
];

const MINISTRY_RISK: MinistryRisk[] = [
  { ministry: 'MoD', avgRisk: 74, tenders: 18 },
  { ministry: 'MoH', avgRisk: 68, tenders: 24 },
  { ministry: 'MoRTH', avgRisk: 48, tenders: 31 },
  { ministry: 'MeitY', avgRisk: 41, tenders: 12 },
  { ministry: 'MoE', avgRisk: 31, tenders: 22 },
  { ministry: 'MoF', avgRisk: 18, tenders: 20 },
];

const RECENT_ACTIONS: RecentAction[] = [
  { time: '14:32', action: 'Flagged AIIMS tender for investigation', tx: '0x8d1a4f...' },
  { time: '13:45', action: 'Generated MoH compliance report', tx: '0x1c4b7e...' },
  { time: '11:20', action: 'Reviewed officer registration', tx: '0x6a9f2c...' },
  { time: 'Yesterday', action: 'Escalated MoD investigation to CVC', tx: '0x5a8f1c...' },
];

const ALL_TENDERS: TenderItem[] = [
  { id: 'TDR-MoH-2025-000003', ministry: 'MoH', title: 'AIIMS Delhi Medical Equipment', value: 120, bidders: 3, risk: 94, status: 'FROZEN', officer: 'Rajesh Kumar Sharma', riskLevel: 'CRITICAL' },
  { id: 'TDR-MoD-2025-000004', ministry: 'MoD', title: 'Border Roads Medical Supply', value: 62, bidders: 4, risk: 72, status: 'UNDER_EVAL', officer: 'Col. Vikram Singh', riskLevel: 'HIGH' },
  { id: 'TDR-MeitY-2025-000007', ministry: 'MeitY', title: 'AI Research Platform Procurement', value: 180, bidders: 5, risk: 45, status: 'BIDDING_OPEN', officer: 'Dr. Neha Kapoor', riskLevel: 'MEDIUM' },
  { id: 'TDR-MoRTH-2025-000012', ministry: 'MoRTH', title: 'Rural Road Construction Batch 7', value: 28, bidders: 6, risk: 38, status: 'BIDDING_OPEN', officer: 'Arvind Mehta', riskLevel: 'MEDIUM' },
  { id: 'TDR-MoE-2025-000011', ministry: 'MoE', title: 'Digital Classroom Equipment Phase 4', value: 28, bidders: 8, risk: 18, status: 'AWARDED', officer: 'Rahul Verma', riskLevel: 'LOW' },
  { id: 'TDR-MoF-2025-000015', ministry: 'MoF', title: 'Tax Filing Infrastructure Upgrade', value: 45, bidders: 3, risk: 12, status: 'BIDDING_OPEN', officer: 'Sunita Devi', riskLevel: 'LOW' },
  { id: 'TDR-MoRTH-2024-000089', ministry: 'MoRTH', title: 'NH-44 Highway Phase 2', value: 320, bidders: 4, risk: 67, status: 'FROZEN', officer: 'Deepak Mishra', riskLevel: 'HIGH' },
];

// ─── Main Component ─────────────────────────────────────
export default function CAGAuditorDashboard() {
  const { user } = useAuthStore();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('overview');
  const [ministryFilter, setMinistryFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [flagModal, setFlagModal] = useState<TenderItem | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([]);
  const [flagSuccess, setFlagSuccess] = useState<FlagResult | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [istTime, setIstTime] = useState('');

  useEffect(() => {
    const tick = () => setIstTime(new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick(); const iv = setInterval(tick, 1000); return () => clearInterval(iv);
  }, []);

  // Filtered tenders
  const filtered = ALL_TENDERS.filter(t =>
    (!ministryFilter || t.ministry === ministryFilter) &&
    (!riskFilter || t.riskLevel === riskFilter) &&
    (!statusFilter || t.status === statusFilter)
  );

  // ─── Flag tender handler ─────────────────────────────
  const [flagForm, setFlagForm] = useState<FlagForm>({
    flag_type: '', severity: 'INVESTIGATION', reason: '', evidence_notes: '', recommended_action: 'FREEZE_TENDER',
  });

  const handleFlag = async () => {
    if (flagForm.reason.length < 100 || !flagModal) return;
    try {
      const res = await fetch('/api/auditor/flag-tender', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...flagForm, tender_id: flagModal.id }),
      });
      const data = await res.json();
      if (data.success) {
        setFlagSuccess(data);
        setFlagModal(null);
      }
    } catch { /* handled */ }
  };

  // ─── Generate report ─────────────────────────────────
  const handleReport = async (tender?: Partial<TenderItem> & { risk?: number }) => {
    setReportLoading(true);
    try {
      const res = await fetch('/api/auditor/generate-report', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_type: 'tender', auditor_name: user?.name || 'CAG Auditor',
          scope: tender ? { tender_id: tender.id, ministry: tender.ministry, value: tender.value, risk_score: tender.risk, title: tender.title } : {},
        }),
      });
      const html = await res.text();
      const w = window.open('', '_blank');
      if (w) { w.document.write(html); w.document.close(); }
    } catch { /* handled */ }
    setReportLoading(false);
  };

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', width: '100%' }}>
      {/* Role Banner */}
      <div style={{ background: 'linear-gradient(135deg, rgba(167,139,250,0.12), rgba(139,92,246,0.06))', border: '1px solid rgba(167,139,250,0.25)', borderRadius: 12, padding: isMobile ? '8px 12px' : '10px 20px', marginBottom: 16, display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', gap: 6 }}>
        <div style={{ fontSize: isMobile ? 11 : 12, color: '#c4b5fd' }}>
          🛡️ <strong style={{ color: '#a78bfa' }}>CAG Auditor</strong> — {isMobile ? 'Full access' : 'Full system access. All your actions are recorded on blockchain.'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 11, color: '#f87171', fontWeight: 600, animation: 'pulse 2s infinite' }}>🔴 {ALERTS.length - dismissedAlerts.length} Alerts</span>
          <span style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>🕐 {istTime} IST</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'rgba(30,41,59,0.4)', borderRadius: 10, padding: 4, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {['overview', 'audit-trail', 'investigations', 'reports'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: isMobile ? '8px 10px' : '8px 16px', borderRadius: 8, border: 'none', fontSize: isMobile ? 11 : 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', flex: isMobile ? '1 0 auto' : undefined,
            background: activeTab === tab ? 'rgba(167,139,250,0.2)' : 'transparent',
            color: activeTab === tab ? '#a78bfa' : '#64748b',
          }}>{tab === 'overview' ? '📊 Overview' : tab === 'audit-trail' ? '📜 Trail' : tab === 'investigations' ? '🔍 Cases' : '📄 Reports'}</button>
        ))}
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {activeTab === 'overview' && (<>
        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(5, 1fr)', gap: isMobile ? 8 : 12, marginBottom: 16 }}>
          {STATS.map((s, i) => (
            <div key={i} style={{ background: 'rgba(30,41,59,0.6)', border: `1px solid ${s.color}25`, borderLeft: `3px solid ${s.color}`, borderRadius: 12, padding: isMobile ? '10px 12px' : '14px 16px', position: 'relative' }}>
              <div style={{ fontSize: isMobile ? 10 : 11, color: '#94a3b8', fontWeight: 600 }}>{s.icon} {s.label}</div>
              <div style={{ fontSize: isMobile ? 22 : 28, fontWeight: 800, color: s.color, marginTop: 2 }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{s.sub}</div>
              {s.pulse && <div style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: s.color, animation: 'pulse 2s infinite' }} />}
            </div>
          ))}
        </div>

        {/* Main Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 340px', gap: 16 }}>
          {/* Left */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Alerts */}
            <div style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>🚨 Unread Alerts — Action Required</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ALERTS.filter(a => !dismissedAlerts.includes(a.id)).map(alert => (
                  <div key={alert.id} style={{ padding: '10px 14px', borderRadius: 10, background: `${alert.color}08`, borderLeft: `3px solid ${alert.color}`, border: `1px solid ${alert.color}20` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>{alert.icon} {alert.title}</span>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{alert.detail}</div>
                      </div>
                      <span style={{ fontSize: 10, color: '#475569', whiteSpace: 'nowrap' }}>{alert.time}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      {alert.tenderId && <button onClick={() => {}} style={smBtn('#6366f1')}>View Analysis</button>}
                      <button onClick={() => setDismissedAlerts([...dismissedAlerts, alert.id])} style={smBtn('#22c55e')}>Mark Reviewed</button>
                      {alert.tenderId && <button onClick={() => setFlagModal(ALL_TENDERS.find(t => t.id === alert.tenderId) || null)} style={smBtn('#ef4444')}>🚩 Flag</button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tender Table / Cards */}
            <div style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: isMobile ? 12 : 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div><h3 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>📋 All Tenders</h3>
                <p style={{ fontSize: 10, color: '#64748b' }}>Full access across all ministries</p></div>
              </div>
              {/* Filters */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                <select value={ministryFilter} onChange={e => setMinistryFilter(e.target.value)} style={{ ...selStyle, flex: isMobile ? '1 1 45%' : undefined }}>
                  <option value="">All Ministries</option>
                  {['MoH','MoD','MoRTH','MeitY','MoE','MoF'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} style={{ ...selStyle, flex: isMobile ? '1 1 45%' : undefined }}>
                  <option value="">All Risk</option>
                  {['CRITICAL','HIGH','MEDIUM','LOW'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ ...selStyle, flex: isMobile ? '1 1 45%' : undefined }}>
                  <option value="">All Status</option>
                  {['FROZEN','UNDER_EVAL','BIDDING_OPEN','AWARDED'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              {/* Desktop: Table | Mobile: Cards */}
              {isMobile ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filtered.map(t => {
                    const badge = statusBadge(t.status);
                    return (
                      <div key={t.id} style={{ padding: '12px', borderRadius: 10, background: t.status === 'FROZEN' ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>{t.ministry}</span>
                          <span style={{ color: riskColor(t.risk), fontWeight: 700, fontSize: 14 }}>Risk: {t.risk}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0', marginBottom: 4 }}>{t.title}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: 14 }}>₹{t.value} Cr</span>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: badge.bg, color: badge.color, fontWeight: 600 }}>{badge.label}</span>
                        </div>
                        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>{t.officer} · {t.bidders} bidders</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => setFlagModal(t)} style={{ ...smBtn('#ef4444'), padding: '6px 14px', flex: 1 }}>🚩 Flag</button>
                          <button onClick={() => handleReport(t)} style={{ ...smBtn('#22c55e'), padding: '6px 14px', flex: 1 }}>📄 Report</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                    {['ID','Ministry','Title','Value','Bidders','Risk','Status','Officer','Actions'].map(h =>
                      <th key={h} style={{ textAlign: 'left', padding: '6px 4px', color: '#64748b', fontWeight: 600, fontSize: 10 }}>{h}</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(t => {
                    const badge = statusBadge(t.status);
                    const isFrozen = t.status === 'FROZEN';
                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: isFrozen ? 'rgba(239,68,68,0.04)' : 'transparent' }}>
                        <td style={{ padding: '8px 4px', fontFamily: 'monospace', fontSize: 10, color: '#94a3b8' }}>{t.id.slice(-8)}</td>
                        <td style={{ padding: '8px 4px' }}><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>{t.ministry}</span></td>
                        <td style={{ padding: '8px 4px', color: '#e2e8f0', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</td>
                        <td style={{ padding: '8px 4px', color: '#f59e0b', fontWeight: 700 }}>₹{t.value}Cr</td>
                        <td style={{ padding: '8px 4px', textAlign: 'center', color: '#94a3b8' }}>{t.bidders}</td>
                        <td style={{ padding: '8px 4px' }}><span style={{ color: riskColor(t.risk), fontWeight: 700, fontSize: 13 }}>{t.risk}</span></td>
                        <td style={{ padding: '8px 4px' }}><span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, background: badge.bg, color: badge.color, fontWeight: 600 }}>{badge.label}</span></td>
                        <td style={{ padding: '8px 4px', fontSize: 10, color: '#94a3b8' }}>{t.officer}</td>
                        <td style={{ padding: '8px 4px' }}>
                          <div style={{ display: 'flex', gap: 3 }}>
                            <button onClick={() => setFlagModal(t)} style={smBtn('#ef4444')} title="Flag">🚩</button>
                            <button onClick={() => handleReport(t)} style={smBtn('#22c55e')} title="Report">📄</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              )}
            </div>
          </div>

          {/* Right */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Ministry Risk */}
            <div style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>🏛️ Risk by Ministry</h3>
              {MINISTRY_RISK.map(m => (
                <div key={m.ministry} style={{ marginBottom: 8, cursor: 'pointer' }} onClick={() => setMinistryFilter(m.ministry)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 2 }}>
                    <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{m.ministry}</span>
                    <span style={{ color: riskColor(m.avgRisk), fontWeight: 700 }}>{m.avgRisk}</span>
                  </div>
                  <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${m.avgRisk}%`, height: '100%', background: riskColor(m.avgRisk), borderRadius: 3, transition: 'width 0.5s' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Recent Actions */}
            <div style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>📜 Your Recent Actions</h3>
              {RECENT_ACTIONS.map((a, i) => (
                <div key={i} style={{ padding: '6px 0', borderBottom: i < RECENT_ACTIONS.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ fontSize: 11, color: '#e2e8f0' }}>{a.action}</div>
                  <div style={{ fontSize: 9, color: '#475569', fontFamily: 'monospace' }}>{a.time} | TX: {a.tx}</div>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>⚡ Quick Actions</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {[
                  { label: '🚩 Flag a Tender', color: '#ef4444', action: () => setFlagModal(ALL_TENDERS[0]) },
                  { label: '📄 Generate Report', color: '#22c55e', action: () => handleReport() },
                  { label: '🔍 View Investigations', color: '#6366f1', action: () => setActiveTab('investigations') },
                  { label: '📜 Full Audit Trail', color: '#a78bfa', action: () => setActiveTab('audit-trail') },
                  { label: '🔒 Emergency Freeze', color: '#ef4444', action: () => {} },
                ].map((btn, i) => (
                  <button key={i} onClick={btn.action} style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${btn.color}30`, background: `${btn.color}08`, color: btn.color, fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'left' }}>
                    {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </>)}

      {/* ═══ EXTRACTED TABS ═══ */}
      {activeTab === 'audit-trail' && <AuditTrailTab />}
      {activeTab === 'investigations' && <InvestigationsTab onReport={handleReport} />}
      {activeTab === 'reports' && <ReportsTab onGenerate={handleReport} loading={reportLoading} />}

      {/* ═══ FLAG MODAL ═══ */}
      {flagModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center' }}
          onClick={() => setFlagModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0f172a', border: '1px solid rgba(239,68,68,0.3)', borderRadius: isMobile ? '16px 16px 0 0' : 16, padding: isMobile ? 16 : 24, width: isMobile ? '100%' : 560, maxHeight: isMobile ? '90vh' : '80vh', overflow: 'auto' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>🚩 Flag Tender for CAG Investigation</h2>
            <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{flagModal.id} — {flagModal.title}</p>
            <p style={{ fontSize: 10, color: '#f87171', marginBottom: 12 }}>⚠️ This action is permanent and recorded on blockchain</p>

            <label style={lbl}>Flag Type *</label>
            <select value={flagForm.flag_type} onChange={e => setFlagForm({ ...flagForm, flag_type: e.target.value })} style={{ ...inpStyle, marginBottom: 10 }}>
              <option value="">Select type...</option>
              {['BID_RIGGING','SHELL_COMPANY','SPECIFICATION_BIAS','FRONT_RUNNING','SPLIT_TENDERING','OFFICER_MISCONDUCT','FINANCIAL_IRREGULARITY','OTHER'].map(t =>
                <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
              )}
            </select>

            <label style={lbl}>Severity *</label>
            <div style={{ display: 'flex', gap: isMobile ? 4 : 8, marginBottom: 10, flexWrap: 'wrap' }}>
              {['ADVISORY','WARNING','INVESTIGATION','CRITICAL'].map(s => (
                <label key={s} style={{ fontSize: 11, color: flagForm.severity === s ? '#a78bfa' : '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3, padding: '4px 8px', borderRadius: 6, background: flagForm.severity === s ? 'rgba(167,139,250,0.1)' : 'transparent', border: `1px solid ${flagForm.severity === s ? 'rgba(167,139,250,0.3)' : 'rgba(255,255,255,0.06)'}` }}>
                  <input type="radio" name="severity" checked={flagForm.severity === s} onChange={() => setFlagForm({ ...flagForm, severity: s })} style={{ accentColor: '#a78bfa' }} />
                  {s}
                </label>
              ))}
            </div>

            <label style={lbl}>Reason * (min 100 characters)</label>
            <textarea value={flagForm.reason} onChange={e => setFlagForm({ ...flagForm, reason: e.target.value })}
              style={{ ...inpStyle, height: 100, resize: 'vertical', marginBottom: 2 }}
              placeholder="Describe the specific irregularity observed. Include dates, amounts, and evidence references. This will be part of the official CAG record." />
            <div style={{ fontSize: 9, color: flagForm.reason.length >= 100 ? '#22c55e' : '#ef4444', marginBottom: 10 }}>{flagForm.reason.length} / 100 minimum</div>

            <label style={lbl}>Evidence Notes (optional)</label>
            <textarea value={flagForm.evidence_notes} onChange={e => setFlagForm({ ...flagForm, evidence_notes: e.target.value })}
              style={{ ...inpStyle, height: 60, resize: 'vertical', marginBottom: 10 }}
              placeholder="Additional evidence, blockchain TX references, or related tenders." />

            <label style={lbl}>Recommended Action</label>
            <select value={flagForm.recommended_action} onChange={e => setFlagForm({ ...flagForm, recommended_action: e.target.value })} style={{ ...inpStyle, marginBottom: 14 }}>
              {['MONITOR','REQUEST_CLARIFICATION','FREEZE_TENDER','ESCALATE_TO_CVC','RECOMMEND_FIR'].map(a =>
                <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
              )}
            </select>

            <button onClick={handleFlag} disabled={flagForm.reason.length < 100 || !flagForm.flag_type}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: 'none', background: flagForm.reason.length >= 100 && flagForm.flag_type ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : '#374151', color: '#fff', fontWeight: 700, fontSize: 13, cursor: flagForm.reason.length >= 100 ? 'pointer' : 'not-allowed' }}>
              🚩 Submit CAG Flag — This Action is Permanent
            </button>
          </div>
        </div>
      )}

      {/* Flag Success Toast */}
      {flagSuccess && (
        <div style={{ position: 'fixed', bottom: isMobile ? 70 : 20, right: isMobile ? 12 : 20, left: isMobile ? 12 : 'auto', zIndex: 200, background: '#0f172a', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: 16, width: isMobile ? 'auto' : 340, boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#22c55e', marginBottom: 4 }}>✅ Flag Submitted Successfully</div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>Case: <strong style={{ color: '#e2e8f0' }}>{flagSuccess.case_number}</strong></div>
          <div style={{ fontSize: 10, color: '#475569', fontFamily: 'monospace' }}>TX: {flagSuccess.blockchain_tx?.slice(0, 32)}...</div>
          <div style={{ fontSize: 9, color: '#64748b', marginTop: 4 }}>Storage: {flagSuccess.storage}</div>
          <button onClick={() => setFlagSuccess(null)} style={{ marginTop: 8, padding: '4px 12px', borderRadius: 6, border: 'none', background: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: 11, cursor: 'pointer' }}>Done</button>
        </div>
      )}

      <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:0.5 } }`}</style>
    </div>
  );
}
