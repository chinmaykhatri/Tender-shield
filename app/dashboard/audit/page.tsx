'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { getRecentEvents } from '@/lib/api';

export default function AuditPage() {
  const { token } = useAuthStore();
  const [events, setEvents] = useState<any[]>([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    getRecentEvents(token, filter || undefined)
      .then(res => setEvents(res.events || []))
      .catch(console.error)
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
    if (type?.includes('ZKP')) return '🔐';
    return '📜';
  };

  // Demo audit data when no events exist
  const demoEvents = events.length > 0 ? events : [
    { event_id: '1', event_type: 'TENDER_CREATED', topic: 'tender-events', timestamp_ist: '2025-03-12T10:30:15+05:30', data: { tender_id: 'TDR-MoRTH-2025-000001' } },
    { event_id: '2', event_type: 'TENDER_PUBLISHED', topic: 'tender-events', timestamp_ist: '2025-03-12T10:35:22+05:30', data: { tender_id: 'TDR-MoRTH-2025-000001' } },
    { event_id: '3', event_type: 'BID_COMMITTED', topic: 'bid-events', timestamp_ist: '2025-03-12T14:30:45+05:30', data: { bid_id: 'BID-001', phase: 'ZKP_COMMIT' } },
    { event_id: '4', event_type: 'BID_COMMITTED', topic: 'bid-events', timestamp_ist: '2025-03-12T14:31:10+05:30', data: { bid_id: 'BID-002', phase: 'ZKP_COMMIT' } },
    { event_id: '5', event_type: 'TENDER_FROZEN', topic: 'tender-events', timestamp_ist: '2025-03-12T15:00:00+05:30', data: { tender_id: 'TDR-MoH-2025-000001', reason: 'AI fraud detection' } },
    { event_id: '6', event_type: 'ZKP_VERIFICATION_FAILED', topic: 'audit-events', timestamp_ist: '2025-03-12T15:05:33+05:30', data: { bid_id: 'BID-TAMPERED', risk_level: 'HIGH' } },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold">Audit Trail</h1>
        <p className="text-sm text-[var(--text-secondary)]">Immutable blockchain event log — every action recorded on Hyperledger Fabric</p>
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
            Every event is recorded on Hyperledger Fabric with MSP identity, IST timestamp, and blockchain transaction ID.
            Events cannot be modified or deleted — CAG has full read access.
          </p>
        </div>
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
            {(loading ? [] : demoEvents).map((event, i) => (
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
            ))}
            {!loading && demoEvents.length === 0 && (
              <tr><td colSpan={5} className="text-center py-8 text-[var(--text-secondary)]">No events recorded yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
