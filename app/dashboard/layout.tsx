'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import SessionWarning from '@/components/SessionWarning';

const navItems = [
  { href: '/dashboard', icon: '📊', label: 'Dashboard' },
  { href: '/dashboard/tenders', icon: '📋', label: 'Tenders' },
  { href: '/dashboard/tenders/create', icon: '➕', label: 'Create Tender' },
  { href: '/dashboard/bids', icon: '🔒', label: 'ZKP Bids' },
  { href: '/dashboard/blockchain', icon: '⛓️', label: 'Blockchain' },
  { href: '/dashboard/ai-monitor', icon: '🤖', label: 'AI Monitor' },
  { href: '/dashboard/ai-alerts', icon: '🚨', label: 'AI Alerts' },
  { href: '/dashboard/auditor', icon: '🔍', label: 'CAG Auditor' },
  { href: '/dashboard/audit', icon: '📜', label: 'Audit Trail' },
  { href: '/heatmap', icon: '🗺️', label: 'Fraud Heatmap' },
  { href: '/auditor/query', icon: '💬', label: 'AI Query' },
  { href: '/ministry-scores', icon: '🏛️', label: 'Ministry Scores' },
  { href: '/verify', icon: '🔐', label: 'ZKP Verify' },
  { href: '/rti', icon: '🇮🇳', label: 'RTI Portal' },
  { href: '/settings', icon: '⚙️', label: 'Settings' },
  { href: '/dashboard/admin', icon: '🛡️', label: 'Admin Panel' },
  { href: '/auditor/security', icon: '🔒', label: 'Security SOC' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  useSessionTimeout(); // Auto-logout after 30 min inactivity

  // Prevent hydration mismatch — user data comes from localStorage (client-only)
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const roleBadge: Record<string, { color: string; label: string }> = {
    OFFICER: { color: '#6366f1', label: '🏛️ Officer' },
    BIDDER: { color: '#22c55e', label: '🏢 Bidder' },
    AUDITOR: { color: '#f59e0b', label: '🔍 Auditor' },
    NIC_ADMIN: { color: '#ef4444', label: '🛡️ NIC Admin' },
  };

  const role = roleBadge[user?.role || ''] || { color: '#6366f1', label: '👤 User' };

  // Use stable defaults during SSR, real values after mount
  const displayName = mounted ? (user?.name || 'User') : 'User';
  const displayInitial = mounted ? (user?.name || 'U')[0] : 'U';
  const displayRole = mounted ? role.label : '👤 User';
  const displayRoleColor = mounted ? role.color : '#6366f1';

  return (
    <div className="flex min-h-screen" style={{ paddingTop: '28px' }}>
      {/* Sidebar */}
      <aside className="w-64 fixed left-0 top-7 bottom-0 bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] flex flex-col z-30 overflow-y-auto">
        {/* Logo */}
        <div className="p-5 border-b border-[var(--border-subtle)]">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg"
              style={{ background: 'linear-gradient(135deg, #FF9933, #6366f1, #138808)' }}>
              🛡️
            </div>
            <div>
              <span className="font-display font-bold text-lg bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #FF9933, #a5b4fc)' }}>
                TenderShield
              </span>
              <span className="block text-[10px] text-[var(--text-secondary)] tracking-wider uppercase -mt-0.5">
                Blockchain Secured
              </span>
            </div>
          </Link>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(item => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                }`}>
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: `${displayRoleColor}22`, color: displayRoleColor }}>
              {displayInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{displayName}</p>
              <p className="text-xs text-[var(--text-secondary)]">{displayRole}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full text-sm text-[var(--text-secondary)] hover:text-red-400 py-2 rounded-lg hover:bg-red-500/10 transition-all">
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-6">
        {children}
      </main>

      {/* Session Timeout Warning */}
      <SessionWarning />
    </div>
  );
}
