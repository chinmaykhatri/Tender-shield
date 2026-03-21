'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { getTenders } from '@/lib/dataLayer';
import { useTendersRealtime } from '@/hooks/useRealtimeData';
import { getStatusBadge } from '@/lib/api';
import DataSourceBadge from '@/components/DataSourceBadge';
import Link from 'next/link';

export default function TendersPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [rawTenders, setRawTenders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [usingRealData, setUsingRealData] = useState(false);
  const tenders = useTendersRealtime(rawTenders);

  useEffect(() => {
    if (!isAuthenticated) { router.push('/'); return; }
    loadTenders();
  }, [isAuthenticated, router, statusFilter]);

  const loadTenders = async () => {
    setLoading(true);
    const res = await getTenders(statusFilter ? { status: statusFilter } : undefined);
    setRawTenders(res.data || []);
    setUsingRealData(res.using_real_data);
    setLoading(false);
  };

  const statusFilters = ['', 'BIDDING_OPEN', 'UNDER_EVALUATION', 'AWARDED', 'FROZEN_BY_AI'];

  const riskColor = (level: string) => {
    const map: Record<string, string> = { LOW: '#22c55e', MEDIUM: '#f59e0b', HIGH: '#f97316', CRITICAL: '#ef4444' };
    return map[level] || '#6366f1';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-display font-bold">Tenders</h1>
            <DataSourceBadge usingRealData={usingRealData} recordCount={tenders.length} />
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{tenders.length} tenders found</p>
        </div>
        <Link href="/dashboard/tenders/create" className="btn-primary">➕ Create Tender</Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {statusFilters.map(f => (
          <button key={f || 'all'} onClick={() => setStatusFilter(f)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${statusFilter === f ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card)]'}`}>
            {f || 'All'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 shimmer rounded-2xl" />)}
        </div>
      ) : tenders.length === 0 ? (
        <div className="text-center py-16 card-glass">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-[var(--text-secondary)]">No tenders found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tenders.map((tender: any) => {
            const badge = getStatusBadge(tender.status);
            return (
              <Link key={tender.id} href={`/dashboard/tenders/${tender.id}`}
                className="block card-glass p-5 hover:border-[var(--border-glow)] transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`badge ${badge.class}`}>{badge.label}</span>
                      <span className="text-xs font-mono text-[var(--text-secondary)]">{tender.id}</span>
                    </div>
                    <h3 className="text-lg font-semibold mb-1 truncate">{tender.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)] line-clamp-1">{tender.description}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-secondary)]">
                      <span>🏛️ {tender.ministry_code || tender.ministry}</span>
                      <span>📦 {tender.category}</span>
                      <span>📝 {tender.bids_count || 0} bids</span>
                      <span>📅 {tender.deadline_display || new Date(tender.deadline || tender.created_at).toLocaleDateString('en-IN')}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-display font-bold text-[var(--accent)]">
                      {tender.estimated_value_display || `₹${tender.estimated_value_crore} Cr`}
                    </p>
                    {tender.risk_score !== undefined && (
                      <div className="mt-2">
                        <span className="text-xs" style={{ color: riskColor(tender.risk_level) }}>
                          Risk: {tender.risk_score}
                        </span>
                        <div className="risk-meter mt-1 w-20">
                          <div className="risk-meter-fill" style={{ width: `${tender.risk_score}%`, background: riskColor(tender.risk_level) }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
