'use client';
import { useState, useEffect } from 'react';
import { smBtn, selStyle } from './shared-styles';
import type { AuditEvent } from '../types';

export default function AuditTrailTab() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
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
    } catch { /* handled */ } finally { setLoading(false); }
  };

  useEffect(() => { loadEvents(); }, []);

  const severityDot = (s: string) => {
    const c: Record<string, string> = { CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#eab308', INFO: '#64748b' };
    return c[s] || '#64748b';
  };
  const actionBadge = (a: string) => {
    const m: Record<string, { bg: string; color: string }> = {
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
    const m: Record<string, { bg: string; color: string }> = {
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
