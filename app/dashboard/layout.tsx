'use client';

import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { useSessionTimeout } from '@/hooks/useSessionTimeout';
import SessionWarning from '@/components/SessionWarning';
import { ToastProvider } from '@/components/ToastSystem';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FEATURES } from '@/lib/features';
import { useRealtimeAlerts } from '@/lib/useRealtimeAlerts';
import { canAccessRoute, type Role } from '@/lib/rbac';
import LanguageToggle, { useTranslation } from '@/components/LanguageToggle';
import ServiceHealthWidget from '@/components/ServiceHealthWidget';
import {
  LayoutDashboard, FileText, FilePlus, Package, Lock, Link2,
  Brain, AlertTriangle, Cpu, MessageSquare, TrendingUp,
  Scale, ScrollText, Network, ShieldCheck, Map,
  KeyRound, GitBranch, Landmark, Megaphone, Globe, Eye,
  BarChart3, Building, MapPin, Play, Layers, Trophy, Calendar,
  Settings, UserCog, ChevronDown, ChevronRight, LogOut, Building2, Shield, Search,
  type LucideIcon,
} from 'lucide-react';

// â”€â”€â”€ Icon-based nav item â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
interface NavItem {
  href: string;
  Icon: LucideIcon;
  label: string;
  roles: string[];
  visible: boolean;
  group: string;
}

const navItems: NavItem[] = [
  // â”€â”€ CORE â”€â”€
  { href: '/dashboard', Icon: LayoutDashboard, label: 'Dashboard', roles: ['OFFICER', 'BIDDER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.DASHBOARD as boolean, group: 'Core' },
  { href: '/dashboard/tenders', Icon: FileText, label: 'Tenders', roles: ['OFFICER', 'BIDDER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.TENDERS as boolean, group: 'Core' },
  { href: '/dashboard/tenders/create', Icon: FilePlus, label: 'Create Tender', roles: ['OFFICER', 'NIC_ADMIN'], visible: FEATURES.CREATE_TENDER as boolean, group: 'Core' },
  { href: '/dashboard/procurement', Icon: Package, label: 'Procurement Flow', roles: ['OFFICER', 'BIDDER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.PROCUREMENT as boolean, group: 'Core' },

  // â”€â”€ INTELLIGENCE â”€â”€
  { href: '/dashboard/ai-monitor', Icon: Brain, label: 'AI Monitor', roles: ['OFFICER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.AI_MONITOR as boolean, group: 'Intelligence' },
  { href: '/dashboard/ai-alerts', Icon: AlertTriangle, label: 'AI Alerts', roles: ['OFFICER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.AI_ALERTS as boolean, group: 'Intelligence' },
  { href: '/dashboard/ml-model', Icon: Cpu, label: 'ML Model', roles: ['OFFICER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.ML_MODEL as boolean, group: 'Intelligence' },
  { href: '/dashboard/chat', Icon: MessageSquare, label: 'AI Analyst', roles: ['OFFICER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.AI_CHAT as boolean, group: 'Intelligence' },
  { href: '/dashboard/anomaly', Icon: TrendingUp, label: 'Anomaly Detection', roles: ['OFFICER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.ANOMALY_DETECTION as boolean, group: 'Intelligence' },

  // â”€â”€ INVESTIGATION â”€â”€
  { href: '/dashboard/auditor', Icon: Scale, label: 'CAG Auditor', roles: ['AUDITOR', 'NIC_ADMIN'], visible: FEATURES.AUDITOR as boolean, group: 'Investigation' },
  { href: '/dashboard/audit', Icon: ScrollText, label: 'Audit Trail', roles: ['OFFICER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.AUDIT_TRAIL as boolean, group: 'Investigation' },
  { href: '/dashboard/network-graph', Icon: Network, label: 'Network Graph', roles: ['OFFICER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.NETWORK_GRAPH as boolean, group: 'Investigation' },
  { href: '/dashboard/compliance', Icon: ShieldCheck, label: 'GFR Compliance', roles: ['OFFICER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.COMPLIANCE as boolean, group: 'Investigation' },
  { href: '/dashboard/national-risk', Icon: Map, label: 'National Risk', roles: ['OFFICER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.CAG_NATIONAL_DASHBOARD as boolean, group: 'Investigation' },

  // â”€â”€ CRYPTO & SECURITY â”€â”€
  { href: '/dashboard/bids', Icon: Lock, label: 'Sealed Bids', roles: ['BIDDER', 'OFFICER', 'NIC_ADMIN'], visible: FEATURES.ZKP_BIDS as boolean, group: 'Crypto & Security' },
  { href: '/dashboard/blockchain', Icon: Link2, label: 'Audit Ledger', roles: ['OFFICER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.BLOCKCHAIN as boolean, group: 'Crypto & Security' },
  { href: '/dashboard/paillier-demo', Icon: KeyRound, label: 'Paillier Crypto', roles: ['OFFICER', 'BIDDER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.PAILLIER_DEMO as boolean, group: 'Crypto & Security' },
  { href: '/dashboard/federated', Icon: GitBranch, label: 'Federated Learning', roles: ['OFFICER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.FEDERATED_LEARNING as boolean, group: 'Crypto & Security' },

  // â”€â”€ PUBLIC â”€â”€
  { href: '/rti', Icon: Landmark, label: 'RTI Portal', roles: ['OFFICER', 'BIDDER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.RTI_PORTAL as boolean, group: 'Public' },
  { href: '/whistleblower', Icon: Megaphone, label: 'Whistleblower', roles: ['OFFICER', 'BIDDER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.WHISTLEBLOWER as boolean, group: 'Public' },
  { href: '/impact', Icon: Globe, label: 'Impact Dashboard', roles: ['OFFICER', 'BIDDER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.IMPACT as boolean, group: 'Public' },
  { href: '/transparency', Icon: Eye, label: 'Transparency', roles: ['OFFICER', 'BIDDER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.TRANSPARENCY as boolean, group: 'Public' },

  // â”€â”€ SYSTEM â”€â”€
  { href: '/dashboard/metrics', Icon: BarChart3, label: 'Impact Metrics', roles: ['OFFICER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.IMPACT_METRICS as boolean, group: 'System' },
  { href: '/ministry-scores', Icon: Building, label: 'Ministry Scores', roles: ['OFFICER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.MINISTRY_SCORES as boolean, group: 'System' },
  { href: '/heatmap', Icon: MapPin, label: 'Fraud Heatmap', roles: ['OFFICER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.HEATMAP as boolean, group: 'System' },
  { href: '/demo', Icon: Play, label: 'Live Demo', roles: ['OFFICER', 'BIDDER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.DEMO as boolean, group: 'System' },
  { href: '/architecture', Icon: Layers, label: 'Architecture', roles: ['OFFICER', 'BIDDER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.ARCHITECTURE as boolean, group: 'System' },
  { href: '/dashboard/judge-tour', Icon: Trophy, label: 'Judge Walkthrough', roles: ['OFFICER', 'BIDDER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.JUDGE_TOUR as boolean, group: 'System' },
  { href: '/roadmap', Icon: Calendar, label: 'Roadmap', roles: ['OFFICER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.ROADMAP as boolean, group: 'System' },
  { href: '/settings', Icon: Settings, label: 'Settings', roles: ['OFFICER', 'AUDITOR', 'NIC_ADMIN'], visible: FEATURES.SETTINGS as boolean, group: 'System' },
  { href: '/dashboard/admin', Icon: UserCog, label: 'Admin Panel', roles: ['NIC_ADMIN'], visible: FEATURES.ADMIN as boolean, group: 'System' },
].filter(item => item.visible);

// Group definitions with ordering
const SIDEBAR_GROUPS = ['Core', 'Intelligence', 'Investigation', 'Crypto & Security', 'Public', 'System'] as const;
const DEFAULT_OPEN = new Set(['Core', 'Intelligence']);

// Mobile bottom nav â€” 5 most important per role
const mobileNavConfig: Record<string, { href: string; Icon: LucideIcon; label: string }[]> = {
  OFFICER: [
    { href: '/dashboard', Icon: LayoutDashboard, label: 'Home' },
    { href: '/dashboard/tenders', Icon: FileText, label: 'Tenders' },
    { href: '/dashboard/procurement', Icon: Package, label: 'Procure' },
    { href: '/dashboard/ai-monitor', Icon: Brain, label: 'AI' },
    { href: '/dashboard/blockchain', Icon: Link2, label: 'Audit' },
  ],
  BIDDER: [
    { href: '/dashboard', Icon: LayoutDashboard, label: 'Home' },
    { href: '/dashboard/tenders', Icon: FileText, label: 'Tenders' },
    { href: '/dashboard/bids', Icon: Lock, label: 'My Bids' },
    { href: '/dashboard/procurement', Icon: Package, label: 'Procure' },
    { href: '/dashboard/blockchain', Icon: Link2, label: 'Audit' },
  ],
  AUDITOR: [
    { href: '/dashboard', Icon: LayoutDashboard, label: 'Home' },
    { href: '/dashboard/auditor', Icon: Scale, label: 'Audit' },
    { href: '/dashboard/tenders', Icon: FileText, label: 'Tenders' },
    { href: '/dashboard/ai-monitor', Icon: Brain, label: 'AI' },
    { href: '/dashboard/blockchain', Icon: Link2, label: 'Audit' },
  ],
  NIC_ADMIN: [
    { href: '/dashboard', Icon: LayoutDashboard, label: 'Home' },
    { href: '/dashboard/tenders', Icon: FileText, label: 'Tenders' },
    { href: '/dashboard/auditor', Icon: Scale, label: 'Audit' },
    { href: '/dashboard/ai-monitor', Icon: Brain, label: 'AI' },
    { href: '/dashboard/blockchain', Icon: Link2, label: 'Audit' },
  ],
};

// â”€â”€â”€ Collapsible Group Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CollapsibleGroup({
  title,
  children,
  defaultOpen,
  storageKey,
}: {
  title: string;
  children: ReactNode;
  defaultOpen: boolean;
  storageKey: string;
}) {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return defaultOpen;
    const stored = localStorage.getItem(storageKey);
    return stored !== null ? stored === 'true' : defaultOpen;
  });

  const toggle = () => {
    const next = !open;
    setOpen(next);
    localStorage.setItem(storageKey, String(next));
  };

  return (
    <div style={{ marginBottom: 2 }}>
      <button
        onClick={toggle}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '6px 12px', border: 'none', background: 'transparent', cursor: 'pointer',
          fontSize: 10, fontWeight: 700, color: '#64748b', letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}
      >
        {title}
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      </button>
      {open && <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>{children}</div>}
    </div>
  );
}

// â”€â”€â”€ Role badge config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const roleBadge: Record<string, { color: string; label: string; Icon: LucideIcon }> = {
  OFFICER: { color: '#6366f1', label: 'Officer', Icon: Building2 },
  BIDDER: { color: '#22c55e', label: 'Bidder', Icon: Building },
  AUDITOR: { color: '#f59e0b', label: 'Auditor', Icon: Search },
  NIC_ADMIN: { color: '#ef4444', label: 'NIC Admin', Icon: Shield },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, isAuthenticated, checkSessionExpiry } = useAuthStore();
  useSessionTimeout(); // Auto-logout after 30 min inactivity

  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { alerts: realtimeAlerts, unreadCount: alertCount, dismiss: dismissAlerts } = useRealtimeAlerts();

  // Stable refs to avoid re-render loops
  const routerRef = useRef(router);
  const checkSessionRef = useRef(checkSessionExpiry);
  useEffect(() => { routerRef.current = router; }, [router]);
  useEffect(() => { checkSessionRef.current = checkSessionExpiry; }, [checkSessionExpiry]);

  useEffect(() => { setMounted(true); }, []);

  // NOTE: Backend health probing moved to ServiceHealthWidget component


  // ——————————————————————————————————————————————————————
  // AUTH GUARD: Wait for hydration, then check auth
  // Uses refs to avoid dependency-triggered infinite loops
  // ——————————————————————————————————————————————————————
  useEffect(() => {
    if (!mounted) return;
    // Check session expiry
    checkSessionRef.current();
    // If not authenticated after hydration, redirect to login
    if (!isAuthenticated) {
      routerRef.current.push('/?message=login_required');
    }
  }, [mounted, isAuthenticated]);

  // Close sidebar on navigation (must be before early return â€” Rules of Hooks)
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  const handleLogout = useCallback(() => {
    logout();
    routerRef.current.push('/');
  }, [logout]);

  // Show loading skeleton while waiting for hydration
  // IMPORTANT: This must come AFTER all hook calls (Rules of Hooks)
  if (!mounted || !isAuthenticated) {
    return (
      <div suppressHydrationWarning style={{
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

  const role = roleBadge[user?.role || ''] || { color: '#6366f1', label: 'User', Icon: UserCog };
  const displayName = mounted ? (user?.name || 'User') : 'User';
  const displayInitial = mounted ? (user?.name || 'U')[0] : 'U';
  const displayRole = mounted ? role.label : 'User';
  const displayRoleColor = mounted ? role.color : '#6366f1';
  const RoleIcon = role.Icon;

  const mobileNav = mobileNavConfig[user?.role || 'OFFICER'] || mobileNavConfig.OFFICER;

  // Filter nav items by role and access
  const visibleItems = navItems.filter(item =>
    (!mounted || !user?.role || item.roles.includes(user.role)) &&
    canAccessRoute((user?.role || 'OFFICER') as Role, item.href)
  );

  // Render a single nav link
  const renderNavLink = (item: NavItem, closeSidebar?: () => void) => {
    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
    const ItemIcon = item.Icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={closeSidebar}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
          isActive
            ? 'bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
        }`}
      >
        <ItemIcon size={16} strokeWidth={isActive ? 2.5 : 2} />
        {item.label}
      </Link>
    );
  };

  return (
    <ToastProvider>
    <ErrorBoundary>
    <div className="flex min-h-screen" style={{ paddingTop: '28px' }}>
      {/* Mobile Header Bar â€” hamburger + logo */}
      <div className="md:hidden fixed top-7 left-0 right-0 z-40 flex items-center justify-between px-3 py-2"
        style={{ background: 'rgba(17,17,40,0.95)', borderBottom: '1px solid rgba(99,102,241,0.15)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-10 h-10 flex items-center justify-center rounded-lg"
          style={{ background: 'rgba(99,102,241,0.1)' }}>
          <span style={{ fontSize: 20 }}>{sidebarOpen ? 'âœ•' : 'â˜°'}</span>
        </button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="font-display font-bold text-base bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(135deg, #FF9933, #a5b4fc)' }}>
            ðŸ›¡ï¸ TenderShield
          </span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={dismissAlerts} style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#94a3b8' }}>
            ðŸ””
            {alertCount > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -6, width: 16, height: 16, borderRadius: '50%', background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: `${displayRoleColor}22`, color: displayRoleColor }}>
            {displayInitial}
          </div>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/60" onClick={() => setSidebarOpen(false)} style={{ top: '28px' }}>
          <div onClick={e => e.stopPropagation()} className="w-72 h-full bg-[var(--bg-secondary)] border-r border-[var(--border-subtle)] overflow-y-auto"
            style={{ paddingTop: 48 }}>
            <nav className="p-3 space-y-1">
              {SIDEBAR_GROUPS.map(group => {
                const groupItems = visibleItems.filter(i => i.group === group);
                if (groupItems.length === 0) return null;
                return (
                  <CollapsibleGroup key={group} title={group} defaultOpen={DEFAULT_OPEN.has(group)} storageKey={`ts-sidebar-${group}`}>
                    {groupItems.map(item => renderNavLink(item, () => setSidebarOpen(false)))}
                  </CollapsibleGroup>
                );
              })}
            </nav>
            <div className="p-4 border-t border-[var(--border-subtle)]">
              <button onClick={handleLogout}
                className="w-full text-sm text-[var(--text-secondary)] hover:text-red-400 py-3 rounded-lg hover:bg-red-500/10 transition-all flex items-center justify-center gap-2">
                <LogOut size={14} /> Sign Out
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
              ðŸ›¡ï¸
            </div>
            <div>
              <span className="font-display font-bold text-lg bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(135deg, #FF9933, #a5b4fc)' }}>
                TenderShield
              </span>
              <span className="block text-[10px] text-[var(--text-secondary)] tracking-wider uppercase -mt-0.5">
                Cryptographically Audited
              </span>
            </div>
          </Link>
        </div>

        {/* Nav Links â€” Collapsible Groups */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {SIDEBAR_GROUPS.map(group => {
            const groupItems = visibleItems.filter(i => i.group === group);
            if (groupItems.length === 0) return null;
            return (
              <CollapsibleGroup key={group} title={group} defaultOpen={DEFAULT_OPEN.has(group)} storageKey={`ts-sidebar-${group}`}>
                {groupItems.map(item => renderNavLink(item))}
              </CollapsibleGroup>
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
              <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                <RoleIcon size={11} /> {displayRole}
              </p>
            </div>
          </div>

          <div className="mb-2 px-2 py-1.5 rounded-lg text-center"
            style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
            <p className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">ðŸ” Sandbox Auth</p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">
              Production: Supabase JWT + RLS + Hash Chain
            </p>
          </div>

          {/* Language Toggle â€” EN/à¤¹à¤¿à¤‚ */}
          <div className="mb-2 flex justify-center">
            <LanguageToggle />
          </div>

          {/* Granular Service Health Indicator */}
          <ServiceHealthWidget />

          <button onClick={handleLogout}
            className="w-full text-sm text-[var(--text-secondary)] hover:text-red-400 py-2 rounded-lg hover:bg-red-500/10 transition-all flex items-center justify-center gap-2">
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content â€” responsive padding */}
      <main className="main-content-desktop flex-1 ml-0 md:ml-64 p-3 md:p-6 pt-16 md:pt-6 pb-20 md:pb-6 relative z-[1]">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-bottom-nav">
        {mobileNav.map(item => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
          const MobileIcon = item.Icon;
          return (
            <Link key={item.href} href={item.href}
              className={isActive ? 'active' : ''}>
              <span className="nav-icon"><MobileIcon size={18} /></span>
              <span>{item.label}</span>
            </Link>
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
