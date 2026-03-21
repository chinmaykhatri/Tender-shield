// ─────────────────────────────────────────────────
// FILE: components/BidderReputationCard.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none — calls /api/reputation/[bidder_id]
// WHAT THIS FILE DOES: Displays a bidder's TRS (TenderShield Reputation Score) with breakdown
// ─────────────────────────────────────────────────
'use client';

import { useState, useEffect } from 'react';

interface TRS {
  company_name: string; gstin: string; trs: number; band: string; color: string;
  breakdown: { factor: string; points: number }[];
  years_in_business: number; tenders_on_time: number; msme_registered: boolean; late_deliveries: number;
}

export default function BidderReputationCard({ bidderId }: { bidderId: string }) {
  const [data, setData] = useState<TRS | null>(null);

  useEffect(() => {
    fetch(`/api/reputation/${bidderId}`).then(r => r.json()).then(setData).catch(() => {});
  }, [bidderId]);

  if (!data) return <div className="card-glass p-4 animate-pulse"><div className="h-20 bg-[var(--bg-secondary)] rounded" /></div>;

  const pct = (data.trs / 1000) * 100;
  const bandEmoji = data.trs >= 800 ? '🟢' : data.trs >= 600 ? '🔵' : data.trs >= 400 ? '🟡' : data.trs >= 200 ? '🟠' : '🔴';

  return (
    <div className="card-glass rounded-xl p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm">🏢 {data.company_name}</h3>
          <p className="text-[10px] font-mono text-[var(--text-secondary)]">GSTIN: {data.gstin}</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span className="text-xs text-[var(--text-secondary)]">TRS</span>
        <span className="text-2xl font-bold" style={{ color: data.color }}>{data.trs}</span>
        <span className="text-xs text-[var(--text-secondary)]">/ 1000</span>
        <div className="flex-1 risk-meter">
          <div className="risk-meter-fill" style={{ width: `${pct}%`, background: data.color }} />
        </div>
        <span className="text-xs">{Math.round(pct)}%</span>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span>{bandEmoji}</span>
        <span className="text-sm font-bold" style={{ color: data.color }}>{data.band}</span>
      </div>

      <div className="space-y-1.5 text-xs">
        {data.tenders_on_time > 0 && <div className="flex items-center gap-2"><span className="text-green-400">✅</span>{data.tenders_on_time} tenders completed on time</div>}
        {data.msme_registered && <div className="flex items-center gap-2"><span className="text-green-400">✅</span>MSME registered</div>}
        {data.years_in_business > 0 && <div className="flex items-center gap-2"><span className="text-green-400">✅</span>{data.years_in_business} years in business</div>}
        {data.late_deliveries > 0 && <div className="flex items-center gap-2"><span className="text-yellow-400">⚠️</span>{data.late_deliveries} late delivery</div>}
        {data.breakdown.filter(b => b.points < -100).map((b, i) => (
          <div key={i} className="flex items-center gap-2"><span className="text-red-400">❌</span>{b.factor}</div>
        ))}
      </div>
    </div>
  );
}
