// ─────────────────────────────────────────────────
// FILE: components/GemVerification.tsx
// TYPE: CLIENT COMPONENT
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: GeM seller verification UI + price comparison
// ─────────────────────────────────────────────────
'use client';

import { useState } from 'react';

interface GemVerificationProps {
  mode?: 'verify' | 'price-check' | 'both';
}

const DEMO_ITEMS = [
  { name: 'ECG Machine', qty: 50, unit_price: 123000 },
  { name: 'Ventilator', qty: 20, unit_price: 580000 },
  { name: 'Hospital Bed', qty: 200, unit_price: 24000 },
  { name: 'Patient Monitor', qty: 30, unit_price: 165000 },
];

export default function GemVerification({ mode = 'both' }: GemVerificationProps) {
  const [gemId, setGemId] = useState('');
  const [sellerData, setSellerData] = useState<any>(null);
  const [priceData, setPriceData] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [checking, setChecking] = useState(false);

  const verifySeller = async () => {
    if (!gemId) return;
    setVerifying(true);
    setSellerData(null);
    try {
      const res = await fetch('/api/verify/gem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gem_seller_id: gemId }),
      });
      const data = await res.json();
      if (data.success) setSellerData(data.data);
    } catch {}
    setVerifying(false);
  };

  const checkPrices = async () => {
    setChecking(true);
    setPriceData(null);
    try {
      const res = await fetch('/api/gem/price-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'Medical Equipment', items: DEMO_ITEMS }),
      });
      const data = await res.json();
      if (data.success) setPriceData(data.data);
    } catch {}
    setChecking(false);
  };

  const ratingColor = (r: number) => r >= 4 ? '#22c55e' : r >= 3 ? '#f59e0b' : r > 0 ? '#ef4444' : '#6b7280';

  return (
    <div className="space-y-6">
      {(mode === 'verify' || mode === 'both') && (
        <div className="card-glass p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🛒</span>
            <div>
              <h3 className="font-semibold">GeM Seller Verification</h3>
              <p className="text-xs text-[var(--text-secondary)]">Verify bidders against Government e-Marketplace (gem.gov.in)</p>
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <input className="input-field font-mono" placeholder="e.g. GeM-1-2020-12345678"
              value={gemId} onChange={e => setGemId(e.target.value)} />
            <button onClick={verifySeller} disabled={verifying || !gemId}
              className="btn-primary px-5 whitespace-nowrap disabled:opacity-50">
              {verifying ? '⏳' : '🔍'} Verify
            </button>
          </div>

          {/* Quick test IDs */}
          <div className="flex flex-wrap gap-2 mb-4">
            <p className="text-xs text-[var(--text-secondary)] w-full">Try these demo IDs:</p>
            {['GeM-1-2020-12345678', 'GeM-1-2025-00001234', 'GeM-1-2019-56789012'].map(id => (
              <button key={id} onClick={() => { setGemId(id); setSellerData(null); }}
                className="text-[10px] font-mono px-2 py-1 rounded bg-[var(--bg-secondary)] hover:bg-[var(--bg-card-hover)] text-[var(--accent)] transition-all">
                {id}
              </button>
            ))}
          </div>

          {sellerData && (
            <div className="animate-fade-in">
              {sellerData.valid ? (
                <div className={`p-4 rounded-xl border ${sellerData.warning ? 'bg-[#f59e0b]/5 border-[#f59e0b]/20' : 'bg-green-500/5 border-green-500/20'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`badge text-xs ${sellerData.warning ? 'bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30' : 'bg-green-500/10 text-green-400 border border-green-500/30'}`}>
                        {sellerData.warning ? '⚠️ GeM Verified — Caution' : '✅ GeM Verified'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-bold" style={{ color: ratingColor(sellerData.seller_rating) }}>
                        {sellerData.seller_rating > 0 ? `★ ${sellerData.seller_rating}` : 'No Rating'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-[var(--text-secondary)] text-xs">Seller</span><p className="font-semibold">{sellerData.seller_name}</p></div>
                    <div><span className="text-[var(--text-secondary)] text-xs">Registered</span><p>{sellerData.registration_date}</p></div>
                    <div><span className="text-[var(--text-secondary)] text-xs">Orders</span><p className="font-semibold">{sellerData.total_orders}</p></div>
                    <div><span className="text-[var(--text-secondary)] text-xs">Total Value</span><p>₹{sellerData.total_value_crore} Cr</p></div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {sellerData.categories?.map((c: string) => (
                      <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent)]/10 text-[var(--accent)]">{c}</span>
                    ))}
                  </div>

                  {sellerData.warning && (
                    <p className="text-xs text-[#f59e0b] mt-3 font-semibold">⚠️ {sellerData.warning}</p>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-center">
                  <span className="text-2xl">❌</span>
                  <p className="text-sm font-semibold text-red-400 mt-2">GeM Seller ID Not Found</p>
                  <p className="text-xs text-[var(--text-secondary)]">This bidder is not registered on Government e-Marketplace</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {(mode === 'price-check' || mode === 'both') && (
        <div className="card-glass p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">💰</span>
              <div>
                <h3 className="font-semibold">GeM Price Comparison</h3>
                <p className="text-xs text-[var(--text-secondary)]">Compare bid prices against GeM catalog rates</p>
              </div>
            </div>
            <button onClick={checkPrices} disabled={checking}
              className="btn-primary px-4 text-sm disabled:opacity-50">
              {checking ? '⏳ Checking...' : '📊 Run Price Check'}
            </button>
          </div>

          {/* Demo items */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[var(--text-secondary)] border-b border-[var(--border-subtle)]">
                  <th className="text-left py-2">Item</th>
                  <th className="text-right py-2">Qty</th>
                  <th className="text-right py-2">Bid Price</th>
                  {priceData && <th className="text-right py-2">GeM Price</th>}
                  {priceData && <th className="text-right py-2">Deviation</th>}
                  {priceData && <th className="text-center py-2">Status</th>}
                </tr>
              </thead>
              <tbody>
                {(priceData ? priceData.items : DEMO_ITEMS).map((item: any, i: number) => (
                  <tr key={i} className="border-b border-[var(--border-subtle)]">
                    <td className="py-2">{item.name}</td>
                    <td className="text-right py-2">{item.qty}</td>
                    <td className="text-right py-2 font-mono">₹{(item.bid_price || item.unit_price).toLocaleString('en-IN')}</td>
                    {priceData && (
                      <>
                        <td className="text-right py-2 font-mono text-[var(--accent)]">
                          {item.gem_price ? `₹${item.gem_price.toLocaleString('en-IN')}` : '—'}
                        </td>
                        <td className="text-right py-2 font-semibold" style={{
                          color: item.deviation_pct > 30 ? '#ef4444' : item.deviation_pct > 10 ? '#f59e0b' : item.deviation_pct < 0 ? '#22c55e' : '#a0a0c0',
                        }}>
                          {item.deviation_pct !== null ? `${item.deviation_pct > 0 ? '+' : ''}${item.deviation_pct}%` : '—'}
                        </td>
                        <td className="text-center py-2">
                          {item.flagged ? <span className="text-red-400 text-xs font-bold">🔴 OVERPRICED</span> : <span className="text-green-400 text-xs">✅ OK</span>}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {priceData && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/5 border border-red-500/20 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-red-400">
                  {priceData.items_overpriced} of {priceData.items_checked} items overpriced
                </span>
                <span className="text-sm font-bold text-red-400">
                  Excess: ₹{priceData.total_overprice.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
