// ─────────────────────────────────────────────────
// FILE: components/FeatureGate.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Wraps features with graceful fallback when required API key is missing
// ─────────────────────────────────────────────────
'use client';

import { useState, useEffect, ReactNode } from 'react';

interface FeatureGateProps {
  featureId: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function FeatureGate({ featureId, children, fallback }: FeatureGateProps) {
  const [status, setStatus] = useState<{ enabled: boolean; name: string; requires: string } | null>(null);

  useEffect(() => {
    fetch('/api/setup/check')
      .then(r => r.json())
      .then(data => {
        const isDemo = data.demo_mode;
        // In demo mode, all features are enabled
        if (isDemo) {
          setStatus({ enabled: true, name: featureId, requires: '' });
          return;
        }
        // Check specific service requirements
        const serviceMap: Record<string, string> = {
          ai_scanner: 'anthropic', whatsapp: 'twilio', email: 'resend',
          heatmap: 'mapbox', voice: 'anthropic', push: 'onesignal',
          price_predictor: 'anthropic', cag_reports: 'anthropic',
          nl_queries: 'anthropic', predictive_fraud: 'anthropic',
        };
        const svcId = serviceMap[featureId];
        if (!svcId) {
          setStatus({ enabled: true, name: featureId, requires: '' });
          return;
        }
        const svc = data.services?.[svcId];
        setStatus({ enabled: svc?.configured ?? false, name: svc?.label || featureId, requires: svcId });
      })
      .catch(() => setStatus({ enabled: true, name: featureId, requires: '' }));
  }, [featureId]);

  if (!status) return null; // loading
  if (status.enabled) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <div className="card-glass rounded-xl p-6 text-center">
      <p className="text-2xl mb-3">🔒</p>
      <h3 className="font-semibold text-sm mb-1">{status.name} — Not Configured</h3>
      <p className="text-xs text-[var(--text-secondary)] mb-3">
        This feature requires the <span className="font-mono text-[var(--accent)]">{status.requires}</span> API key.
      </p>
      <a href="/dashboard/admin" className="btn-primary text-xs py-2 px-4 inline-block">Go to Setup →</a>
    </div>
  );
}
