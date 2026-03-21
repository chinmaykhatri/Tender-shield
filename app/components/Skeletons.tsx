'use client';

/**
 * TenderShield — Loading Skeleton Components
 * Premium shimmer loading states for every dashboard section.
 */

export function StatCardSkeleton() {
  return (
    <div className="stat-card animate-pulse">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded bg-[var(--bg-secondary)]" />
        <div className="h-3 w-20 rounded bg-[var(--bg-secondary)]" />
      </div>
      <div className="h-8 w-16 rounded bg-[var(--bg-secondary)]" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-[var(--bg-secondary)]" style={{ width: `${60 + (i * 13) % 40}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="card-glass overflow-hidden">
      <div className="p-4 border-b border-[var(--border-subtle)]">
        <div className="h-5 w-32 rounded bg-[var(--bg-secondary)] animate-pulse" />
      </div>
      <table className="w-full">
        <thead>
          <tr>
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="px-4 py-3 text-left">
                <div className="h-3 rounded bg-[var(--bg-secondary)] animate-pulse" style={{ width: `${50 + (i * 17) % 30}%` }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function EventFeedSkeleton() {
  return (
    <div className="card-glass p-6">
      <div className="h-5 w-40 rounded bg-[var(--bg-secondary)] animate-pulse mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-secondary)] animate-pulse">
            <div className="w-8 h-8 rounded-full bg-[var(--border-subtle)]" />
            <div className="flex-1 space-y-2">
              <div className="h-3 rounded bg-[var(--border-subtle)]" style={{ width: `${50 + (i * 19) % 30}%` }} />
              <div className="h-2 rounded bg-[var(--border-subtle)]" style={{ width: `${30 + (i * 11) % 20}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="card-glass p-6 animate-pulse">
      <div className="h-5 w-40 rounded bg-[var(--bg-secondary)] mb-4" />
      <div className="h-64 rounded-lg bg-[var(--bg-secondary)] flex items-end justify-around px-4 pb-4 gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="rounded-t bg-[var(--border-subtle)]"
            style={{ width: '12%', height: `${20 + ((i * 23 + 17) % 70)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <div className="h-7 w-40 rounded bg-[var(--bg-secondary)] animate-pulse mb-2" />
        <div className="h-4 w-64 rounded bg-[var(--bg-secondary)] animate-pulse" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><EventFeedSkeleton /></div>
        <EventFeedSkeleton />
      </div>
    </div>
  );
}
