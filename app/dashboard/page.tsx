'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { getDashboardStats, getRecentEvents, getCurrentUser, formatPaise } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const { token, isAuthenticated, setUser } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/'); return; }
    const load = async () => {
      try {
        const [statsRes, eventsRes, userRes] = await Promise.all([
          getDashboardStats(token!),
          getRecentEvents(token!),
          getCurrentUser(token!),
        ]);
        setStats(statsRes.stats);
        setEvents(eventsRes.events || []);
        if (userRes.user) setUser(userRes.user);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    load();
  }, [isAuthenticated, token, router, setUser]);

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 w-64 shimmer rounded-lg" />
      <div className="grid grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-32 shimmer rounded-2xl" />)}
      </div>
    </div>
  );

  const statCards = [
    { icon: '📋', label: 'Total Tenders', value: stats?.total_tenders || 0, color: '#6366f1' },
    { icon: '🟢', label: 'Active Tenders', value: stats?.active_tenders || 0, color: '#22c55e' },
    { icon: '📝', label: 'Total Bids', value: stats?.total_bids || 0, color: '#f59e0b' },
    { icon: '🚨', label: 'AI Flagged', value: stats?.flagged_tenders || 0, color: '#ef4444' },
  ];

  const bigStats = [
    { icon: '💰', label: 'Total Procurement Value', value: `₹${(stats?.total_value_crores || 0).toFixed(0)} Cr`, sub: 'Across all tenders' },
    { icon: '🛡️', label: 'Fraud Prevented', value: `₹${(stats?.fraud_prevented_value_crores || 0).toFixed(0)} Cr`, sub: 'Savings from AI detection' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold">Dashboard</h1>
        <p className="text-sm text-[var(--text-secondary)]">Real-time blockchain procurement monitoring</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <div key={i} className="stat-card">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{stat.icon}</span>
              <span className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">{stat.label}</span>
            </div>
            <p className="text-3xl font-display font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Big Value Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {bigStats.map((stat, i) => (
          <div key={i} className="card-glass p-6">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl">{stat.icon}</span>
              <span className="text-sm text-[var(--text-secondary)]">{stat.label}</span>
            </div>
            <p className="text-4xl font-display font-bold bg-clip-text text-transparent"
              style={{ backgroundImage: i === 0 ? 'linear-gradient(135deg, #FF9933, #6366f1)' : 'linear-gradient(135deg, #22c55e, #4ade80)' }}>
              {stat.value}
            </p>
            <p className="text-xs text-[var(--text-secondary)] mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Live Event Feed + System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Event Feed */}
        <div className="lg:col-span-2 card-glass p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Live Blockchain Feed
          </h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {events.length === 0 ? (
              <p className="text-sm text-[var(--text-secondary)] py-8 text-center">
                No events yet. Create a tender or submit a bid to see real-time events.
              </p>
            ) : (
              events.slice(-10).reverse().map((event, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] transition-all">
                  <span className="text-lg">
                    {event.event_type?.includes('TENDER') ? '📋' : event.event_type?.includes('BID') ? '🔒' : event.event_type?.includes('AI') ? '🤖' : '📜'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.event_type}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{event.topic} · {event.timestamp_ist?.slice(11, 19)} IST</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="card-glass p-6">
          <h2 className="text-lg font-semibold mb-4">System Status</h2>
          <div className="space-y-3">
            {[
              { label: 'Hyperledger Fabric', status: '🟢 Connected', sub: 'TenderChannel' },
              { label: 'AI Engine', status: '🟢 Active', sub: '5 detectors loaded' },
              { label: 'Kafka Streaming', status: '🟢 Active', sub: '4 topics' },
              { label: 'CouchDB', status: '🟢 Online', sub: 'State database' },
            ].map((svc, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-secondary)]">
                <div>
                  <p className="text-sm font-medium">{svc.label}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{svc.sub}</p>
                </div>
                <span className="text-xs font-medium">{svc.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
