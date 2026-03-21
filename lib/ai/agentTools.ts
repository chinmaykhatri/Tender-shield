// FILE: lib/ai/agentTools.ts
// FEATURE: Feature 1 — Claude Agentic Fraud Investigation
// DEMO MODE: Tools defined here are used in both modes
// REAL MODE: Same tool definitions — executor handles mode switching

export const INVESTIGATION_TOOLS = [
  {
    name: 'search_related_tenders',
    description: 'Search for other tenders from the same ministry or involving the same bidders. Use this to find if fraud is part of a larger pattern.',
    input_schema: {
      type: 'object' as const,
      properties: {
        ministry_code: { type: 'string' as const, description: 'Ministry code to search e.g. MoH, MoRTH' },
        bidder_ids: { type: 'array' as const, items: { type: 'string' as const }, description: 'List of bidder IDs to search across all tenders' },
        date_range_months: { type: 'number' as const, description: 'How many months back to search. Default 12.' },
      },
      required: [] as string[],
    },
  },
  {
    name: 'get_bidder_profile',
    description: 'Get complete profile of a bidder including their bid history, fraud flags, GSTIN age, and connections to other companies.',
    input_schema: {
      type: 'object' as const,
      properties: {
        bidder_id: { type: 'string' as const, description: 'The bidder ID or company identifier' },
      },
      required: ['bidder_id'],
    },
  },
  {
    name: 'freeze_tender',
    description: 'Immediately freeze a tender to prevent fraudulent award. Use when fraud evidence is strong. This action is recorded on blockchain and cannot be undone without CAG approval.',
    input_schema: {
      type: 'object' as const,
      properties: {
        tender_id: { type: 'string' as const, description: 'The tender ID to freeze' },
        reason: { type: 'string' as const, description: 'Clear reason for freezing — recorded permanently' },
        confidence: { type: 'number' as const, description: 'Confidence score 0.0 to 1.0 that this is fraud' },
      },
      required: ['tender_id', 'reason', 'confidence'],
    },
  },
  {
    name: 'flag_bidder',
    description: 'Flag a bidder as a fraud suspect. This adds them to the watchlist and they will face enhanced scrutiny on future bids.',
    input_schema: {
      type: 'object' as const,
      properties: {
        bidder_id: { type: 'string' as const, description: 'The bidder ID' },
        flag_type: { type: 'string' as const, enum: ['SHELL_COMPANY', 'BID_RIGGING', 'CARTEL_MEMBER', 'REPEAT_OFFENDER'], description: 'Type of fraud flag' },
        evidence: { type: 'string' as const, description: 'Specific evidence for this flag' },
      },
      required: ['bidder_id', 'flag_type', 'evidence'],
    },
  },
  {
    name: 'send_fraud_alert',
    description: 'Send immediate WhatsApp alert to CAG auditor with fraud details. Use for CRITICAL findings that need immediate human attention.',
    input_schema: {
      type: 'object' as const,
      properties: {
        tender_ids: { type: 'array' as const, items: { type: 'string' as const }, description: 'All tender IDs involved in this fraud' },
        summary: { type: 'string' as const, description: 'Brief summary of fraud for WhatsApp message (max 200 chars)' },
        total_value_crore: { type: 'number' as const, description: 'Total value of tenders at risk in crores' },
        severity: { type: 'string' as const, enum: ['HIGH', 'CRITICAL'], description: 'Alert severity level' },
      },
      required: ['tender_ids', 'summary', 'severity'],
    },
  },
  {
    name: 'generate_evidence_report',
    description: 'Generate a complete formal evidence report for CAG investigation. Include all findings, blockchain proofs, and recommended actions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        tender_ids: { type: 'array' as const, items: { type: 'string' as const }, description: 'Tender IDs in this investigation' },
        flagged_bidder_ids: { type: 'array' as const, items: { type: 'string' as const }, description: 'Flagged bidder IDs' },
        fraud_types: { type: 'array' as const, items: { type: 'string' as const }, description: 'Types of fraud detected' },
        investigation_summary: { type: 'string' as const, description: 'Claude\'s complete investigation findings' },
      },
      required: ['tender_ids', 'investigation_summary'],
    },
  },
  {
    name: 'escalate_to_cag',
    description: 'Formally escalate to CAG investigation. This creates an official record, assigns a CAG case number, and notifies the appropriate audit team.',
    input_schema: {
      type: 'object' as const,
      properties: {
        tender_ids: { type: 'array' as const, items: { type: 'string' as const }, description: 'Tender IDs' },
        case_summary: { type: 'string' as const, description: 'Formal case summary in government language' },
        estimated_fraud_value_crore: { type: 'number' as const, description: 'Estimated fraud value in crores' },
        recommended_action: { type: 'string' as const, enum: ['INVESTIGATION', 'AUDIT', 'FIR', 'ADMINISTRATIVE_ACTION'], description: 'Recommended action' },
      },
      required: ['tender_ids', 'case_summary', 'recommended_action'],
    },
  },
  {
    name: 'record_on_blockchain',
    description: 'Record the complete investigation findings on blockchain as an immutable audit record. Call this as the final step after all actions are taken.',
    input_schema: {
      type: 'object' as const,
      properties: {
        investigation_id: { type: 'string' as const, description: 'Investigation ID' },
        actions_taken: { type: 'array' as const, items: { type: 'string' as const }, description: 'List of all actions Claude took during investigation' },
        final_verdict: { type: 'string' as const, description: 'Final investigation verdict' },
      },
      required: ['actions_taken', 'final_verdict'],
    },
  },
];
