'use client';
import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/store';

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

// ─── Types & Demo Data ─────────────────────────────────
const STATS = [
  { label: 'Active Investigations', value: 3, sub: '₹382.5 Cr under audit', color: '#a78bfa', icon: '🔍' },
  { label: 'Flagged Today', value: 2, sub: 'Requires your review', color: '#f59e0b', icon: '🚩', pulse: true },
  { label: 'Pending Escalations', value: 1, sub: 'Awaiting CAG decision', color: '#ef4444', icon: '⚠️' },
  { label: 'Reports This Month', value: 7, sub: 'Last: 2 hours ago', color: '#22c55e', icon: '📄' },
  { label: 'Tenders Monitored', value: 127, sub: 'Across 8 ministries', color: '#6366f1', icon: '📊' },
];

const ALERTS = [
  { id: 1, severity: 'CRITICAL', icon: '🚨', title: 'AIIMS Delhi — Shell company detected', detail: 'Risk: 94/100 | Auto-frozen | ₹120 Crore', time: '47 minutes ago', color: '#ef4444', tenderId: 'TDR-MoH-2025-000003' },
  { id: 2, severity: 'HIGH', icon: '⚠️', title: 'MoD Defence Supplies — Bid rigging suspected', detail: 'Risk: 72/100 | Under evaluation | ₹62 Crore', time: '3 hours ago', color: '#f59e0b', tenderId: 'TDR-MoD-2025-000004' },
  { id: 3, severity: 'HIGH', icon: '⚠️', title: 'MeitY AI Platform — Spec bias detected', detail: 'Risk: 45/100 | Bidding open | ₹180 Crore', time: '5 hours ago', color: '#f59e0b', tenderId: 'TDR-MeitY-2025-000007' },
  { id: 4, severity: 'MEDIUM', icon: '⚡', title: 'New officer registered — MoRTH', detail: 'Pending verification review', time: 'Yesterday', color: '#eab308', tenderId: null },
];

const MINISTRY_RISK = [
  { ministry: 'MoD', avgRisk: 74, tenders: 18 },
  { ministry: 'MoH', avgRisk: 68, tenders: 24 },
  { ministry: 'MoRTH', avgRisk: 48, tenders: 31 },
  { ministry: 'MeitY', avgRisk: 41, tenders: 12 },
  { ministry: 'MoE', avgRisk: 31, tenders: 22 },
  { ministry: 'MoF', avgRisk: 18, tenders: 20 },
];

const RECENT_ACTIONS = [
  { time: '14:32', action: 'Flagged AIIMS tender for investigation', tx: '0x8d1a4f...' },
  { time: '13:45', action: 'Generated MoH compliance report', tx: '0x1c4b7e...' },
  { time: '11:20', action: 'Reviewed officer registration', tx: '0x6a9f2c...' },
  { time: 'Yesterday', action: 'Escalated MoD investigation to CVC', tx: '0x5a8f1c...' },
];

const ALL_TENDERS = [
  { id: 'TDR-MoH-2025-000003', ministry: 'MoH', title: 'AIIMS Delhi Medical Equipment', value: 120, bidders: 3, risk: 94, status: 'FROZEN', officer: 'Rajesh Kumar Sharma', riskLevel: 'CRITICAL' },
  { id: 'TDR-MoD-2025-000004', ministry: 'MoD', title: 'Border Roads Medical Supply', value: 62, bidders: 4, risk: 72, status: 'UNDER_EVAL', officer: 'Col. Vikram Singh', riskLevel: 'HIGH' },
  { id: 'TDR-MeitY-2025-000007', ministry: 'MeitY', title: 'AI Research Platform Procurement', value: 180, bidders: 5, risk: 45, status: 'BIDDING_OPEN', officer: 'Dr. Neha Kapoor', riskLevel: 'MEDIUM' },
  { id: 'TDR-MoRTH-2025-000012', ministry: 'MoRTH', title: 'Rural Road Construction Batch 7', value: 28, bidders: 6, risk: 38, status: 'BIDDING_OPEN', officer: 'Arvind Mehta', riskLevel: 'MEDIUM' },
  { id: 'TDR-MoE-2025-000011', ministry: 'MoE', title: 'Digital Classroom Equipment Phase 4', value: 28, bidders: 8, risk: 18, status: 'AWARDED', officer: 'Rahul Verma', riskLevel: 'LOW' },
  { id: 'TDR-MoF-2025-000015', ministry: 'MoF', title: 'Tax Filing Infrastructure Upgrade', value: 45, bidders: 3, risk: 12, status: 'BIDDING_OPEN', officer: 'Sunita Devi', riskLevel: 'LOW' },
  { id: 'TDR-MoRTH-2024-000089', ministry: 'MoRTH', title: 'NH-44 Highway Phase 2', value: 320, bidders: 4, risk: 67, status: 'FROZEN', officer: 'Deepak Mishra', riskLevel: 'HIGH' },
];

// ─── Component ─────────────────────────────────────────
export default function CAGAuditorDashboard() {
  const { user } = useAuthStore();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('overview');
  const [ministryFilter, setMinistryFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [flagModal, setFlagModal] = useState<any>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<number[]>([]);
  const [flagSuccess, setFlagSuccess] = useState<any>(null);
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

  const riskColor = (r: number) => r >= 80 ? '#ef4444' : r >= 50 ? '#f59e0b' : r >= 30 ? '#eab308' : '#22c55e';
  const statusBadge = (s: string) => {
    const m: Record<string,{bg:string,color:string,label:string}> = {
      FROZEN: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444', label: '🔒 FROZEN' },
      UNDER_EVAL: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b', label: '⏳ Under Eval' },
      BIDDING_OPEN: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8', label: '📝 Bidding Open' },
      AWARDED: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e', label: '✅ Awarded' },
    };
    return m[s] || { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8', label: s };
  };

  // ─── Flag tender handler ─────────────────────────────
  const [flagForm, setFlagForm] = useState({
    flag_type: '', severity: 'INVESTIGATION', reason: '', evidence_notes: '', recommended_action: 'FREEZE_TENDER',
  });

  const handleFlag = async () => {
    if (flagForm.reason.length < 100) return;
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
    } catch {}
  };

  // ─── Generate report ─────────────────────────────────
  const handleReport = async (tender?: any) => {
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
    } catch {}
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
                      {alert.tenderId && <button onClick={() => setFlagModal(ALL_TENDERS.find(t => t.id === alert.tenderId))} style={smBtn('#ef4444')}>🚩 Flag</button>}
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

      {/* ═══ AUDIT TRAIL TAB ═══ */}
      {activeTab === 'audit-trail' && <AuditTrailTab />}

      {/* ═══ INVESTIGATIONS TAB ═══ */}
      {activeTab === 'investigations' && <InvestigationsTab onReport={handleReport} />}

      {/* ═══ REPORTS TAB ═══ */}
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

// ═══ AUDIT TRAIL TAB ═══════════════════════════════════
function AuditTrailTab() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ministry, setMinistry] = useState('');
  const [severity, setSeverity] = useState('');
  const [actionType, setActionType] = useState('');
  const [search, setSearch] = useState('');
  const [mode, setMode] = useState('');

  const loadEvents = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (ministry) params.set('ministry', ministry);
    if (severity) params.set('severity', severity);
    if (actionType) params.set('action_type', actionType);
    if (search) params.set('search', search);
    try {
      const res = await fetch(`/api/auditor/audit-trail?${params}`);
      const data = await res.json();
      setEvents(data.events || []);
      setMode(data.mode || 'DEMO');
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { loadEvents(); }, []);

  const severityDot = (s: string) => {
    const c: Record<string,string> = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#eab308', INFO: '#64748b' };
    return c[s] || '#64748b';
  };
  const actionBadge = (a: string) => {
    const m: Record<string,{bg:string,color:string}> = {
      TENDER_AUTO_FROZEN: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
      BID_COMMITTED: { bg: 'rgba(255,153,51,0.15)', color: '#FF9933' },
      TENDER_PUBLISHED: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
      AI_ANALYSIS: { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
      OFFICER_OVERRIDE: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
      USER_REGISTERED: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
      REPORT_GENERATED: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
      CAG_FLAGGED: { bg: 'rgba(220,38,38,0.15)', color: '#dc2626' },
    };
    return m[a] || { bg: 'rgba(100,116,139,0.1)', color: '#94a3b8' };
  };
  const roleBadge = (r: string) => {
    const m: Record<string,{bg:string,color:string}> = {
      AI_SYSTEM: { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
      BIDDER: { bg: 'rgba(34,197,94,0.15)', color: '#22c55e' },
      MINISTRY_OFFICER: { bg: 'rgba(99,102,241,0.15)', color: '#818cf8' },
      CAG_AUDITOR: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
      SYSTEM: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
    };
    return m[r] || { bg: 'rgba(100,116,139,0.1)', color: '#94a3b8' };
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div><h2 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>📜 Complete Audit Trail</h2>
        <p style={{ fontSize: 11, color: '#64748b' }}>Every action across all ministries — immutable record | Mode: <span style={{ color: mode === 'SUPABASE' ? '#22c55e' : '#a78bfa' }}>{mode}</span></p></div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <select value={ministry} onChange={e => setMinistry(e.target.value)} style={selStyle}>
          <option value="">All Ministries</option>
          {['MoH','MoD','MoRTH','MeitY','MoE','MoF'].map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={actionType} onChange={e => setActionType(e.target.value)} style={selStyle}>
          <option value="">All Actions</option>
          {['tender','bid','ai','user','cag'].map(a => <option key={a} value={a}>{a.charAt(0).toUpperCase()+a.slice(1)} Actions</option>)}
        </select>
        <select value={severity} onChange={e => setSeverity(e.target.value)} style={selStyle}>
          <option value="">All Severity</option>
          {['CRITICAL','HIGH','MEDIUM','INFO'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tender ID or email..." style={{ ...selStyle, width: 'auto', flex: '1 1 150px' }} />
        <button onClick={loadEvents} style={{ ...smBtn('#6366f1'), padding: '6px 14px' }}>Apply</button>
      </div>

      {/* Timeline */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading audit trail...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {events.map((evt, i) => {
            const ab = actionBadge(evt.action_type);
            const rb = roleBadge(evt.actor_role);
            return (
              <div key={evt.id || i} style={{ display: 'flex', gap: 12 }}>
                {/* Timeline dot */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: severityDot(evt.severity), border: `2px solid ${severityDot(evt.severity)}40`, flexShrink: 0 }} />
                  {i < events.length - 1 && <div style={{ width: 1, flex: 1, background: 'rgba(255,255,255,0.06)' }} />}
                </div>
                {/* Event card */}
                <div style={{ flex: 1, background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 10, padding: '10px 14px', marginBottom: 4 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#475569' }}>{evt.timestamp_ist}</span>
                      <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: rb.bg, color: rb.color, fontWeight: 600 }}>{evt.actor_name}</span>
                      <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 4, background: ab.bg, color: ab.color, fontWeight: 600 }}>{evt.action_type}</span>
                      {evt.tender_id && <span style={{ fontSize: 9, color: '#64748b', fontFamily: 'monospace' }}>{evt.tender_id}</span>}
                      {evt.ministry && <span style={{ fontSize: 9, padding: '1px 4px', borderRadius: 3, background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>{evt.ministry}</span>}
                    </div>
                    {evt.risk_score !== null && evt.risk_score !== undefined && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: evt.risk_score > 70 ? '#ef4444' : evt.risk_score > 40 ? '#f59e0b' : '#22c55e' }}>
                        Risk: {evt.risk_score}
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, lineHeight: 1.4 }}>{evt.details}</p>
                  {evt.blockchain_tx && (
                    <div style={{ fontSize: 9, color: '#475569', fontFamily: 'monospace', marginTop: 3 }}>TX: {evt.blockchain_tx.slice(0, 32)}...</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══ INVESTIGATIONS TAB ════════════════════════════════
function InvestigationsTab({ onReport }: { onReport: (t?: any) => void }) {
  const INVESTIGATIONS = [
    { case_number: 'CAG-INV-2025-0042', tender_id: 'TDR-MoH-2025-000003', title: 'AIIMS Delhi Medical Equipment', ministry: 'MoH', value: 120, flagType: 'SHELL_COMPANY + BID_RIGGING', severity: 'CRITICAL', status: 'ACTIVE', openedBy: 'AI System + CAG Auditor', openedAt: '15 Mar 2025, 17:00 IST', lastUpdated: '2 hours ago', evidence: 4, txCount: 3, nextAction: 'Await ministry response by 22 Mar', assigned: 'Priya Gupta, Sr. Audit Officer' },
    { case_number: 'CAG-INV-2025-0041', tender_id: 'TDR-MoD-2025-000004', title: 'Border Roads Medical Supply', ministry: 'MoD', value: 62, flagType: 'TIMING_COLLUSION', severity: 'HIGH', status: 'UNDER_REVIEW', openedBy: 'CAG Auditor', openedAt: '14 Mar 2025', lastUpdated: '1 day ago', evidence: 2, txCount: 2, nextAction: 'Pending bidder response', assigned: 'Priya Gupta, Sr. Audit Officer' },
    { case_number: 'CAG-INV-2024-0389', tender_id: 'TDR-MoRTH-2024-000089', title: 'NH-44 Highway Phase 2', ministry: 'MoRTH', value: 320, flagType: 'SPEC_BIAS + FRONT_RUNNING', severity: 'INVESTIGATION', status: 'ESCALATED_TO_CVC', openedBy: 'CAG Auditor', openedAt: '12 Jan 2025', lastUpdated: '5 days ago', evidence: 8, txCount: 12, nextAction: 'Awaiting CVC response', assigned: 'Vijay Sharma, Principal Audit Officer' },
  ];

  const statusColor: Record<string,{bg:string,color:string}> = {
    ACTIVE: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    UNDER_REVIEW: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    ESCALATED_TO_CVC: { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
  };
  const sevColor: Record<string,string> = { CRITICAL: '#ef4444', HIGH: '#f59e0b', INVESTIGATION: '#a78bfa' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div><h2 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0' }}>🔍 Active Investigations</h2>
        <p style={{ fontSize: 11, color: '#64748b' }}>CAG Investigation Management — ₹{INVESTIGATIONS.reduce((s,i)=>s+i.value,0)} Cr under formal audit</p></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {INVESTIGATIONS.map(inv => {
          const sc = statusColor[inv.status] || { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' };
          return (
            <div key={inv.case_number} style={{ background: 'rgba(30,41,59,0.6)', border: `1px solid ${sevColor[inv.severity] || '#64748b'}25`, borderLeft: `3px solid ${sevColor[inv.severity] || '#64748b'}`, borderRadius: 14, padding: '16px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', fontFamily: 'monospace' }}>{inv.case_number}</span>
                  <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 6, background: `${sevColor[inv.severity]}15`, color: sevColor[inv.severity], fontWeight: 700 }}>{inv.severity}</span>
                  <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 6, background: sc.bg, color: sc.color, fontWeight: 600 }}>{inv.status.replace(/_/g, ' ')}</span>
                </div>
                <span style={{ fontSize: 10, color: '#64748b' }}>Updated: {inv.lastUpdated}</span>
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', marginBottom: 2 }}>{inv.title} — {inv.ministry}</h4>
              <p style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700, marginBottom: 8 }}>₹{inv.value} Crore | Opened: {inv.openedAt}</p>
              <div style={{ display: 'flex', gap: 8, fontSize: 11, color: '#94a3b8', marginBottom: 6, flexWrap: 'wrap' }}>
                <span>🚩 <strong style={{ color: '#e2e8f0' }}>{inv.flagType}</strong></span>
                <span>📎 Evidence: {inv.evidence}</span>
                <span>⛓️ TXs: {inv.txCount}</span>
                <span>👤 {inv.assigned}</span>
              </div>
              <div style={{ fontSize: 11, color: '#818cf8', marginBottom: 10 }}>⏳ Next: {inv.nextAction}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <button style={{ ...smBtn('#6366f1'), padding: '6px 12px' }}>View Details</button>
                <button style={{ ...smBtn('#f59e0b'), padding: '6px 12px' }}>Add Evidence</button>
                <button style={{ ...smBtn('#a78bfa'), padding: '6px 12px' }}>Update Status</button>
                <button onClick={() => onReport({ id: inv.tender_id, ministry: inv.ministry, value: inv.value, risk: inv.severity === 'CRITICAL' ? 94 : 72, title: inv.title })} style={{ ...smBtn('#22c55e'), padding: '6px 12px' }}>📄 Report</button>
                <button style={{ ...smBtn('#ef4444'), padding: '6px 12px' }}>Escalate</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══ REPORTS TAB ═══════════════════════════════════════
function ReportsTab({ onGenerate, loading }: { onGenerate: (t?: any) => void; loading: boolean }) {
  const REPORT_TYPES = [
    { icon: '📋', title: 'Tender Investigation Report', desc: 'Complete audit of one tender — all bids, actors, AI analysis, blockchain proof, Section 65B certificate.', type: 'tender' },
    { icon: '🏛️', title: 'Ministry Compliance Report', desc: 'Monthly compliance summary — risk distribution, fraud cases, officer performance.', type: 'ministry' },
    { icon: '📊', title: 'CAG Annual Summary', desc: 'All ministries, all tenders, fraud statistics — for CAG annual audit.', type: 'summary' },
  ];

  const RECENT_REPORTS = [
    { name: 'AIIMS Delhi Investigation', type: 'Tender', ministry: 'MoH', date: '15 Mar 2025', size: '2.4 MB' },
    { name: 'MoD Q1 Compliance', type: 'Ministry', ministry: 'MoD', date: '12 Mar 2025', size: '1.8 MB' },
    { name: 'NH-44 Fraud Evidence', type: 'Tender', ministry: 'MoRTH', date: '10 Mar 2025', size: '3.1 MB' },
    { name: 'MoH Monthly Summary', type: 'Ministry', ministry: 'MoH', date: '08 Mar 2025', size: '1.2 MB' },
    { name: 'MeitY Spec Bias Analysis', type: 'Tender', ministry: 'MeitY', date: '05 Mar 2025', size: '0.9 MB' },
    { name: 'Q4 2024 CAG Summary', type: 'Summary', ministry: 'All', date: '01 Mar 2025', size: '5.6 MB' },
    { name: 'MoF Infrastructure Review', type: 'Tender', ministry: 'MoF', date: '25 Feb 2025', size: '1.4 MB' },
  ];

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>📄 CAG Report Generator</h2>
      <p style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>Generate compliance reports with Section 65B certificate — court admissible</p>

      <div style={{ display: 'grid', gridTemplateColumns: typeof window !== 'undefined' && window.innerWidth < 768 ? '1fr' : 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {REPORT_TYPES.map(rt => (
          <div key={rt.type} style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>{rt.icon}</div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 4 }}>{rt.title}</h3>
            <p style={{ fontSize: 11, color: '#94a3b8', marginBottom: 12, lineHeight: 1.4 }}>{rt.desc}</p>
            <button onClick={() => onGenerate()} disabled={loading} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer', width: '100%' }}>
              {loading ? '⏳ Generating...' : 'Generate →'}
            </button>
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(30,41,59,0.6)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', marginBottom: 10 }}>📁 Recent Reports</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead><tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {['Report','Type','Ministry','Generated','Size',''].map(h =>
              <th key={h} style={{ textAlign: 'left', padding: '6px 4px', color: '#64748b', fontWeight: 600, fontSize: 10 }}>{h}</th>
            )}
          </tr></thead>
          <tbody>
            {RECENT_REPORTS.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '8px 4px', color: '#e2e8f0' }}>{r.name}</td>
                <td style={{ padding: '8px 4px' }}><span style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>{r.type}</span></td>
                <td style={{ padding: '8px 4px', color: '#94a3b8' }}>{r.ministry}</td>
                <td style={{ padding: '8px 4px', color: '#94a3b8' }}>{r.date}</td>
                <td style={{ padding: '8px 4px', color: '#64748b' }}>{r.size}</td>
                <td style={{ padding: '8px 4px' }}><button onClick={() => onGenerate()} style={smBtn('#6366f1')}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Shared Styles ─────────────────────────────────────
const smBtn = (color: string): React.CSSProperties => ({
  padding: '4px 10px', borderRadius: 6, border: `1px solid ${color}30`, background: `${color}10`, color, fontSize: 10, fontWeight: 600, cursor: 'pointer',
});
const selStyle: React.CSSProperties = {
  padding: '5px 8px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(30,41,59,0.8)', color: '#e2e8f0', fontSize: 11,
};
const inpStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(30,41,59,0.8)', color: '#e2e8f0', fontSize: 12,
};
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 4 };
