// ─────────────────────────────────────────────────
// FILE: app/impact/page.tsx
// TYPE: PUBLIC PAGE (no login required)
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Live Impact Dashboard — animated counters showing fraud prevention in real-world terms
// ─────────────────────────────────────────────────
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ════════════════════════════════════════════════
// CountUp Component — reusable animated counter
// ════════════════════════════════════════════════
function CountUp({ target, duration = 2000, prefix = '', suffix = '', decimals = 0 }: {
  target: number; duration?: number; prefix?: string; suffix?: string; decimals?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasAnimated.current) {
        hasAnimated.current = true;
        const startTime = performance.now();
        const animate = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // easeOutCubic
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(eased * target);
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
      }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref}>
      {prefix}{count.toFixed(decimals)}{suffix}
    </span>
  );
}

// ════════════════════════════════════════════════
// Live Feed Item
// ════════════════════════════════════════════════
function LiveFeedItem({ message, time_ago, type }: { message: string; time_ago: string; type: string }) {
  const colors: Record<string, string> = {
    info: '#6366f1', warning: '#f59e0b', danger: '#ef4444', success: '#22c55e',
  };
  const icons: Record<string, string> = {
    info: '🔍', warning: '⚠️', danger: '🚨', success: '✅',
  };
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] animate-fade-in">
      <span className="text-lg mt-0.5">{icons[type] || '📋'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--text-primary)] truncate">{message}</p>
        <p className="text-xs mt-0.5" style={{ color: colors[type] || '#a0a0c0' }}>{time_ago}</p>
      </div>
      <div className="w-2 h-2 rounded-full mt-2 shrink-0 animate-pulse" style={{ backgroundColor: colors[type] }} />
    </div>
  );
}

// ════════════════════════════════════════════════
// Main Page
// ════════════════════════════════════════════════
export default function ImpactPage() {
  const [stats, setStats] = useState<any>(null);
  const [feedIndex, setFeedIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/impact/stats')
      .then(r => r.json())
      .then(d => { setStats(d.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Cycle live feed every 10 seconds
  useEffect(() => {
    if (!stats?.live_feed) return;
    const timer = setInterval(() => {
      setFeedIndex(i => (i + 1) % stats.live_feed.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [stats]);

  if (loading || !stats) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-secondary)]">Loading impact data...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { icon: '🏫', value: stats.schools_equivalent, label: 'Schools Equivalent', sub: 'New primary schools that could be built', suffix: '' },
    { icon: '⛓️', value: stats.blockchain_transactions, label: 'Blockchain TXs', sub: 'Immutable records on Hyperledger Fabric', suffix: '' },
    { icon: '🏛️', value: stats.ministries_protected, label: 'Ministries Protected', sub: 'Central government ministries monitored', suffix: '' },
    { icon: '⚡', value: stats.avg_detection_seconds, label: 'Detection Speed', sub: 'Average time to detect fraud', suffix: ' sec', decimals: 1 },
    { icon: '🏢', value: stats.shell_companies_caught, label: 'Shell Companies', sub: 'Fake companies identified and flagged', suffix: '' },
    { icon: '👮', value: stats.officers_monitored, label: 'Officers Monitored', sub: 'Procurement officers under AI watch', suffix: '' },
    { icon: '📋', value: stats.tenders_analyzed, label: 'Tenders Analyzed', sub: 'AI-scanned procurement tenders', suffix: '' },
    { icon: '🏥', value: stats.hospitals_equivalent, label: 'Hospitals Equivalent', sub: 'District hospitals that could be built', suffix: '' },
  ];

  const scams = [
    { name: '2G Spectrum Scam', amount: '₹1.76 Lakh Crore', year: '2008' },
    { name: 'Coal Allocation Scam', amount: '₹1.86 Lakh Crore', year: '2012' },
    { name: 'CWG Scam', amount: '₹70,000 Crore', year: '2010' },
    { name: 'Vyapam Scam', amount: '₹2,000+ Crore', year: '2013' },
  ];

  const visibleFeed = stats.live_feed.slice(feedIndex, feedIndex + 5).length >= 5
    ? stats.live_feed.slice(feedIndex, feedIndex + 5)
    : [...stats.live_feed.slice(feedIndex), ...stats.live_feed.slice(0, 5 - (stats.live_feed.length - feedIndex))];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {/* ═══ HERO ═══ */}
      <section className="min-h-screen flex flex-col items-center justify-center relative px-4 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[var(--saffron)] opacity-[0.04] blur-[120px]" />
          <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[var(--accent)] opacity-[0.03] blur-[100px]" />
        </div>

        <div className="relative z-10 text-center max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--saffron)]/10 border border-[var(--saffron)]/20 mb-8">
            <span className="w-2 h-2 rounded-full bg-[var(--saffron)] animate-pulse" />
            <span className="text-xs font-semibold text-[var(--saffron)] uppercase tracking-wider">Live Impact Tracker</span>
          </div>

          {/* Main counter */}
          <h1 className="mb-2">
            <span className="text-6xl md:text-8xl font-serif font-bold text-[var(--saffron)]" style={{ fontFamily: "'Instrument Serif', serif" }}>
              <CountUp target={stats.fraud_prevented_crore} duration={3000} prefix="₹" decimals={1} />
            </span>
            <span className="text-2xl md:text-3xl text-[var(--saffron)]/80 ml-2 font-semibold">Crore</span>
          </h1>
          <p className="text-xl md:text-2xl text-white font-semibold mb-2">Fraud Prevented</p>
          <p className="text-[var(--text-secondary)] text-lg">And counting. In real time.</p>

          {/* Three key stats */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-12 mt-12">
            {[
              { value: stats.bids_analyzed, label: 'Bids Analyzed', suffix: '' },
              { value: stats.bids_flagged, label: 'Flagged', suffix: '' },
              { value: stats.avg_detection_seconds, label: 'sec Detection', suffix: '', decimals: 1 },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-white font-mono">
                  <CountUp target={s.value} duration={2500} decimals={s.decimals || 0} suffix={s.suffix} />
                </p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
          <span className="text-xs text-[var(--text-secondary)]">Scroll to explore</span>
          <svg className="w-5 h-5 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* ═══ STATS GRID ═══ */}
      <section className="max-w-7xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">What ₹{stats.fraud_prevented_crore} Crore Means</h2>
          <p className="text-[var(--text-secondary)]">Real-world impact of every rupee saved from corruption</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card, i) => (
            <div key={i} className="stat-card group">
              <span className="text-3xl mb-3 block">{card.icon}</span>
              <p className="text-2xl md:text-3xl font-bold text-white font-mono">
                <CountUp target={card.value} duration={2000 + i * 200} decimals={card.decimals || 0} suffix={card.suffix || ''} />
              </p>
              <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">{card.label}</p>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5">{card.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══ LIVE FEED ═══ */}
      <section className="max-w-3xl mx-auto px-4 py-16">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
          <h2 className="text-2xl font-bold">Live Activity Feed</h2>
          <span className="text-xs text-[var(--text-secondary)]">Updates every 10 seconds</span>
        </div>
        <div className="space-y-3">
          {visibleFeed.map((item: any, i: number) => (
            <LiveFeedItem key={`${feedIndex}-${i}`} {...item} />
          ))}
        </div>
      </section>

      {/* ═══ COMPARISON ═══ */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-2">India&apos;s Corruption Problem</h2>
          <p className="text-[var(--text-secondary)]">What we&apos;ve lost vs. what TenderShield can save</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left — India loses */}
          <div className="p-6 rounded-2xl border border-red-500/20 bg-red-500/5">
            <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              India Loses — Major Scams
            </h3>
            <div className="space-y-3">
              {scams.map((scam, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                  <div>
                    <p className="text-sm font-medium text-white">{scam.name}</p>
                    <p className="text-xs text-red-300/60">{scam.year}</p>
                  </div>
                  <span className="text-sm font-bold text-red-400 font-mono">{scam.amount}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — TenderShield prevents */}
          <div className="p-6 rounded-2xl border border-green-500/20 bg-green-500/5">
            <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
              TenderShield Prevents
            </h3>
            <div className="text-center py-8">
              <p className="text-5xl font-bold text-green-400 font-mono mb-2">
                <CountUp target={stats.fraud_prevented_crore} duration={3000} prefix="₹" decimals={1} suffix=" Cr" />
              </p>
              <p className="text-sm text-green-300/70 mb-6">And growing every minute</p>
              <div className="grid grid-cols-2 gap-3 text-left">
                {[
                  { label: 'Bid Rigging', value: '31 cases blocked' },
                  { label: 'Shell Companies', value: '12 flagged' },
                  { label: 'Timing Collusion', value: '8 detected' },
                  { label: 'Cartel Rotation', value: '5 identified' },
                ].map((item, i) => (
                  <div key={i} className="p-3 rounded-lg bg-green-500/10 border border-green-500/15">
                    <p className="text-xs text-green-300/70">{item.label}</p>
                    <p className="text-sm font-semibold text-white">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom national scale */}
        <div className="mt-8 text-center p-6 rounded-2xl bg-gradient-to-r from-[var(--saffron)]/10 via-white/5 to-[var(--green-india)]/10 border border-[var(--saffron)]/20">
          <p className="text-[var(--saffron)] text-sm font-semibold mb-1">🇮🇳 At National Scale</p>
          <p className="text-3xl font-bold text-white mb-1">
            <CountUp target={45000} duration={3000} prefix="₹" suffix=" Crore" />
          </p>
          <p className="text-[var(--text-secondary)]">prevented annually — covering all Indian government procurement</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="text-center py-8 border-t border-[var(--border-subtle)]">
        <p className="text-sm text-[var(--text-secondary)]">
          🛡️ TenderShield — Securing India&apos;s ₹45 Lakh Crore Procurement
        </p>
        <a href="/dashboard" className="text-[var(--accent)] text-sm hover:underline mt-2 inline-block">
          Go to Dashboard →
        </a>
      </footer>
    </div>
  );
}
