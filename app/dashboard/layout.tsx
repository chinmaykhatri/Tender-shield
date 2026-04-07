'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import SessionWarning from '@/components/SessionWarning';
import { ToastProvider } from '@/components/ToastSystem';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FEATURES } from '@/lib/features';

const navItems = [
  // ── CORE PAGES (always visible) ──
  { href: '/dashboard', icon: '📊', label: 'Dashboard', roles: ['OFFICER', 'BIDDER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.DASHBOARD },
  { href: '/dashboard/tenders', icon: '📋', label: 'Tenders', roles: ['OFFICER', 'BIDDER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.TENDERS },
  { href: '/dashboard/tenders/create', icon: '➕', label: 'Create Tender', roles: ['OFFICER', 'NIC_ADMIN'], visible: FEATURES.CREATE_TENDER },
  { href: '/dashboard/procurement', icon: '📦', label: 'Procurement Flow', roles: ['OFFICER', 'BIDDER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.PROCUREMENT },
  { href: '/dashboard/bids', icon: '🔒', label: 'Sealed Bids', roles: ['BIDDER', 'OFFICER', 'NIC_ADMIN'], visible: FEATURES.ZKP_BIDS },
  { href: '/dashboard/blockchain', icon: '⛓️', label: 'Blockchain', roles: ['OFFICER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.BLOCKCHAIN },
  { href: '/dashboard/ai-monitor', icon: '🤖', label: 'AI Monitor', roles: ['OFFICER', 'NIC_ADMIN'], visible: FEATURES.AI_MONITOR },
  { href: '/dashboard/auditor', icon: '⚖️', label: 'CAG Auditor', roles: ['AUDITOR', 'NIC_ADMIN'], visible: FEATURES.AUDITOR },
  { href: '/architecture', icon: '🏗️', label: 'Architecture', roles: ['OFFICER', 'BIDDER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.ARCHITECTURE },
  { href: '/demo', icon: '🎬', label: 'Live Demo', roles: ['OFFICER', 'BIDDER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.DEMO },
  // ── GATED PAGES (hidden when NEXT_PUBLIC_HIDE_INCOMPLETE=true) ──
  { href: '/dashboard/ml-model', icon: '🧠', label: 'ML Model', roles: ['OFFICER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.ML_MODEL },
  { href: '/dashboard/ai-alerts', icon: '🚨', label: 'AI Alerts', roles: ['OFFICER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.AI_ALERTS },
  { href: '/dashboard/audit', icon: '📜', label: 'Audit Trail', roles: ['OFFICER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.AUDIT_TRAIL },
  { href: '/dashboard/judge-tour', icon: '🏆', label: 'Judge Walkthrough', roles: ['OFFICER', 'BIDDER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.JUDGE_TOUR },
].filter(item => item.visible);

// Mobile bottom nav shows 5 most important tabs based on role
// Uses feature flags to hide incomplete features from mobile nav
const mobileNavConfig: Record<string, { href: string; icon: string; label: string }[]> = {
  OFFICER: [
    { href: '/dashboard', icon: '📊', label: 'Home' },
    { href: '/dashboard/tenders', icon: '📋', label: 'Tenders' },
    { href: '/dashboard/procurement', icon: '📦', label: 'Procure' },
    { href: '/dashboard/ai-monitor', icon: '🤖', label: 'AI' },
    { href: '/dashboard/blockchain', icon: '⛓️', label: 'Chain' },
  ],
  BIDDER: [
    { href: '/dashboard', icon: '📊', label: 'Home' },
    { href: '/dashboard/tenders', icon: '📋', label: 'Tenders' },
    { href: '/dashboard/bids', icon: '🔒', label: 'My Bids' },
    { href: '/dashboard/procurement', icon: '📦', label: 'Procure' },
    { href: '/dashboard/blockchain', icon: '⛓️', label: 'Chain' },
  ],
  AUDITOR: [
    { href: '/dashboard', icon: '📊', label: 'Home' },
    { href: '/dashboard/auditor', icon: '⚖️', label: 'Audit' },
    { href: '/dashboard/tenders', icon: '📋', label: 'Tenders' },
    { href: '/dashboard/ai-monitor', icon: '🤖', label: 'AI' },
    { href: '/dashboard/blockchain', icon: '⛓️', label: 'Chain' },
  ],
  NIC_ADMIN: [
    { href: '/dashboard', icon: '📊', label: 'Home' },
    { href: '/dashboard/tenders', icon: '📋', label: 'Tenders' },
    { href: '/dashboard/auditor', icon: '⚖️', label: 'Audit' },
    { href: '/dashboard/ai-monitor', icon: '🤖', label: 'AI' },
    { href: '/dashboard/blockchain', icon: '⛓️', label: 'Chain' },
  ],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, checkSessionExpiry } = useAuthStore();
  useSessionTimeout(); // Auto-logout after 30 min inactivity

  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ────────────────────────────────────────────────
  // AUTH GUARD: Wait for hydration, then check auth
  // This prevents the black-screen redirect loop
  // ────────────────────────────────────────────────
  useEffect(() => {
    if (!mounted) return;
    // Check session expiry
    checkSessionExpiry();
    // If not authenticated after hydration, redirect to login
    if (!isAuthenticated) {
      router.push('/?message=login_required');
    }
  }, [mounted, isAuthenticated, router, checkSessionExpiry]);

  // Close sidebar on navigation (must be before early return — Rules of Hooks)
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Show loading skeleton while waiting for hydration
  // IMPORTANT: This must come AFTER all hook calls (Rules of Hooks)
  if (!mounted || !isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#080808',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center', color: '#888' }}>
          <div style={{
            width: 48, height: 48,
            border: '3px solid rgba(255,153,51,0.3)',
            borderTopColor: '#FF9933',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>Loading TenderShield...</p>
          <p style={{ fontSize: 11, color: '#555', marginTop: 4 }}>Verifying session...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); }}`}</style>
      </div>
    );
  }

  const roleBadge: Record<string, { color: string; label: string }> = {
    OFFICER: { color: '#6366f1', label: '🏛️ Officer' },
    BIDDER: { color: '#22c55e', label: '🏢 Bidder' },
    AUDITOR: { color: '#f59e0b', label: '🔍 Auditor' },
    NIC_ADMIN: { color: '#ef4444', label: '🛡️ NIC Admin' },
  };

  const role = roleBadge[user?.role || ''] || { color: '#6366f1', label: '👤 User' };
  const displayName = mounted ? (user?.name || 'User') : 'User';
  const displayInitial = mounted ? (user?.name || 'U')[0] : 'U';
  const displayRole = mounted ? role.label : '👤 User';
  const displayRoleColor = mounted ? role.color : '#6366f1';

  const mobileNav = mobileNavConfig[user?.role || 'OFFICER'] || mobileNavConfig.OFFICER;

  return (
    <ToastProvider>
    <ErrorBoundary>
    <div className="flex min-h-screen" style={{ paddingTop: '28px' }}>
      {/* Mobile Header Bar — hamburger + logo */}
      <div className="md:hidden fixed top-7 left-0 right-0 z-40 flex items-center justify-between px-3 py-2"
        style={{ background: 'rgba(17,17,40,0.95)', borderBottom: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-lg"
          style={{ background: 'rgba(99,102,241,0.1)' }}>
          <span style={{ fontSize: 20 }}>{sidebarOpen ? '✕' : '☰'}</span>
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="font-display font-bold text-base bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #FF9933, #a5b4fc)' }}>
            🛡️ TenderShield
          </span>
        </Link>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: `${displayRoleColor}22`, color: displayRoleColor }}>
          {displayInitial}
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setSidebarOpen(false)} style={{ top: '28px' }}>
          <div onClick={e => e.stopPropagation()} className="w-72 h-full bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] overflow-y-auto"
            style={{ paddingTop: 48 }}>
            <nav className="p-3 space-y-1">
              {navItems.filter(item => !mounted || !user?.role || item.roles.includes(user.role)).map(item => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
                return (
                  <a key={item.href} href={item.href}
                    onClick={(e) => { e.preventDefault(); router.push(item.href); setSidebarOpen(false); }}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                    }`}>
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </a>
                );
              })}
            </nav>
            <div className="p-4 border-t border-[var(--border-subtle)]">
              <button onClick={handleLogout}
                className="w-full text-sm text-[var(--text-secondary)] hover:text-red-400 py-3 rounded-lg hover:bg-red-500/10 transition-all">
                🚪 Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="sidebar-desktop w-64 fixed left-0 top-7 bottom-0 bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] flex-col z-[45] overflow-y-auto hidden md:flex">
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
          {navItems.filter(item => !mounted || !user?.role || item.roles.includes(user.role)).map(item => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            return (
              <a key={item.href} href={item.href}
                onClick={(e) => { e.preventDefault(); router.push(item.href); }}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                }`}>
                <span className="text-base">{item.icon}</span>
                {item.label}
              </a>
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

          <div className="mb-2 px-2 py-1.5 rounded-lg text-center"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <p className="text-[9px] font-semibold text-indigo-400 uppercase tracking-wider">🔐 Sandbox Auth</p>
            <p className="text-[8px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
              Production: Supabase JWT + RLS + Fabric CA
            </p>
          </div>

          <button onClick={handleLogout}
            className="w-full text-sm text-[var(--text-secondary)] hover:text-red-400 py-2 rounded-lg hover:bg-red-500/10 transition-all">
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content — responsive padding */}
      <main className="main-content-desktop flex-1 ml-0 md:ml-64 p-3 md:p-6 pt-16 md:pt-6 pb-20 md:pb-6">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        {mobileNav.map(item => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          return (
            <a key={item.href} href={item.href}
              onClick={(e) => { e.preventDefault(); router.push(item.href); }}
              className={isActive ? 'active' : ''}>
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>

      {/* Session Timeout Warning */}
      <SessionWarning />
    </div>
    </ErrorBoundary>
    </ToastProvider>
  );
}
