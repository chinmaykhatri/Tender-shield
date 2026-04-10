'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

// ═══════════════════════════════════════════════════════════
// TenderShield — Real-Time Fraud Alert Hook
// Subscribes to Supabase Realtime on audit_events table
// Pushes toast notifications for HIGH/CRITICAL severity events
// ═══════════════════════════════════════════════════════════

interface RealtimeAlert {
  id: string;
  action_type: string;
  severity: string;
  details: string;
  tender_id: string | null;
  ministry: string | null;
  actor_name: string | null;
  timestamp_ist: string;
}

export function useRealtimeAlerts() {
  const [alerts, setAlerts] = useState<RealtimeAlert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const channel = supabase
      .channel('fraud-alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_events',
        },
        (payload) => {
          const event = payload.new as any;

          // Only alert on significant events
          const alertSeverities = ['HIGH', 'CRITICAL'];
          const alertActions = [
            'FRAUD_FLAG', 'FRAUD_DETECTED', 'BID_RIGGING_DETECTED',
            'SHELL_COMPANY_DETECTED', 'TENDER_FROZEN', 'ESCALATION',
            'WHISTLEBLOWER_REPORT', 'ANOMALY_DETECTED',
          ];

          const shouldAlert =
            alertSeverities.includes(event.severity) ||
            alertActions.some((a: string) => event.action_type?.includes(a));

          if (!shouldAlert) return;

          const newAlert: RealtimeAlert = {
            id: event.id || crypto.randomUUID(),
            action_type: event.action_type || 'ALERT',
            severity: event.severity || 'MEDIUM',
            details: event.details || 'New audit event detected',
            tender_id: event.tender_id,
            ministry: event.ministry,
            actor_name: event.actor_name,
            timestamp_ist: event.timestamp_ist || new Date().toISOString(),
          };

          setAlerts((prev) => [newAlert, ...prev].slice(0, 50));
          setUnreadCount((prev) => prev + 1);

          // Show toast notification
          const isCritical = event.severity === 'CRITICAL';
          const icon = isCritical ? '🚨' : '⚠️';
          const label = event.action_type?.replace(/_/g, ' ') || 'Fraud Alert';
          const detail = (event.details || '').slice(0, 80);
          const tenderId = event.tender_id ? ` [${event.tender_id}]` : '';

          if (isCritical) {
            toast.error(`${icon} ${event.severity}: ${label}\n${detail}${tenderId}`, {
              duration: 8000,
              position: 'top-right',
              style: {
                background: '#1a0a0a',
                color: '#f87171',
                border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: 14,
                padding: '14px 18px',
                fontSize: 12,
                maxWidth: 380,
                boxShadow: '0 8px 32px rgba(239,68,68,0.2)',
              },
            });
          } else {
            toast(` ${icon} ${event.severity}: ${label}\n${detail}${tenderId}`, {
              duration: 5000,
              position: 'top-right',
              style: {
                background: '#1a1625',
                color: '#f59e0b',
                border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 14,
                padding: '14px 18px',
                fontSize: 12,
                maxWidth: 380,
                boxShadow: '0 8px 32px rgba(99,102,241,0.15)',
              },
            });
          }

          // Audio beep for CRITICAL via Web Audio API
          if (isCritical && typeof window !== 'undefined') {
            try {
              const ctx = new AudioContext();
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.frequency.value = 800;
              gain.gain.value = 0.1;
              osc.start();
              setTimeout(() => osc.stop(), 200);
            } catch {
              // Audio not available
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const dismiss = () => setUnreadCount(0);
  const clearAll = () => { setAlerts([]); setUnreadCount(0); };

  return { alerts, unreadCount, dismiss, clearAll };
}
