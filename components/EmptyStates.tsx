'use client';

// ══════════════════════════════════════════════════════════
// EMPTY STATES — Beautiful "no data" views for every section
// Used when: API returns empty arrays, filters match nothing
// ══════════════════════════════════════════════════════════

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon = '📭', title, description, action }: EmptyStateProps) {
  return (
    <div style={{
      padding: '48px 24px',
      textAlign: 'center',
      borderRadius: '16px',
      background: 'rgba(255,255,255,0.02)',
      border: '1px dashed rgba(255,255,255,0.08)',
    }}>
      <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.7 }}>{icon}</div>
      <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#ccc', marginBottom: '6px' }}>{title}</h3>
      {description && (
        <p style={{ fontSize: '13px', color: '#666', maxWidth: '300px', margin: '0 auto', lineHeight: 1.5 }}>
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop: '16px',
            padding: '8px 20px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            minHeight: '40px',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// Pre-built empty states for each section
export function NoTenders({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon="📋"
      title="No Tenders Found"
      description="No tenders match your current filters. Try adjusting the filter or create a new tender."
      action={onCreate ? { label: '+ Create Tender', onClick: onCreate } : undefined}
    />
  );
}

export function NoBids() {
  return (
    <EmptyState
      icon="🔒"
      title="No Bids Submitted"
      description="No bids have been submitted for this tender yet. Bids are sealed using cryptographic commitments (SHA-256)."
    />
  );
}

export function NoAlerts() {
  return (
    <EmptyState
      icon="✅"
      title="No Active Alerts"
      description="All clear! The AI fraud engine has not detected any suspicious activity."
    />
  );
}

export function NoBlockchainData() {
  return (
    <EmptyState
      icon="⛓️"
      title="Waiting for Blockchain Data"
      description="The blockchain explorer is waiting for events. New transactions will appear here in real-time."
    />
  );
}

export function NoAuditTrail() {
  return (
    <EmptyState
      icon="📜"
      title="No Audit Events"
      description="The audit trail is empty. Events will be logged as actions are performed on the platform."
    />
  );
}

export function NoSearchResults({ query }: { query?: string }) {
  return (
    <EmptyState
      icon="🔍"
      title="No Results Found"
      description={query ? `No results for "${query}". Try a different search term.` : 'Try adjusting your search criteria.'}
    />
  );
}

export function ServiceDown({ service }: { service: string }) {
  return (
    <EmptyState
      icon="🔧"
      title={`${service} Unavailable`}
      description={`The ${service} is temporarily offline. The system is using fallback data. Check back shortly.`}
    />
  );
}

export function LoadingError({ onRetry }: { onRetry: () => void }) {
  return (
    <EmptyState
      icon="⚠️"
      title="Failed to Load"
      description="Could not load this data. This might be a temporary network issue."
      action={{ label: '🔄 Try Again', onClick: onRetry }}
    />
  );
}
