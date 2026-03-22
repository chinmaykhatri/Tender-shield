// FILE: app/api/financial-trail/[tender_id]/route.ts
// PURPOSE: Financial trail showing money flow for a tender
// ACCESS: CAG_AUDITOR and NIC_ADMIN only

export const dynamic = 'force-dynamic';

interface PaymentNode {
  from: string;
  to: string;
  amount_crore: number;
  pct: number;
  date: string;
  milestone: string;
  status: string;
  anomalies: string[];
}

interface PEPConnection {
  entity: string;
  connection: string;
  risk: string;
  source: string;
}

const DEMO_TRAILS: Record<string, { tender_id: string; total_value_crore: number; payment_trail: PaymentNode[]; pep_connections: PEPConnection[]; overall_trail_risk: string; anomaly_count: number }> = {
  'TDR-MoH-2025-000003': {
    tender_id: 'TDR-MoH-2025-000003',
    total_value_crore: 120,
    payment_trail: [
      {
        from: 'Ministry of Health & Family Welfare',
        to: 'MedTech Solutions Pvt Ltd',
        amount_crore: 36,
        pct: 30,
        date: '2025-04-01',
        milestone: 'Advance Payment (30%)',
        status: 'PAID',
        anomalies: [],
      },
      {
        from: 'MedTech Solutions Pvt Ltd',
        to: 'SubSupplier Co Ltd',
        amount_crore: 28,
        pct: 78,
        date: '2025-04-03',
        milestone: 'Subcontractor Payment',
        status: 'FLAGGED',
        anomalies: [
          'Payment within 48hrs of receipt — matches layering pattern',
          'Subcontractor GSTIN registered only 1 month ago',
          '78% of advance forwarded to single entity',
        ],
      },
      {
        from: 'SubSupplier Co Ltd',
        to: 'Unknown Offshore Entity',
        amount_crore: 18,
        pct: 64,
        date: '2025-04-05',
        milestone: 'Equipment Import',
        status: 'FLAGGED',
        anomalies: [
          'Offshore payment within 5 days of original government payment',
          'No matching import documentation found',
        ],
      },
    ],
    pep_connections: [
      {
        entity: 'SubSupplier Co Ltd',
        connection: 'Director shares PAN with spouse of tendering ministry official',
        risk: 'HIGH',
        source: 'PAN Cross-Reference + MCA Database',
      },
      {
        entity: 'Unknown Offshore Entity',
        connection: 'Registered in UAE free zone — same address as 4 other Indian govt contractors',
        risk: 'CRITICAL',
        source: 'International Entity Screening',
      },
    ],
    overall_trail_risk: 'CRITICAL',
    anomaly_count: 5,
  },
};

export async function GET(
  req: Request,
  { params }: { params: { tender_id: string } }
) {
  try {
    const tenderId = params.tender_id;
    const trail = DEMO_TRAILS[tenderId] || DEMO_TRAILS['TDR-MoH-2025-000003'];

    return Response.json({
      success: true,
      data: { ...trail, tender_id: tenderId },
      demo_note: 'Financial trail data is simulated. Real deployment connects to PFMS and RBI APIs.',
    });
  } catch (error) {
    console.error('[FinancialTrail] Error:', error);
    return Response.json({ success: false, error: 'Failed to fetch financial trail' }, { status: 500 });
  }
}
