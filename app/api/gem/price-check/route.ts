// ─────────────────────────────────────────────────
// FILE: app/api/gem/price-check/route.ts
// TYPE: API ROUTE
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Compares bid prices against GeM catalog prices
// ─────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

const GEM_PRICE_CATALOG: Record<string, Record<string, { gem_price: number; unit: string }>> = {
  'Medical Equipment': {
    'ECG Machine': { gem_price: 85000, unit: 'per unit' },
    'Ventilator': { gem_price: 450000, unit: 'per unit' },
    'Surgical Kit': { gem_price: 12000, unit: 'per kit' },
    'Hospital Bed': { gem_price: 25000, unit: 'per unit' },
    'Defibrillator': { gem_price: 180000, unit: 'per unit' },
    'Patient Monitor': { gem_price: 120000, unit: 'per unit' },
    'X-Ray Machine': { gem_price: 1500000, unit: 'per unit' },
    'Ultrasound System': { gem_price: 800000, unit: 'per unit' },
  },
  'IT Equipment': {
    'Laptop': { gem_price: 55000, unit: 'per unit' },
    'Desktop Computer': { gem_price: 42000, unit: 'per unit' },
    'Server': { gem_price: 280000, unit: 'per unit' },
    'Router': { gem_price: 8500, unit: 'per unit' },
    'UPS 1KVA': { gem_price: 6500, unit: 'per unit' },
    'Projector': { gem_price: 45000, unit: 'per unit' },
  },
  'Office Supplies': {
    'A4 Paper Ream': { gem_price: 350, unit: 'per ream' },
    'Printer Cartridge': { gem_price: 2800, unit: 'per unit' },
    'Office Chair': { gem_price: 5500, unit: 'per unit' },
    'Office Desk': { gem_price: 8000, unit: 'per unit' },
  },
};

export async function POST(request: NextRequest) {
  try {
    const { category, items } = await request.json();

    if (!category || !items || !Array.isArray(items)) {
      return NextResponse.json({ success: false, error: 'category and items[] required' }, { status: 400 });
    }

    const catalog = GEM_PRICE_CATALOG[category] || {};
    const OVERPRICE_THRESHOLD = 1.3; // 30% above GeM

    const checked = items.map((item: any) => {
      const gemItem = catalog[item.name];
      if (!gemItem) {
        return { ...item, gem_price: null, deviation_pct: null, flagged: false, message: 'Item not in GeM catalog' };
      }

      const bidPrice = Number(item.unit_price) || 0;
      const deviationPct = ((bidPrice - gemItem.gem_price) / gemItem.gem_price) * 100;
      const flagged = bidPrice > gemItem.gem_price * OVERPRICE_THRESHOLD;

      return {
        name: item.name,
        qty: item.qty,
        bid_price: bidPrice,
        gem_price: gemItem.gem_price,
        gem_unit: gemItem.unit,
        deviation_pct: Math.round(deviationPct * 10) / 10,
        flagged,
        message: flagged
          ? `Bid ₹${bidPrice.toLocaleString('en-IN')} is ${Math.round(deviationPct)}% above GeM rate of ₹${gemItem.gem_price.toLocaleString('en-IN')}`
          : deviationPct < 0
            ? `Below GeM rate — competitive pricing`
            : `Within acceptable range`,
      };
    });

    const overpriced = checked.filter((i: any) => i.flagged);
    const totalOverprice = overpriced.reduce((sum: number, i: any) => {
      const qty = Number(i.qty) || 1;
      return sum + (i.bid_price - i.gem_price) * qty;
    }, 0);

    return NextResponse.json({
      success: true,
      data: {
        category,
        items_checked: checked.length,
        items_overpriced: overpriced.length,
        total_overprice: totalOverprice,
        total_overprice_crore: Math.round(totalOverprice / 1_00_00_000 * 100) / 100,
        items: checked,
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
