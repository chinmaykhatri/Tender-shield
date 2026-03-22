/**
 * TenderShield — Auto-Lock Enforcement Engine
 * Determines lock level based on AI risk score.
 * Called after every AI analysis completes.
 */

export interface LockDecision {
  should_lock: boolean;
  lock_level: 'NONE' | 'SOFT_LOCK' | 'HARD_LOCK' | 'FROZEN';
  reason: string;
  required_approvers: string[];
  justification_required: boolean;
}

export function determineLockLevel(riskScore: number): LockDecision {
  if (riskScore < 50) {
    return {
      should_lock: false,
      lock_level: 'NONE',
      reason: 'Risk within acceptable range',
      required_approvers: [],
      justification_required: false,
    };
  }

  if (riskScore < 70) {
    return {
      should_lock: false,
      lock_level: 'NONE',
      reason: 'Enhanced monitoring activated',
      required_approvers: [],
      justification_required: false,
    };
  }

  if (riskScore < 80) {
    return {
      should_lock: true,
      lock_level: 'SOFT_LOCK',
      reason: 'High risk — senior officer approval required before award',
      required_approvers: ['SENIOR_OFFICER'],
      justification_required: true,
    };
  }

  if (riskScore < 90) {
    return {
      should_lock: true,
      lock_level: 'HARD_LOCK',
      reason: 'Critical risk — CAG + senior officer dual approval required',
      required_approvers: ['CAG_AUDITOR', 'SENIOR_OFFICER'],
      justification_required: true,
    };
  }

  // Score >= 90
  return {
    should_lock: true,
    lock_level: 'FROZEN',
    reason: 'Extreme risk — tender frozen pending full CAG investigation',
    required_approvers: ['CAG_AUDITOR', 'NIC_ADMIN'],
    justification_required: true,
  };
}

/** Generate a mock blockchain transaction hash */
export function generateTxHash(): string {
  return (
    '0x' +
    Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
  );
}
