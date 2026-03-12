'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { login, getDemoUsers } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const { login: storeLogin, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoUsers, setDemoUsers] = useState<any[]>([]);

  useEffect(() => {
    if (isAuthenticated) router.push('/dashboard');
  }, [isAuthenticated, router]);

  useEffect(() => {
    getDemoUsers().then(res => setDemoUsers(res.demo_users || [])).catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(email, password);
      storeLogin(res.access_token, res.role, res.org, res.name);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (userEmail: string, pwd: string) => {
    setEmail(userEmail);
    setPassword(pwd);
  };

  const rolePasswords: Record<string, string> = {
    OFFICER: 'Tender@2025',
    BIDDER: 'Bid@2025',
    AUDITOR: 'Audit@2025',
    NIC_ADMIN: 'Admin@2025',
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ paddingTop: '4px' }}>
      {/* Background Grid */}
      <div className="fixed inset-0 opacity-5" style={{
        backgroundImage: 'linear-gradient(rgba(99,102,241,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,.3) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
      }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
              style={{ background: 'linear-gradient(135deg, #FF9933, #6366f1, #138808)' }}>
              🛡️
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #FF9933, #a5b4fc, #138808)' }}>
                TenderShield
              </h1>
              <p className="text-xs text-[var(--text-secondary)] tracking-widest uppercase">
                AI-Secured Procurement
              </p>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="card-glass p-8">
          <h2 className="text-xl font-semibold mb-1">Sign In</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Access the blockchain-secured procurement dashboard
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input-field" placeholder="officer@morth.gov.in" required />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-secondary)] mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input-field" placeholder="••••••••" required />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? '⏳ Authenticating...' : '🔐 Sign In with JWT'}
            </button>
          </form>
        </div>

        {/* Demo Quick Login */}
        <div className="card-glass p-6 mt-4">
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-3">
            🎯 Competition Demo — Quick Login
          </h3>
          <div className="space-y-2">
            {demoUsers.map((u, i) => (
              <button key={i}
                onClick={() => quickLogin(u.email, rolePasswords[u.role] || 'Demo@2025')}
                className="w-full text-left p-3 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] border border-transparent hover:border-[var(--border-glow)] transition-all text-sm flex items-center justify-between group">
                <div>
                  <span className="text-[var(--text-primary)] group-hover:text-[var(--accent)]">{u.name}</span>
                  <span className="block text-xs text-[var(--text-secondary)]">{u.email}</span>
                </div>
                <span className={`badge ${u.role === 'OFFICER' ? 'badge-info' : u.role === 'BIDDER' ? 'badge-success' : u.role === 'AUDITOR' ? 'badge-warning' : 'badge-danger'}`}>
                  {u.role}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-secondary)] mt-6 opacity-60">
          Powered by Hyperledger Fabric · ZKP · AI Fraud Detection
        </p>
      </div>
    </div>
  );
}
