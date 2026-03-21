// ─────────────────────────────────────────────────
// FILE: lib/fraudEventBus.ts
// TYPE: SHARED LIB
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Central fraud event coordinator — triggers all notification channels
// ─────────────────────────────────────────────────

type FraudListener = (event: FraudEvent) => void;

export interface FraudEvent {
  type: 'FRAUD_DETECTED' | 'TENDER_FROZEN' | 'AUDIT_REQUIRED' | 'SHELL_COMPANY' | 'BID_RIGGING';
  tender_id: string;
  tender_title: string;
  ministry: string;
  risk_score: number;
  risk_level: string;
  value_crore: number;
  flags: string[];
  timestamp: string;
}

class FraudEventBus {
  private listeners: Map<string, FraudListener[]> = new Map();

  on(event: string, listener: FraudListener): void {
    const list = this.listeners.get(event) || [];
    list.push(listener);
    this.listeners.set(event, list);
  }

  off(event: string, listener: FraudListener): void {
    const list = this.listeners.get(event) || [];
    this.listeners.set(event, list.filter(l => l !== listener));
  }

  async emit(event: FraudEvent): Promise<void> {
    const listeners = this.listeners.get(event.type) || [];
    const allListeners = this.listeners.get('*') || [];
    const combined = [...listeners, ...allListeners];

    for (const listener of combined) {
      try {
        listener(event);
      } catch (e) {
        console.error(`[FraudEventBus] Listener error for ${event.type}:`, e);
      }
    }

    // Trigger all notification channels in parallel
    if (event.risk_score >= 76) {
      const notificationPayload = {
        tender_id: event.tender_id,
        tender_title: event.tender_title,
        ministry: event.ministry,
        risk_score: event.risk_score,
        risk_level: event.risk_level,
        value_crore: event.value_crore,
        top_flags: event.flags,
      };

      await Promise.allSettled([
        fetch('/api/notifications/whatsapp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(notificationPayload) }),
        fetch('/api/notifications/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'FRAUD_ALERT', ...notificationPayload }) }),
        fetch('/api/notifications/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'FRAUD_ALERT', ...notificationPayload }) }),
      ]);
    }
  }
}

export const fraudEventBus = new FraudEventBus();
