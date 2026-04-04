// ─────────────────────────────────────────────────
// FILE: app/settings/page.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none — reads from /api/setup/check
// WHAT THIS FILE DOES: Admin settings page showing feature status, API health, and configuration
// ─────────────────────────────────────────────────
'use client';

import { useState, useEffect } from 'react';

interface ServiceInfo {
  configured: boolean; label: string; features: string[];
}

interface SetupStatus {
  services: Record<string, ServiceInfo>;
  total_configured: number; total_available: number; demo_mode: boolean;
}

export default function SettingsPage() {
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [activeTab, setActiveTab] = useState<'features' | 'security'>('features');

  useEffect(() => {
    fetch('/api/setup/check').then(r => r.json()).then(setStatus).catch(() => {});
  }, []);

  const features = [
    { id: 'F1', name: 'AI Document Scanner', api: 'anthropic', icon: '📄' },
    { id: 'F2', name: 'WhatsApp Alerts', api: 'twilio', icon: '📱' },
    { id: 'F3', name: 'Email Notifications', api: 'resend', icon: '📧' },
    { id: 'F4', name: 'India Fraud Heatmap', api: 'mapbox', icon: '🗺️' },
    { id: 'F5', name: 'Voice Audit Assistant', api: 'anthropic', icon: '🎤' },
    { id: 'F6', name: 'Push Notifications', api: 'onesignal', icon: '🔔' },
    { id: 'F7', name: 'AI Bid Price Predictor', api: 'anthropic', icon: '🤖' },
    { id: 'F8', name: 'CAG Audit Reports', api: 'anthropic', icon: '📊' },
    { id: 'F9', name: 'Natural Language Queries', api: 'anthropic', icon: '💬' },
    { id: 'F10', name: 'Bidder Reputation Score', api: null, icon: '🏢' },
    { id: 'F11', name: 'Cartel Evolution Timeline', api: null, icon: '🕸️' },
    { id: 'F12', name: 'Predictive Fraud Prevention', api: 'anthropic', icon: '🔮' },
    { id: 'F13', name: 'Ministry Scorecard', api: null, icon: '🏛️' },
    { id: 'F14', name: 'Commitment Verification Portal', api: null, icon: '🔐' },
    { id: 'F15', name: 'RTI Citizen Portal', api: null, icon: '🇮🇳' },
    { id: 'F16', name: 'Mobile PWA', api: null, icon: '📲' },
    { id: 'F17', name: 'Hindi Language Support', api: null, icon: '🗣️' },
    { id: 'F18', name: 'Impact Counter', api: null, icon: '💰' },
    { id: 'F19', name: 'Multi-Signature Approval', api: null, icon: '📝' },
    { id: 'F20', name: 'Role-Based Registration', api: null, icon: '✅' },
  ];

  const getFeatureStatus = (api: string | null) => {
    if (!api) return { status: 'active', color: '#22c55e', label: '✅ Active' };
    const isDemo = status?.demo_mode;
    if (isDemo) return { status: 'demo', color: '#f59e0b', label: '📌 Demo Mode' };
    const configured = status?.services?.[api]?.configured;
    if (configured) return { status: 'active', color: '#22c55e', label: '✅ Active' };
    return { status: 'inactive', color: '#dc2626', label: '❌ Needs API Key' };
  };

  const activeCount = features.filter(f => getFeatureStatus(f.api).status !== 'inactive').length;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] p-6 pt-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-display font-bold mb-1">⚙️ TenderShield Settings</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">{activeCount}/20 features active</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-[var(--bg-secondary)] rounded-xl">
          {(['features', 'security'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)]'}`}>
              {tab === 'features' ? '🎯 Features' : '🔒 Security'}
            </button>
          ))}
        </div>

        {activeTab === 'features' && (
          <div className="card-glass rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--bg-secondary)]">
                  <th className="p-3 text-left text-[10px] font-medium text-[var(--text-secondary)] uppercase">#</th>
                  <th className="p-3 text-left text-[10px] font-medium text-[var(--text-secondary)] uppercase">Feature</th>
                  <th className="p-3 text-left text-[10px] font-medium text-[var(--text-secondary)] uppercase">API</th>
                  <th className="p-3 text-left text-[10px] font-medium text-[var(--text-secondary)] uppercase">Status</th>
                </tr>
              </thead>
              <tbody>
                {features.map(f => {
                  const s = getFeatureStatus(f.api);
                  return (
                    <tr key={f.id} className="border-t border-[var(--border-subtle)]">
                      <td className="p-3 text-xs font-mono">{f.id}</td>
                      <td className="p-3 text-xs">{f.icon} {f.name}</td>
                      <td className="p-3 text-xs font-mono text-[var(--text-secondary)]">{f.api || 'None'}</td>
                      <td className="p-3"><span className="text-xs" style={{ color: s.color }}>{s.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="card-glass rounded-xl p-6 space-y-4">
            {[
              { label: 'Middleware Security Headers', status: '✅ Active', detail: 'X-Frame-Options, X-Content-Type-Options, Referrer-Policy' },
              { label: 'Key Leak Prevention', status: '✅ Active', detail: 'API responses scanned for accidental key exposure' },
              { label: 'NEXT_PUBLIC_ Separation', status: '✅ Enforced', detail: 'Secret keys restricted to /api routes only' },
              { label: 'Row Level Security (RLS)', status: '✅ Configured', detail: 'Supabase RLS policies for all tables' },
              { label: 'Role-Based Access', status: '✅ Active', detail: '4 roles: Officer, Bidder, Auditor, Admin' },
              { label: 'GSTIN / PAN / Aadhaar Validation', status: '✅ Active', detail: 'Registration validation with Verhoeff check' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-secondary)]">
                <span className="text-sm">{item.status}</span>
                <div><p className="text-xs font-medium">{item.label}</p><p className="text-[10px] text-[var(--text-secondary)]">{item.detail}</p></div>
              </div>
            ))}
          </div>
        )}



        <a href="/dashboard" className="block text-center text-sm text-[var(--accent)] hover:underline mt-6">← Back to Dashboard</a>
      </div>
    </div>
  );
}
