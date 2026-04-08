'use client';
import { smBtn } from './shared-styles';
import type { InvestigationCase, TenderItem } from '../types';

const INVESTIGATIONS: InvestigationCase[] = [
  { case_number: 'CAG-INV-2025-0042', tender_id: 'TDR-MoH-2025-000003', title: 'AIIMS Delhi Medical Equipment', ministry: 'MoH', value: 120, flagType: 'SHELL_COMPANY + BID_RIGGING', severity: 'CRITICAL', status: 'ACTIVE', openedBy: 'AI System + CAG Auditor', openedAt: '15 Mar 2025, 17:00 IST', lastUpdated: '2 hours ago', evidence: 4, txCount: 3, nextAction: 'Await ministry response by 22 Mar', assigned: 'Priya Gupta, Sr. Audit Officer' },
  { case_number: 'CAG-INV-2025-0041', tender_id: 'TDR-MoD-2025-000004', title: 'Border Roads Medical Supply', ministry: 'MoD', value: 62, flagType: 'TIMING_COLLUSION', severity: 'HIGH', status: 'UNDER_REVIEW', openedBy: 'CAG Auditor', openedAt: '14 Mar 2025', lastUpdated: '1 day ago', evidence: 2, txCount: 2, nextAction: 'Pending bidder response', assigned: 'Priya Gupta, Sr. Audit Officer' },
  { case_number: 'CAG-INV-2024-0389', tender_id: 'TDR-MoRTH-2024-000089', title: 'NH-44 Highway Phase 2', ministry: 'MoRTH', value: 320, flagType: 'SPEC_BIAS + FRONT_RUNNING', severity: 'INVESTIGATION', status: 'ESCALATED_TO_CVC', openedBy: 'CAG Auditor', openedAt: '12 Jan 2025', lastUpdated: '5 days ago', evidence: 8, txCount: 12, nextAction: 'Awaiting CVC response', assigned: 'Vijay Sharma, Principal Audit Officer' },
];

interface InvestigationsTabProps {
  onReport: (t?: Partial<TenderItem> & { risk?: number }) => void;
}

export default function InvestigationsTab({ onReport }: InvestigationsTabProps) {
  const statusColor: Record<string, { bg: string; color: string }> = {
    ACTIVE: { bg: 'rgba(239,68,68,0.15)', color: '#ef4444' },
    UNDER_REVIEW: { bg: 'rgba(245,158,11,0.15)', color: '#f59e0b' },
    ESCALATED_TO_CVC: { bg: 'rgba(167,139,250,0.15)', color: '#a78bfa' },
  };
  const sevColor: Record<string, string> = { CRITICAL: '#ef4444', HIGH: '#f59e0b', INVESTIGATION: '#a78bfa' };

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
