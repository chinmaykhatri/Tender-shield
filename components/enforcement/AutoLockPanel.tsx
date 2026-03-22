'use client';

import { useState } from 'react';

interface Approval {
  approver_id: string;
  approver_role: string;
  justification: string;
  approved_at: string;
  blockchain_tx: string;
}

interface LockData {
  tender_id: string;
  lock_level: 'SOFT_LOCK' | 'HARD_LOCK' | 'FROZEN';
  lock_reason: string;
  risk_score: number;
  required_approvers: string[];
  approvals_received: Approval[];
  blockchain_tx: string;
  status: string;
}

interface AutoLockPanelProps {
  lockData: LockData | null;
  userRole?: string;
  userId?: string;
  demo?: boolean;
}

const LOCK_COLORS = {
  SOFT_LOCK: { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.3)', text: '#fbbf24', glow: 'rgba(251,191,36,0.15)' },
  HARD_LOCK: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.3)', text: '#ef4444', glow: 'rgba(239,68,68,0.15)' },
  FROZEN: { bg: 'rgba(147,51,234,0.08)', border: 'rgba(147,51,234,0.3)', text: '#9333ea', glow: 'rgba(147,51,234,0.15)' },
};

const ROLE_LABELS: Record<string, string> = {
  SENIOR_OFFICER: 'Senior Officer',
  CAG_AUDITOR: 'CAG Auditor',
  NIC_ADMIN: 'NIC Admin',
};

// Demo lock data
const DEMO_LOCK: LockData = {
  tender_id: 'TDR-MoH-2025-000003',
  lock_level: 'HARD_LOCK',
  lock_reason: 'Critical risk — CAG + senior officer dual approval required',
  risk_score: 94,
  required_approvers: ['CAG_AUDITOR', 'SENIOR_OFFICER'],
  approvals_received: [
    {
      approver_id: 'off_001',
      approver_role: 'SENIOR_OFFICER',
      justification: 'Reviewed AI analysis and confirmed irregularities. Tender should remain under scrutiny but bidding committee has verified technical compliance separately.',
      approved_at: '2025-03-10T14:32:00+05:30',
      blockchain_tx: '0x7a3b2c1d9e8f7a6b5c4d3e2f1a0b9c8d',
    },
  ],
  blockchain_tx: '0x2e5c8b1d4a7f3c9e1b5d8a2f4e7c0b3d',
  status: 'LOCKED_PENDING_APPROVAL',
};

export default function AutoLockPanel({
  lockData: propLockData,
  userRole = 'CAG_AUDITOR',
  userId = 'demo_user',
  demo = true,
}: AutoLockPanelProps) {
  const lockData = propLockData || (demo ? DEMO_LOCK : null);
  const [showModal, setShowModal] = useState(false);
  const [justification, setJustification] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!lockData) return null;

  const isUnlocked = lockData.status === 'UNLOCKED_BY_APPROVAL';
  const colors = LOCK_COLORS[lockData.lock_level];
  const approvedRoles = lockData.approvals_received.map((a) => a.approver_role);
  const canApprove =
    lockData.required_approvers.includes(userRole) &&
    !approvedRoles.includes(userRole);

  const handleApprove = async () => {
    if (justification.trim().length < 50) return;
    setSubmitting(true);

    try {
      const res = await fetch('/api/enforcement/approve-unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tender_id: lockData.tender_id,
          approver_id: userId,
          approver_role: userRole,
          justification: justification.trim(),
        }),
      });

      if (res.ok) {
        setSubmitted(true);
        setShowModal(false);
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  if (isUnlocked || submitted) {
    return (
      <div
        style={{
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.3)',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(34,197,94,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
            }}
          >
            ✅
          </div>
          <div>
            <p style={{ fontWeight: 700, color: '#22c55e', fontSize: '15px' }}>
              UNLOCKED — All Approvals Received
            </p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
              Tender returned to BIDDING_OPEN status
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: `0 0 40px ${colors.glow}`,
          animation: lockData.lock_level === 'FROZEN' ? 'pulse 2s infinite' : undefined,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                background: colors.glow,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
              }}
            >
              {lockData.lock_level === 'FROZEN' ? '🧊' : '🔒'}
            </div>
            <div>
              <p style={{ fontWeight: 700, color: colors.text, fontSize: '16px', letterSpacing: '0.5px' }}>
                {lockData.lock_level === 'FROZEN'
                  ? 'FROZEN BY AI — UNDER INVESTIGATION'
                  : 'LOCKED BY AI — AWARD BLOCKED'}
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                {lockData.lock_reason}
              </p>
            </div>
          </div>

          <div
            style={{
              background: colors.glow,
              borderRadius: '12px',
              padding: '8px 16px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '24px', fontWeight: 800, color: colors.text }}>
              {lockData.risk_score}
            </p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
              Risk Score
            </p>
          </div>
        </div>

        {/* Required Approvals */}
        <div style={{ marginBottom: '16px' }}>
          <p
            style={{
              fontSize: '11px',
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              marginBottom: '10px',
            }}
          >
            Required Approvals
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {lockData.required_approvers.map((role) => {
              const approval = lockData.approvals_received.find(
                (a) => a.approver_role === role
              );
              const isApproved = !!approval;

              return (
                <div
                  key={role}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    background: isApproved
                      ? 'rgba(34,197,94,0.08)'
                      : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${isApproved ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>
                      {isApproved ? '●' : '○'}
                    </span>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: isApproved
                          ? '#22c55e'
                          : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {ROLE_LABELS[role] || role}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    {isApproved
                      ? `Approved — ${new Date(approval.approved_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })} IST`
                      : 'Pending'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Blockchain TX */}
        <div
          style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.3)',
            fontFamily: 'monospace',
            padding: '8px 12px',
            background: 'rgba(0,0,0,0.2)',
            borderRadius: '8px',
            marginBottom: '16px',
          }}
        >
          🔗 Blockchain TX: {lockData.blockchain_tx.slice(0, 18)}...
          {lockData.blockchain_tx.slice(-8)}
        </div>

        {/* Approve Button */}
        {canApprove && (
          <button
            onClick={() => setShowModal(true)}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: `1px solid ${colors.border}`,
              background: colors.glow,
              color: colors.text,
              fontWeight: 700,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Submit Your Approval →
          </button>
        )}

        {demo && (
          <div
            style={{
              marginTop: '12px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.2)',
              fontSize: '11px',
              color: 'rgba(59,130,246,0.7)',
              textAlign: 'center',
            }}
          >
            🎯 DEMO MODE — Actions simulated
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#1a1a2e',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '520px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
          >
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 700,
                marginBottom: '8px',
                color: '#fff',
              }}
            >
              Submit Approval
            </h3>
            <p
              style={{
                fontSize: '13px',
                color: 'rgba(255,255,255,0.5)',
                marginBottom: '20px',
              }}
            >
              Your justification will be permanently recorded on Hyperledger
              Fabric and cannot be edited or deleted.
            </p>

            <textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Written justification (minimum 50 characters). Explain why you approve unlocking this tender despite the AI risk assessment..."
              style={{
                width: '100%',
                minHeight: '140px',
                padding: '14px',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.03)',
                color: '#fff',
                fontSize: '13px',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'inherit',
              }}
            />

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '12px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  color:
                    justification.trim().length >= 50
                      ? '#22c55e'
                      : 'rgba(255,255,255,0.3)',
                }}
              >
                {justification.trim().length}/50 characters
              </span>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'transparent',
                    color: 'rgba(255,255,255,0.6)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={justification.trim().length < 50 || submitting}
                  style={{
                    padding: '10px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background:
                      justification.trim().length >= 50
                        ? 'linear-gradient(135deg, #22c55e, #16a34a)'
                        : 'rgba(255,255,255,0.05)',
                    color:
                      justification.trim().length >= 50
                        ? '#fff'
                        : 'rgba(255,255,255,0.3)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor:
                      justification.trim().length >= 50
                        ? 'pointer'
                        : 'not-allowed',
                    opacity: submitting ? 0.6 : 1,
                  }}
                >
                  {submitting ? 'Recording...' : 'Confirm Approval'}
                </button>
              </div>
            </div>

            <p
              style={{
                fontSize: '11px',
                color: 'rgba(239,68,68,0.6)',
                marginTop: '16px',
                textAlign: 'center',
              }}
            >
              ⚠️ This action is irreversible and recorded on blockchain
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
      `}</style>
    </>
  );
}
