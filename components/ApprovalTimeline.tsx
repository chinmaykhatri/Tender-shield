// ─────────────────────────────────────────────────
// FILE: components/ApprovalTimeline.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none — calls /api/approvals
// WHAT THIS FILE DOES: Multi-signature approval timeline showing 3-level approval status
// ─────────────────────────────────────────────────
'use client';

import { useState, useEffect } from 'react';

interface Approval {
  level: number; role: string; name: string; status: 'APPROVED' | 'PENDING' | 'REJECTED';
  signed_at?: string; signature_hash?: string; comments?: string;
}

export default function ApprovalTimeline({ tenderId }: { tenderId: string }) {
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [currentState, setCurrentState] = useState('');

  useEffect(() => {
    fetch(`/api/approvals?tender_id=${tenderId}`)
      .then(r => r.json())
      .then(d => { setApprovals(d.approvals || []); setCurrentState(d.current_state || ''); })
      .catch(() => {});
  }, [tenderId]);

  if (!approvals.length) return null;

  return (
    <div className="card-glass rounded-xl p-5">
      <h3 className="font-semibold text-sm mb-4">📝 Multi-Signature Approval</h3>
      <div className="space-y-4">
        {approvals.map((a, i) => (
          <div key={i} className="flex gap-4">
            {/* Timeline dot + line */}
            <div className="flex flex-col items-center">
              <div className={`w-4 h-4 rounded-full ${a.status === 'APPROVED' ? 'bg-green-500' : a.status === 'REJECTED' ? 'bg-red-500' : 'bg-yellow-500 animate-pulse'}`} />
              {i < approvals.length - 1 && <div className="w-0.5 flex-1 bg-[var(--border-subtle)] mt-1" />}
            </div>
            {/* Content */}
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-bold ${a.status === 'APPROVED' ? 'text-green-400' : a.status === 'REJECTED' ? 'text-red-400' : 'text-yellow-400'}`}>
                  {a.status === 'APPROVED' ? '✅' : a.status === 'REJECTED' ? '❌' : '⏳'} Level {a.level} — {a.role}
                </span>
              </div>
              {a.name && <p className="text-xs text-[var(--text-secondary)]">{a.status === 'PENDING' ? `Pending since ${a.signed_at || 'now'}` : `${a.status === 'APPROVED' ? 'Approved' : 'Rejected'} by ${a.name}`}</p>}
              {a.signed_at && a.status !== 'PENDING' && <p className="text-[10px] text-[var(--text-secondary)]">{a.signed_at}</p>}
              {a.signature_hash && (
                <p className="text-[10px] font-mono text-[var(--text-secondary)] mt-1">Signature: {a.signature_hash.substring(0, 16)}... <span className="text-green-400">[Verified]</span></p>
              )}
              {a.comments && <p className="text-xs text-red-400 mt-1">{a.comments}</p>}
              {a.status === 'PENDING' && (
                <div className="flex gap-2 mt-2">
                  <button className="px-3 py-1 rounded bg-[var(--bg-secondary)] text-[10px]">Send Reminder</button>
                  <button className="px-3 py-1 rounded bg-yellow-500/10 text-yellow-400 text-[10px]">Escalate Delay</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
