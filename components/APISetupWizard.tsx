// ─────────────────────────────────────────────────
// FILE: components/APISetupWizard.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none — all validation via /api/setup/validate
// WHAT THIS FILE DOES: Multi-step wizard to guide users through API key setup
// ─────────────────────────────────────────────────
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ServiceStatus {
  configured: boolean;
  label: string;
  features: string[];
}

interface SetupStatus {
  services: Record<string, ServiceStatus>;
  total_configured: number;
  total_available: number;
  demo_mode: boolean;
}

const SERVICE_CONFIG = [
  {
    id: 'anthropic', icon: '🤖', color: '#6366f1',
    instructions: [
      'Go to console.anthropic.com',
      'Click Sign Up (free, get $5 credits)',
      'Click API Keys → Create Key → Copy',
    ],
    keyPlaceholder: 'sk-ant-api03-...',
    fields: [{ name: 'key', label: 'API Key', type: 'password' }],
  },
  {
    id: 'twilio', icon: '📱', color: '#22c55e',
    instructions: [
      'Go to twilio.com → Sign up',
      'Go to Console Dashboard',
      'Copy Account SID + Auth Token',
    ],
    keyPlaceholder: 'AC...',
    fields: [
      { name: 'extra', label: 'Account SID', type: 'text' },
      { name: 'key', label: 'Auth Token', type: 'password' },
    ],
  },
  {
    id: 'resend', icon: '📧', color: '#f59e0b',
    instructions: [
      'Go to resend.com → Sign up',
      'Go to API Keys → Create Key',
      'Copy the key (starts with re_)',
    ],
    keyPlaceholder: 're_xxxxxxxx',
    fields: [{ name: 'key', label: 'API Key', type: 'password' }],
  },
  {
    id: 'mapbox', icon: '🗺️', color: '#3b82f6',
    instructions: [
      'Go to mapbox.com → Sign up',
      'Go to Account → Access Tokens',
      'Copy your public token (starts with pk.)',
    ],
    keyPlaceholder: 'pk.eyJ1...',
    fields: [{ name: 'key', label: 'Public Token', type: 'text' }],
  },
  {
    id: 'onesignal', icon: '🔔', color: '#ef4444',
    instructions: [
      'Go to onesignal.com → Create App',
      'Go to Keys & IDs',
      'Copy App ID (UUID format)',
    ],
    keyPlaceholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    fields: [{ name: 'key', label: 'App ID', type: 'text' }],
  },
];

export default function APISetupWizard({ onComplete }: { onComplete?: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(0); // 0=welcome, 1-5=services, 6=complete
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; error?: string } | null>(null);
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<Record<string, 'active' | 'skipped' | 'pending'>>({});

  useEffect(() => {
    fetch('/api/setup/check')
      .then(r => r.json())
      .then(data => {
        setStatus(data);
        const r: Record<string, 'active' | 'skipped' | 'pending'> = {};
        Object.entries(data.services).forEach(([k, v]) => {
          r[k] = (v as ServiceStatus).configured ? 'active' : 'pending';
        });
        setResults(r);
      })
      .catch(() => {});
  }, []);

  const currentService = step >= 1 && step <= 5 ? SERVICE_CONFIG[step - 1] : null;

  const handleTest = async () => {
    if (!currentService) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/setup/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          service: currentService.id,
          key: fieldValues.key || '',
          extra: fieldValues.extra || '',
        }),
      });
      const data = await res.json();
      setTestResult(data);
      if (data.valid) {
        setResults(prev => ({ ...prev, [currentService.id]: 'active' }));
      }
    } catch {
      setTestResult({ valid: false, error: 'Network error' });
    }
    setTesting(false);
  };

  const handleSkip = () => {
    if (currentService) {
      setResults(prev => ({ ...prev, [currentService.id]: 'skipped' }));
    }
    setFieldValues({});
    setTestResult(null);
    setStep(prev => prev + 1);
  };

  const handleNext = () => {
    setFieldValues({});
    setTestResult(null);
    setStep(prev => prev + 1);
  };

  const activeCount = Object.values(results).filter(v => v === 'active').length;
  const totalFeatures = 20;
  const activeFeatures = 10 + activeCount * 2; // base + 2 features per API

  // Welcome screen
  if (step === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <div className="w-full max-w-lg card-glass p-10 text-center animate-fade-in">
          <div className="text-5xl mb-4">🛡️</div>
          <h2 className="text-2xl font-display font-bold mb-2">TenderShield Setup</h2>
          <p className="text-[var(--text-secondary)] mb-6">
            Add API keys to unlock all 20 features.<br />
            Takes about 15 minutes. All keys are free.
          </p>
          <div className="space-y-3 text-left text-sm mb-8">
            {[
              { icon: '🔐', text: 'Keys stored encrypted — never in browser' },
              { icon: '✅', text: 'Each key tested before saving' },
              { icon: '⏭️', text: 'Skip any key to use demo mode instead' },
            ].map(item => (
              <div key={item.text} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-secondary)]">
                <span>{item.icon}</span><span className="text-[var(--text-secondary)]">{item.text}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => { onComplete?.(); }} className="flex-1 py-3 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)] transition-all text-sm font-medium">
              Skip — Use Demo Mode
            </button>
            <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl bg-[var(--accent)] text-white font-medium text-sm transition-all hover:brightness-110">
              Start Setup →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Complete screen
  if (step === 6) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
        <div className="w-full max-w-lg card-glass p-10 text-center animate-fade-in">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-display font-bold mb-4">Setup Complete!</h2>
          <div className="space-y-2 text-left mb-6">
            {SERVICE_CONFIG.map(svc => {
              const r = results[svc.id];
              return (
                <div key={svc.id} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-secondary)]">
                  <span>{svc.icon}</span>
                  <span className="flex-1 text-sm">{status?.services[svc.id]?.label || svc.id}</span>
                  {r === 'active' ? <span className="text-green-400 text-sm">✅ Active</span> :
                    r === 'skipped' ? <span className="text-yellow-400 text-sm">⏭️ Skipped</span> :
                    <span className="text-gray-500 text-sm">⏳ Pending</span>}
                </div>
              );
            })}
          </div>
          <div className="mb-6">
            <p className="text-sm text-[var(--text-secondary)]">Features active: {activeFeatures} / {totalFeatures}</p>
            <div className="risk-meter mt-2">
              <div className="risk-meter-fill" style={{ width: `${(activeFeatures / totalFeatures) * 100}%`, background: 'linear-gradient(90deg, #6366f1, #22c55e)' }} />
            </div>
          </div>
          <button onClick={() => { onComplete?.(); router.push('/dashboard'); }} className="w-full py-3 rounded-xl bg-[var(--accent)] text-white font-medium text-sm transition-all hover:brightness-110">
            Go to Dashboard →
          </button>
        </div>
      </div>
    );
  }

  // Service screens (1-5)
  const svc = currentService!;
  const svcStatus = status?.services[svc.id];
  const progress = (step / 6) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="w-full max-w-lg card-glass p-8 animate-fade-in">
        {/* Progress */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[var(--text-secondary)]">Step {step} of 6</span>
          <span className="text-xs text-[var(--text-secondary)]">{Math.round(progress)}%</span>
        </div>
        <div className="risk-meter mb-6">
          <div className="risk-meter-fill" style={{ width: `${progress}%`, background: svc.color }} />
        </div>

        {/* Service Header */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{svc.icon}</span>
          <div>
            <h3 className="text-lg font-semibold" style={{ color: svc.color }}>{svcStatus?.label || svc.id}</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Unlocks: {svcStatus?.features?.join(', ')}
            </p>
          </div>
        </div>

        {/* Already configured */}
        {svcStatus?.configured && (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm mb-4">
            ✅ Already configured in environment variables
          </div>
        )}

        {/* Instructions */}
        <div className="p-4 rounded-xl bg-[var(--bg-secondary)] mb-4">
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-2">How to get this key ({svc.instructions.length} steps):</p>
          <ol className="list-decimal pl-4 space-y-1 text-sm text-[var(--text-secondary)]">
            {svc.instructions.map((inst, i) => <li key={i}>{inst}</li>)}
          </ol>
        </div>

        {/* Input Fields */}
        <div className="space-y-3 mb-4">
          {svc.fields.map(field => (
            <div key={field.name}>
              <label className="block text-sm text-[var(--text-secondary)] mb-1">{field.label}</label>
              <div className="relative">
                <input
                  type={showKey[field.name] ? 'text' : field.type}
                  className="input-field pr-10"
                  placeholder={field.name === 'key' ? svc.keyPlaceholder : ''}
                  value={fieldValues[field.name] || ''}
                  onChange={e => setFieldValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                />
                {field.type === 'password' && (
                  <button
                    onClick={() => setShowKey(prev => ({ ...prev, [field.name]: !prev[field.name] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-white"
                  >
                    {showKey[field.name] ? '🙈' : '👁️'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Test Button */}
        <button onClick={handleTest} disabled={testing || !fieldValues.key}
          className="w-full py-2.5 rounded-xl bg-[var(--bg-secondary)] text-sm font-medium mb-3 transition-all hover:bg-[var(--bg-card)] disabled:opacity-50"
          style={{ borderColor: svc.color, borderWidth: 1 }}>
          {testing ? '⏳ Testing...' : '🔍 Test This Key'}
        </button>

        {/* Test Result */}
        {testResult && (
          <div className={`p-3 rounded-lg text-sm mb-4 ${testResult.valid ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
            {testResult.valid ? `✅ ${svcStatus?.label} connected!` : `❌ ${testResult.error}`}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          <button onClick={() => { setStep(Math.max(0, step - 1)); setFieldValues({}); setTestResult(null); }}
            className="py-2.5 px-5 rounded-xl bg-[var(--bg-secondary)] text-sm">
            ← Back
          </button>
          <button onClick={handleSkip}
            className="flex-1 py-2.5 rounded-xl bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-sm">
            Skip This Key
          </button>
          <button onClick={handleNext}
            className="flex-1 py-2.5 rounded-xl text-white text-sm font-medium transition-all hover:brightness-110"
            style={{ background: svc.color }}>
            {testResult?.valid ? 'Save & Next →' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
