/**
 * TenderShield — Skeleton Loading Components
 * Premium shimmer effect for loading states.
 */

'use client';

import React from 'react';

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
  borderRadius: '12px',
};

export function SkeletonCard({ height = 120, width = '100%' }: { height?: number; width?: string | number }) {
  return (
    <div
      style={{
        ...shimmerStyle,
        height: `${height}px`,
        width,
        border: '1px solid rgba(255,255,255,0.04)',
      }}
      role="status"
      aria-label="Loading content"
    />
  );
}

export function SkeletonText({ lines = 3, width = '100%' }: { lines?: number; width?: string | number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width }} role="status" aria-label="Loading text">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            ...shimmerStyle,
            height: '14px',
            width: i === lines - 1 ? '70%' : '100%',
          }}
        />
      ))}
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div
      style={{
        padding: '20px',
        borderRadius: '16px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
      role="status"
      aria-label="Loading statistic"
    >
      <div style={{ ...shimmerStyle, height: '12px', width: '60%' }} />
      <div style={{ ...shimmerStyle, height: '32px', width: '80%' }} />
      <div style={{ ...shimmerStyle, height: '10px', width: '40%' }} />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
        <SkeletonCard height={280} />
        <SkeletonCard height={280} />
      </div>
      {/* Table */}
      <SkeletonCard height={200} />
      {/* Shimmer keyframes */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

export function SkeletonTenderList() {
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} height={100} />
      ))}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
