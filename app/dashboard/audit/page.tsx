'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { getRecentEvents } from '@/lib/api';

export default function AuditPage() {
  const { token } = useAuthStore();
  const [events, setEvents] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<'live' | 'error'>('live');

  useEffect(() => {
    if (!token) return;
    getRecentEvents(token, filter || undefined)
      .then(res => {
        setEvents(res.events || []);
        setDataSource('live');
      })
      .catch(() => {
        setEvents([]);
        setDataSource('error');
      })
      .finally(() => setLoading(false));
  }, [token, filter]);

  const topics = ['', 'tender-events', 'bid-events', 'ai-alerts', 'audit-events'];

  const getEventIcon = (type: string) => {
    if (type?.includes('CREATED')) return '➕';
    if (type?.includes('PUBLISHED')) return '📢';
    if (type?.includes('FROZEN')) return '🚨';
    if (type?.includes('AWARDED')) return '🏆';
    if (type?.includes('COMMITTED')) return '🔒';
    if (type?.includes('REVEALED')) return '🔓';
    if (type?.includes('COMMITMENT')) return '🔐';
    return '📜';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold">Audit Trail</h1>
        <p className="text-sm text-[var(--text-secondary)]">Immutable blockchain event log — every action recorded with SHA-256 hash chain</p>
      </div>

      {/* Topic Filters */}
      <div className="flex gap-2 flex-wrap">
        {topics.map(t => (
          <button key={t} onClick={() => { setFilter(t); setLoading(true); setTimeout(() => setLoading(false), 300); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === t ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}>
            {!t ? '📜 All Events' : t === 'tender-events' ? '📋 Tenders' : t === 'bid-events' ? '🔒 Bids' : t === 'ai-alerts' ? '🤖 AI Alerts' : '🔍 Audit'}
          </button>
        ))}
      </div>

      {/* Info Banner */}
      <div className="card-glass p-4 flex items-center gap-3 border-l-4 border-l-[var(--accent)]">
        <span className="text-xl">📜</span>
        <div>
          <p className="text-sm font-medium">Immutable Audit Trail</p>
          <p className="text-xs text-[var(--text-secondary)]">
            Every event is recorded on the SHA-256 hash chain with IST timestamp and blockchain transaction ID.
            Events cannot be modified or deleted — CAG has full read access.
          </p>
        </div>
        {/* Data source transparency badge */}
        <span className={`ml-auto badge text-[9px] whitespace-nowrap ${dataSource === 'live' ? 'badge-success' : 'badge-warning'}`}>
          {dataSource === 'live' ? '🟢 Live Supabase' : '🟡 API Error'}
        </span>
      </div>

      {/* Events Table */}
      <div className="card-glass overflow-hidden">
        <table className="table-premium">
          <thead>
            <tr>
              <th>Event</th>
              <th>Type</th>
              <th>Topic</th>
              <th>Timestamp (IST)</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8 text-[var(--text-secondary)]">
                <div className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> Loading audit events...
                </div>
              </td></tr>
            ) : events.length > 0 ? (
              events.map((event, i) => (
                <tr key={i}>
                  <td>
                    <span className="text-lg mr-2">{getEventIcon(event.event_type)}</span>
                  </td>
                  <td>
                    <span className={`badge ${event.event_type?.includes('FROZEN') || event.event_type?.includes('FAILED') ? 'badge-danger' : event.event_type?.includes('AWARDED') ? 'badge-success' : 'badge-info'}`}>
                      {event.event_type}
                    </span>
                  </td>
                  <td className="text-xs text-[var(--text-secondary)]">{event.topic}</td>
                  <td className="font-mono text-xs">{event.timestamp_ist?.replace('T', ' ').slice(0, 19)}</td>
                  <td className="text-xs text-[var(--text-secondary)]">
                    {JSON.stringify(event.data || {}).slice(0, 60)}...
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-12">
                  <div className="flex flex-col items-center gap-3">
                    <span className="text-4xl">📭</span>
                    <p className="text-[var(--text-secondary)] font-medium">No audit events recorded yet</p>
                    <p className="text-xs text-[var(--text-secondary)] max-w-md">
                      Events are created automatically when tenders are published, bids are submitted, or AI flags suspicious activity.
                      Create a tender to generate your first audit event.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
