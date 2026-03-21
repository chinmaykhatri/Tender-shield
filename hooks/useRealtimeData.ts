'use client';

import { useEffect, useState, useCallback } from 'react';
import { DEMO_MODE, DEMO_BLOCKCHAIN_FEED, supabase } from '@/lib/dataLayer';

const EXTRA_DEMO_EVENTS = [
  { tx: "0xa1b2...c3d4", event: "BID_COMMITTED", ministry: "MoRTH", amount: "hidden", time: "", block: 0, type: "info" },
  { tx: "0xd5e6...f7a8", event: "TENDER_CREATED", ministry: "MoHUA", amount: "₹560 Cr", time: "", block: 0, type: "success" },
  { tx: "0xb9c0...d1e2", event: "ZKP_VERIFIED", ministry: "MoE", amount: "✓ Valid", time: "", block: 0, type: "info" },
  { tx: "0xf3a4...b5c6", event: "AI_SCAN_COMPLETE", ministry: "MoD", amount: "Score: 12", time: "", block: 0, type: "success" },
  { tx: "0xc7d8...e9f0", event: "BID_REVEALED", ministry: "MoRTH", amount: "₹421 Cr", time: "", block: 0, type: "info" },
];

export function useBlockchainFeed() {
  const [feed, setFeed] = useState(DEMO_MODE ? [...DEMO_BLOCKCHAIN_FEED] : []);

  useEffect(() => {
    if (DEMO_MODE) {
      let blockNum = 1339;
      const interval = setInterval(() => {
        const randomEvent = EXTRA_DEMO_EVENTS[Math.floor(Math.random() * EXTRA_DEMO_EVENTS.length)];
        const now = new Date();
        const newEvent = {
          ...randomEvent,
          time: `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`,
          block: blockNum++,
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

export function useTendersRealtime(initialTenders: any[]) {
  const [tenders, setTenders] = useState(initialTenders);

  useEffect(() => {
    setTenders(initialTenders);
  }, [initialTenders]);

  useEffect(() => {
    if (DEMO_MODE) return;
    const channel = supabase
      .channel('tenders-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tenders' },
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

export function useLiveStats(initialStats: any) {
  const [stats, setStats] = useState(initialStats);

  useEffect(() => {
    setStats(initialStats);
  }, [initialStats]);

  useEffect(() => {
    if (!DEMO_MODE || !stats) return;
    const interval = setInterval(() => {
      setStats((prev: any) => ({
        ...prev,
        blockchain_tx_today: (prev?.blockchain_tx_today || 127) + Math.floor(Math.random() * 3),
        bids_received_today: (prev?.bids_received_today || 23) + (Math.random() > 0.7 ? 1 : 0),
        tps: 120 + Math.floor(Math.random() * 20),
      }));
    }, 10000);
    return () => clearInterval(interval);
  }, [stats]);

  return stats;
}
