// ─────────────────────────────────────────────────
// FILE: components/MobileNav.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Bottom navigation bar for mobile screens (< 768px)
// ─────────────────────────────────────────────────
'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { href: '/dashboard/tenders', icon: '📋', label: 'Tenders' },
  { href: '/dashboard/ai-monitor', icon: '🚨', label: 'Alerts' },
  { href: '/heatmap', icon: '🗺️', label: 'Map' },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--bg-card)]/95 backdrop-blur-md border-t border-[var(--border-subtle)]" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex items-center justify-around py-2">
        {NAV_ITEMS.map(item => {
          const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-0.5 p-2 min-w-[60px] rounded-lg transition-all ${active ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>
              <span className="text-lg">{item.icon}</span>
              <span className="text-[10px]">{item.label}</span>
              {active && <div className="w-1 h-1 rounded-full bg-[var(--accent)]" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
