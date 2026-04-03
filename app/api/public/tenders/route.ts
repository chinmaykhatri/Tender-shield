// FILE: app/api/public/tenders/route.ts
// PURPOSE: Public tender data — no auth, no sensitive fields
// ACCESS: PUBLIC — anyone can call this

import { logger } from '@/lib/logger';
export const dynamic = 'force-dynamic';

interface PublicTender {
  tender_id: string;
  title: string;
  ministry: string;
  category: string;
  estimated_value_crore: number;
  status: string;
  risk_score: number;
  risk_level: string;
  bid_count: number;
  winner_price_crore: number | null;
  published_date: string;
  deadline: string;
  is_frozen: boolean;
  freeze_reason_public: string | null;
  blockchain_tx: string;
}

const DEMO_TENDERS: PublicTender[] = [
  {
    tender_id: 'TDR-MoH-2025-000003',
    title: 'AIIMS Delhi Medical Equipment Procurement',
    ministry: 'Ministry of Health & Family Welfare',
    category: 'GOODS',
    estimated_value_crore: 120,
    status: 'FROZEN_BY_AI',
    risk_score: 94,
    risk_level: 'CRITICAL',
    bid_count: 4,
    winner_price_crore: null,
    published_date: '2025-02-15',
    deadline: '2025-03-10',
    is_frozen: true,
    freeze_reason_public: 'AI detected statistical anomalies in bidding pattern — under investigation',
    blockchain_tx: '0x2e5c8b1d4a7f3c9e...',
  },
  {
    tender_id: 'TDR-MoRTH-2025-000001',
    title: 'NH-48 Highway Expansion — Phase III',
    ministry: 'Ministry of Road Transport & Highways',
    category: 'WORKS',
    estimated_value_crore: 340,
    status: 'AWARDED',
    risk_score: 23,
    risk_level: 'LOW',
    bid_count: 7,
    winner_price_crore: 312,
    published_date: '2025-01-10',
    deadline: '2025-02-15',
    is_frozen: false,
    freeze_reason_public: null,
    blockchain_tx: '0x4a7f3c9e1b5d8a2f...',
  },
  {
    tender_id: 'TDR-MoD-2025-000009',
    title: 'Defence Vehicle Spare Parts Supply',
    ministry: 'Ministry of Defence',
    category: 'GOODS',
    estimated_value_crore: 85,
    status: 'LOCKED_BY_AI',
    risk_score: 78,
    risk_level: 'HIGH',
    bid_count: 3,
    winner_price_crore: null,
    published_date: '2025-03-01',
    deadline: '2025-03-25',
    is_frozen: true,
    freeze_reason_public: 'AI flagged potential cartel rotation — awaiting senior officer review',
    blockchain_tx: '0x8f7a6b5c4d3e2f1a...',
  },
  {
    tender_id: 'TDR-MoF-2025-000005',
    title: 'IT Infrastructure Upgrade — Regional Offices',
    ministry: 'Ministry of Finance',
    category: 'SERVICES',
    estimated_value_crore: 45,
    status: 'BIDDING_OPEN',
    risk_score: 15,
    risk_level: 'LOW',
    bid_count: 12,
    winner_price_crore: null,
    published_date: '2025-03-05',
    deadline: '2025-04-05',
    is_frozen: false,
    freeze_reason_public: null,
    blockchain_tx: '0x1b5d8a2f4e7c0b3d...',
  },
  {
    tender_id: 'TDR-MoRail-2025-000014',
    title: 'Railway Signal Equipment — Northern Zone',
    ministry: 'Ministry of Railways',
    category: 'GOODS',
    estimated_value_crore: 210,
    status: 'UNDER_EVALUATION',
    risk_score: 52,
    risk_level: 'MEDIUM',
    bid_count: 5,
    winner_price_crore: null,
    published_date: '2025-02-20',
    deadline: '2025-03-20',
    is_frozen: false,
    freeze_reason_public: null,
    blockchain_tx: '0x3c9e1b5d8a2f4e7c...',
  },
  {
    tender_id: 'TDR-MoH-2025-000018',
    title: 'Hospital Furniture Supply — District Hospitals',
    ministry: 'Ministry of Health & Family Welfare',
    category: 'GOODS',
    estimated_value_crore: 28,
    status: 'AWARDED',
    risk_score: 8,
    risk_level: 'LOW',
    bid_count: 9,
    winner_price_crore: 25.5,
    published_date: '2025-01-25',
    deadline: '2025-02-28',
    is_frozen: false,
    freeze_reason_public: null,
    blockchain_tx: '0x5d8a2f4e7c0b3d6a...',
  },
];

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ministry = searchParams.get('ministry');
    const riskLevel = searchParams.get('risk_level');
    const status = searchParams.get('status');

    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

    let tenders = DEMO_TENDERS;

    if (!isDemoMode) {
      // Real mode — would query Supabase
      // For now return demo data as fallback
      tenders = DEMO_TENDERS;
    }

    // Apply filters
    if (ministry) {
      tenders = tenders.filter((t) => t.ministry.toLowerCase().includes(ministry.toLowerCase()));
    }
    if (riskLevel) {
      tenders = tenders.filter((t) => t.risk_level === riskLevel.toUpperCase());
    }
    if (status) {
      tenders = tenders.filter((t) => t.status === status.toUpperCase());
    }

    // Aggregate stats
    const stats = {
      total_tenders: tenders.length,
      fraud_detected: tenders.filter((t) => t.is_frozen).length,
      funds_protected_crore: tenders
        .filter((t) => t.is_frozen)
        .reduce((sum, t) => sum + t.estimated_value_crore, 0),
      avg_risk_score: Math.round(
        tenders.reduce((sum, t) => sum + t.risk_score, 0) / (tenders.length || 1)
      ),
    };

    return Response.json({
      success: true,
      stats,
      tenders,
      total: tenders.length,
    });
  } catch (error) {
    logger.error('[PublicTenders] Error:', error);
    return Response.json({ success: false, error: 'Failed to fetch public data' }, { status: 500 });
  }
}

