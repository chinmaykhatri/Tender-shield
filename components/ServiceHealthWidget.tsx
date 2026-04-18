'use client';

import { useState, useEffect } from 'react';

/**
 * ServiceHealthWidget - Granular Multi-Service Status
 *
 * Probes /api/health for Supabase + backend connectivity
 * and /api/mode/status for AI engine & service mode.
 *
 * Shows independent per-service status:
 *   Supabase  - DB connectivity
 *   AI Engine - NVIDIA NIM availability
 *   Audit Chain - Always online (SHA-256 local)
 */

interface ServiceStatus {
  name: string;
  status: 'online' | 'degraded' | 'offline' | 'checking';
  detail?: string;
}

const DOT_COLORS: Record<ServiceStatus['status'], string> = {
  online: '#4ade80',
  degraded: '#facc15',
  offline: '#f87171',
  checking: '#94a3b8',
};

const BG_COLORS: Record<ServiceStatus['status'], string> = {
  online: 'rgba(34,197,94,0.06)',
  degraded: 'rgba(234,179,8,0.06)',
  offline: 'rgba(239,68,68,0.06)',
  checking: 'rgba(148,163,184,0.06)',
};

export default function ServiceHealthWidget() {
  const [services, setServices] = useState<ServiceStatus[]>([
    { name: 'Supabase', status: 'checking' },
    { name: 'AI Engine', status: 'checking' },
    { name: 'Audit Chain', status: 'online', detail: 'SHA-256' },
  ]);

  useEffect(() => {
    let cancelled = false;

    async function probe() {
      // -- Probe 1: Supabase via /api/health --
      let supabaseStatus: ServiceStatus = { name: 'Supabase', status: 'offline' };
      try {
        const res = await fetch('/api/health', { signal: AbortSignal.timeout(8_000) });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          // Health endpoint returns { status, checks: { supabase: { status: 'ok' | 'degraded' | 'down' } } }
          const sbCheck = data.checks?.supabase;
          if (sbCheck?.status === 'ok') {
            supabaseStatus = { name: 'Supabase', status: 'online', detail: `${sbCheck.latency_ms || 0}ms` };
          } else if (sbCheck?.status === 'degraded') {
            supabaseStatus = { name: 'Supabase', status: 'degraded', detail: sbCheck.message || 'Slow' };
          } else if (data.status === 'healthy' || data.status === 'partial') {
            // Fallback: overall healthy means supabase is reachable
            supabaseStatus = { name: 'Supabase', status: 'online', detail: 'Connected' };
          } else {
            supabaseStatus = { name: 'Supabase', status: 'degraded', detail: sbCheck?.message || 'Check response' };
          }
        } else {
          supabaseStatus = { name: 'Supabase', status: 'degraded', detail: `HTTP ${res.status}` };
        }
      } catch {
        supabaseStatus = { name: 'Supabase', status: 'offline', detail: 'Unreachable' };
      }

      // -- Probe 2: AI Engine via /api/setup/check --
      let aiStatus: ServiceStatus = { name: 'AI Engine', status: 'offline', detail: 'No keys' };
      try {
        const res = await fetch('/api/setup/check', { signal: AbortSignal.timeout(5_000) });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          // setup/check returns { services: { 'nvidia-nim': { configured, label }, ... } }
          const svc = data.services || {};
          const nimEntry = svc['nvidia-nim'];
          if (nimEntry?.configured) {
            aiStatus = { name: 'AI Engine', status: 'online', detail: 'NVIDIA NIM' };
          } else {
            // Check if any AI provider is configured
            const geminiEntry = svc['gemini'];
            if (geminiEntry?.configured) {
              aiStatus = { name: 'AI Engine', status: 'online', detail: 'Gemini' };
            } else {
              aiStatus = { name: 'AI Engine', status: 'degraded', detail: 'Fallback mode' };
            }
          }
        }
      } catch {
        aiStatus = { name: 'AI Engine', status: 'degraded', detail: 'Check failed' };
      }

      // -- Probe 3: Audit Chain (always local) --
      const auditStatus: ServiceStatus = {
        name: 'Audit Chain',
        status: 'online',
        detail: 'SHA-256',
      };

      if (!cancelled) {
        setServices([supabaseStatus, aiStatus, auditStatus]);
      }
    }

    probe();
    const interval = setInterval(probe, 60_000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const overallStatus = services.every(s => s.status === 'online')
    ? 'online'
    : services.some(s => s.status === 'offline')
      ? 'offline'
      : 'degraded';

  return (
    <div
      className="mb-2 px-2 py-2 rounded-lg"
      style={{
        background: BG_COLORS[overallStatus],
        border: `1px solid ${DOT_COLORS[overallStatus]}22`,
      }}
    >
      <div className="text-[9px] font-semibold uppercase tracking-wider text-[var(--text-secondary)] mb-1.5 px-0.5">
        Services
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {services.map((svc) => (
          <div key={svc.name} className="flex items-center gap-1.5 px-0.5">
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: DOT_COLORS[svc.status],
                flexShrink: 0,
                animation: svc.status === 'checking' ? 'pulse 1.5s infinite' : undefined,
              }}
            />
            <span className="text-[10px] text-[var(--text-secondary)] flex-1 truncate">
              {svc.name}
            </span>
            {svc.detail && (
              <span className="text-[9px] opacity-60 truncate" style={{ maxWidth: 80 }}>
                {svc.detail}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
