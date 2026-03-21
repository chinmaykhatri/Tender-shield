// ─────────────────────────────────────────────────
// FILE: app/api/approvals/route.ts
// TYPE: SERVER API ROUTE
// SECRET KEYS USED: none
// WHAT THIS FILE DOES: Multi-signature approval workflow for high-value tenders
// ─────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

interface Approval {
  level: number; role: string; name: string; status: 'APPROVED' | 'PENDING' | 'REJECTED';
  signed_at?: string; signature_hash?: string; comments?: string;
}

const DEMO_APPROVALS: Record<string, { tender_id: string; current_state: string; approvals: Approval[] }> = {
  'TDR-MoRTH-2025-000001': {
    tender_id: 'TDR-MoRTH-2025-000001',
    current_state: 'LEVEL_3_PENDING',
    approvals: [
      { level: 1, role: 'Junior Officer', name: 'Rajesh Kumar', status: 'APPROVED', signed_at: '10:30 IST, March 5, 2025', signature_hash: '0x4f7a3b2c8d1e5f9a7c6b4a3d2e1f8c7b' },
      { level: 2, role: 'Senior Officer', name: 'Dr. Priya Sharma', status: 'APPROVED', signed_at: '14:22 IST, March 6, 2025', signature_hash: '0x9c2e7f1a4d8b5e3c6a9f2d1b7e4c8a5f' },
      { level: 3, role: 'Ministry Secretary', name: 'Pending', status: 'PENDING' },
    ],
  },
  'TDR-MoH-2025-000003': {
    tender_id: 'TDR-MoH-2025-000003',
    current_state: 'FROZEN_BY_AI',
    approvals: [
      { level: 1, role: 'Junior Officer', name: 'Vikram Singh', status: 'APPROVED', signed_at: '09:15 IST, Feb 10, 2025', signature_hash: '0xf1e2d3c4b5a69877665544332211ffee' },
      { level: 2, role: 'Senior Officer', name: 'System', status: 'REJECTED', signed_at: '17:03 IST, March 11, 2025', signature_hash: '0xa1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6', comments: 'AI detected fraud — tender frozen automatically' },
    ],
  },
};

export async function GET(request: NextRequest) {
  const tenderId = request.nextUrl.searchParams.get('tender_id') || 'TDR-MoRTH-2025-000001';
  const data = DEMO_APPROVALS[tenderId] || DEMO_APPROVALS['TDR-MoRTH-2025-000001'];
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { tender_id, level, action, comments } = body;

  return NextResponse.json({
    success: true,
    tender_id,
    level,
    action,
    signed_at: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    signature_hash: '0x' + Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    next_state: action === 'APPROVE' ? (level < 3 ? `LEVEL_${level + 1}_PENDING` : 'PUBLISHED') : 'DRAFT',
    demo: true,
  });
}
