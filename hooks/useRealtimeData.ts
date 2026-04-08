'use client';

import { useEffect, useState, useCallback } from 'react';
import { DEMO_MODE, DEMO_BLOCKCHAIN_FEED, supabase } from '@/lib/dataLayer';
import type { BlockchainEvent, Tender, DashboardStats } from '@/lib/types';

const EXTRA_DEMO_EVENTS = [
  { tx: "0xa1b2...c3d4", event: "BID_COMMITTED (sim)", ministry: "MoRTH", amount: "hidden", time: "", block: 0, type: "info" },
  { tx: "0xd5e6...f7a8", event: "TENDER_CREATED (sim)", ministry: "MoHUA", amount: "₹560 Cr", time: "", block: 0, type: "success" },
  { tx: "0xb9c0...d1e2", event: "COMMITMENT_VERIFIED (sim)", ministry: "MoE", amount: "✓ Valid", time: "", block: 0, type: "info" },
  { tx: "0xf3a4...b5c6", event: "AI_SCAN_COMPLETE (sim)", ministry: "MoD", amount: "Score: 12", time: "", block: 0, type: "success" },
  { tx: "0xc7d8...e9f0", event: "BID_REVEALED (sim)", ministry: "MoRTH", amount: "₹421 Cr", time: "", block: 0, type: "info" },
];

export function useBlockchainFeed() {
  const [feed, setFeed] = useState<BlockchainEvent[]>(DEMO_MODE ? [...DEMO_BLOCKCHAIN_FEED] : []);

  useEffect(() => {
    if (DEMO_MODE) {
      // Sync with blockchain API: same genesis + interval so block numbers match
      const GENESIS = new Date('2025-01-15T00:00:00+05:30').getTime();
      const BLOCK_INTERVAL = 8000; // 8s per block — matches api/blockchain/blocks/route.ts

      const interval = setInterval(() => {
        const currentBlock = Math.floor((Date.now() - GENESIS) / BLOCK_INTERVAL);
        const randomEvent = EXTRA_DEMO_EVENTS[Math.floor(Math.random() * EXTRA_DEMO_EVENTS.length)];
        const now = new Date();
        const newEvent = {
          ...randomEvent,
          time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`,
          block: currentBlock,
          tx: "0x" + Math.random().toString(16).slice(2, 6) + "..." + Math.random().toString(16).slice(2, 6),
        };
        setFeed(prev => [newEvent, ...prev].slice(0, 20));
      }, 5000);
      return () => clearInterval(interval);
    } else {
      // Real mode: Supabase real-time subscription
      const channel = supabase
        .channel('audit-events-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_events' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase SDK payload type
          (payload: any) => {
            setFeed(prev => [payload.new, ...prev].slice(0, 20));
          }
        )
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, []);

  return feed;
}

export function useTendersRealtime(initialTenders: Tender[]) {
  const [tenders, setTenders] = useState<Tender[]>(initialTenders);

  useEffect(() => {
    setTenders(initialTenders);
  }, [initialTenders]);

  useEffect(() => {
    if (DEMO_MODE) return;
    const channel = supabase
      .channel('tenders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenders' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase SDK payload type
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            setTenders(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setTenders(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return tenders;
}

export function useLiveStats(initialStats: DashboardStats | null) {
  const [stats, setStats] = useState<DashboardStats | null>(initialStats);

  useEffect(() => {
    if (!initialStats) return;
    // Sync local state when parent provides new data.
    // In demo mode, force tps to 0 (no Fabric peers running).
    if (DEMO_MODE) {
      setStats({ ...initialStats, tps: 0 });
    } else {
      setStats(initialStats);
    }
  }, [initialStats]);

  return stats;
}
