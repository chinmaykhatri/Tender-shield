'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { getTenders, formatPaise, getStatusBadge } from '@/lib/api';

export default function TendersPage() {
  const { token } = useAuthStore();
  const [tenders, setTenders] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    getTenders(token, filter || undefined)
      .then(res => setTenders(res.tenders || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [token, filter]);

  const filters = ['', 'BIDDING_OPEN', 'DRAFT', 'FROZEN_BY_AI', 'AWARDED'];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold">Tenders</h1>
          <p className="text-sm text-[var(--text-secondary)]">Blockchain-anchored procurement tenders</p>
        </div>
        <div className="flex gap-2">
          {filters.map(f => (
            <button key={f} onClick={() => { setFilter(f); setLoading(true); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}>
              {f || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 shimmer rounded-2xl" />)}</div>
      ) : tenders.length === 0 ? (
        <div className="card-glass p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-lg font-medium">No tenders found</p>
          <p className="text-sm text-[var(--text-secondary)]">Create a new tender or change filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tenders.map((tender, i) => {
            const badge = getStatusBadge(tender.status);
            return (
              <div key={i} className="card-glass p-5 flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
                  style={{ background: tender.status === 'FROZEN_BY_AI' ? 'rgba(239,68,68,0.15)' : 'rgba(99,102,241,0.1)' }}>
                  {tender.status === 'FROZEN_BY_AI' ? '🚨' : tender.category === 'WORKS' ? '🏗️' : tender.category === 'GOODS' ? '📦' : '🔧'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-semibold truncate">{tender.title}</h3>
                    <span className={`badge ${badge.class}`}>{badge.label}</span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mb-2 line-clamp-2">{tender.description}</p>
                  <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
                    <span>🏛️ {tender.ministry_code}</span>
                    <span>💰 {formatPaise(tender.estimated_value_paise)}</span>
                    <span>📂 {tender.category}</span>
                    <span className="font-mono text-[10px]">{tender.tender_id}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-display font-bold text-[var(--accent)]">{formatPaise(tender.estimated_value_paise)}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{tender.procurement_method}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
