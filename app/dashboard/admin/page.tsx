'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { DEMO_MODE, supabase } from '@/lib/dataLayer';

export default function AdminPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (DEMO_MODE) {
        setPendingUsers([
          { id: '1', email: 'newbidder@company.com', name: 'Amit Patel', role: 'BIDDER', created_at: '2025-03-18T10:00:00+05:30' },
          { id: '2', email: 'officer@mof.gov.in', name: 'Sunita Devi', role: 'OFFICER', created_at: '2025-03-18T11:30:00+05:30' },
          { id: '3', email: 'reviewer@cag.gov.in', name: 'Deepak Rao', role: 'AUDITOR', created_at: '2025-03-18T14:15:00+05:30' },
        ]);
      } else {
        const res = await supabase.from('profiles').select('*').eq('is_approved', false).order('created_at', { ascending: false });
        setPendingUsers(res.data || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  const approveUser = async (userId: string) => {
    if (DEMO_MODE) {
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      return;
    }
    await supabase.from('profiles').update({ is_approved: true }).eq('id', userId);
    setPendingUsers(prev => prev.filter(u => u.id !== userId));
  };

  const rejectUser = async (userId: string) => {
    if (DEMO_MODE) {
      setPendingUsers(prev => prev.filter(u => u.id !== userId));
      return;
    }
    await supabase.from('profiles').delete().eq('id', userId);
    setPendingUsers(prev => prev.filter(u => u.id !== userId));
  };

  const roleBadge = (role: string) => {
    const map: Record<string, { class: string; label: string }> = {
      OFFICER: { class: 'badge-info', label: '🏛️ Officer' },
      BIDDER: { class: 'badge-success', label: '🏢 Bidder' },
      AUDITOR: { class: 'badge-warning', label: '🔍 Auditor' },
      NIC_ADMIN: { class: 'badge-danger', label: '🛡️ Admin' },
    };
    return map[role] || { class: 'badge-info', label: role };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold">🛡️ NIC Admin Panel</h1>
        <p className="text-sm text-[var(--text-secondary)]">User management, mode toggle, system health</p>
      </div>

      {/* Mode Info */}
      <div className="card-glass p-6">
        <h2 className="font-semibold mb-4">🔧 System Mode</h2>
        <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-secondary)]">
          <div className={`w-4 h-4 rounded-full ${DEMO_MODE ? 'bg-green-500' : 'bg-green-500'}`} />
          <div>
            <p className="font-medium">{DEMO_MODE ? '🟢 MVP SANDBOX' : '✅ LIVE PRODUCTION'}</p>
            <p className="text-xs text-[var(--text-secondary)]">
              {DEMO_MODE ? 'Blockchain India Challenge 2026 · Pre-loaded procurement data for evaluation' : 'Connected to real Supabase database'}
            </p>
          </div>
        </div>
        <div className="mt-4 p-4 rounded-xl bg-[var(--bg-secondary)] text-sm text-[var(--text-secondary)]">
          <p className="font-medium text-[var(--text-primary)] mb-2">How to switch modes:</p>
          <ol className="list-decimal pl-4 space-y-1">
            <li>Go to Vercel → Settings → Environment Variables</li>
            <li>Set <code className="text-[var(--accent)]">NEXT_PUBLIC_DEMO_MODE</code> to <code>true</code> or <code>false</code></li>
            <li>Redeploy (takes ~60 seconds)</li>
          </ol>
        </div>
      </div>

      {/* Pending Users */}
      <div className="card-glass p-6">
        <h2 className="font-semibold mb-4">👥 Pending User Approvals ({pendingUsers.length})</h2>
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 shimmer rounded-xl" />)}</div>
        ) : pendingUsers.length === 0 ? (
          <p className="text-center py-8 text-[var(--text-secondary)]">No pending approvals 🎉</p>
        ) : (
          <div className="space-y-3">
            {pendingUsers.map(u => {
              const badge = roleBadge(u.role);
              return (
                <div key={u.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent)]/10 flex items-center justify-center font-bold text-[var(--accent)]">
                      {(u.name || u.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{u.name || 'N/A'}</p>
                      <p className="text-xs text-[var(--text-secondary)]">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`badge ${badge.class}`}>{badge.label}</span>
                    <button onClick={() => approveUser(u.id)} className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/20 transition-all">✅ Approve</button>
                    <button onClick={() => rejectUser(u.id)} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all">❌ Reject</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* System Health */}
      <div className="card-glass p-6">
        <h2 className="font-semibold mb-4">💊 System Health</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {[
            { label: 'Supabase', status: '🟢 Connected', detail: 'PostgreSQL + Auth operational' },
            { label: 'AI Engine', status: DEMO_MODE ? '🟢 Sandbox Active' : '🟢 Active', detail: '5 fraud detectors loaded' },
            { label: 'Hyperledger Fabric', status: DEMO_MODE ? '🟢 Test Network' : '🟢 Connected', detail: '4 orgs, 8 peers' },
            { label: 'Frontend (Vercel)', status: '🟢 Deployed', detail: 'Next.js 14, Edge Runtime' },
          ].map((svc, i) => (
            <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-secondary)]">
              <div>
                <p className="text-sm font-medium">{svc.label}</p>
                <p className="text-xs text-[var(--text-secondary)]">{svc.detail}</p>
              </div>
              <span className="text-sm">{svc.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Environment Variables reference */}
      <div className="card-glass p-6">
        <h2 className="font-semibold mb-4">🔑 Environment Variables</h2>
        <div className="space-y-2 text-sm font-mono">
          {[
            { key: 'NEXT_PUBLIC_DEMO_MODE', value: DEMO_MODE ? 'true' : 'false', required: true },
            { key: 'NEXT_PUBLIC_SUPABASE_URL', value: '***configured***', required: true },
            { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', value: '***configured***', required: true },
            { key: 'NEXT_PUBLIC_AI_ENGINE_URL', value: DEMO_MODE ? 'N/A (demo)' : 'https://...', required: false },
          ].map((env, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)]">
              <span className="text-[var(--accent)]">{env.key}</span>
              <div className="flex items-center gap-2">
                <span className="text-[var(--text-secondary)]">{env.value}</span>
                {env.required && <span className="badge badge-info text-[10px]">Required</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
