// ══════════════════════════════════════════════════════════
// DASHBOARD LOADING SKELETON — Shown while routes load
// ══════════════════════════════════════════════════════════

export default function DashboardLoading() {
  return (
    <div style={{ padding: '24px', animation: 'fadeIn 0.3s ease' }}>
      {/* Header skeleton */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ ...shimmer, width: '280px', height: '36px', borderRadius: '8px', marginBottom: '8px' }} />
        <div style={{ ...shimmer, width: '180px', height: '16px', borderRadius: '6px' }} />
      </div>

      {/* Alert skeleton */}
      <div style={{ ...shimmer, width: '100%', height: '60px', borderRadius: '14px', marginBottom: '24px' }} />

      {/* Stat cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ ...shimmer, height: '120px', borderRadius: '16px' }} />
        ))}
      </div>

      {/* Value cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[1, 2].map(i => (
          <div key={i} style={{ ...shimmer, height: '100px', borderRadius: '16px' }} />
        ))}
      </div>

      {/* Bottom sections */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        <div style={{ ...shimmer, height: '300px', borderRadius: '16px' }} />
        <div style={{ ...shimmer, height: '300px', borderRadius: '16px' }} />
      </div>

      <style>{`
        @keyframes shimmerAnim {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

const shimmer: React.CSSProperties = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.05) 50%, rgba(255,255,255,0.02) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmerAnim 1.5s ease-in-out infinite',
  border: '1px solid rgba(255,255,255,0.04)',
};
