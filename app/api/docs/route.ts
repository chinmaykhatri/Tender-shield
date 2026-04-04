/**
 * TenderShield — API Documentation (OpenAPI / Swagger-like)
 * 
 * GET /api/docs — Returns a structured overview of all API endpoints.
 * Useful for judges reviewing the API surface.
 */

import { NextResponse } from 'next/server';

export async function GET() {
  const apiDocs = {
    name: 'TenderShield API',
    version: '1.0.0',
    description: 'AI-Secured Government Procurement Platform — API Reference',
    base_url: '/api',
    security: {
      type: 'Bearer Token',
      description: 'All protected endpoints require Authorization: Bearer <token> header',
      rate_limiting: 'Enabled per-IP on all endpoints (100/min general, 10/min AI, 5/min auth)',
      csrf: 'Origin/Referer validation on state-changing endpoints',
      bot_protection: 'User-Agent required, known bot patterns blocked',
    },
    endpoints: {
      authentication: [
        { method: 'POST', path: '/api/v1/auth/login', auth: false, description: 'Login with email/password', rate_limit: '5 req/15min per IP+email' },
        { method: 'POST', path: '/api/v1/auth/register', auth: false, description: 'Register new user account' },
        { method: 'GET', path: '/api/v1/auth/me', auth: true, description: 'Get current user profile' },
        { method: 'POST', path: '/api/auth/validate', auth: false, description: 'Validate session token (demo/JWT)' },
        { method: 'GET', path: '/api/v1/auth/demo-users', auth: false, description: 'List demo account emails' },
      ],
      tenders: [
        { method: 'GET', path: '/api/v1/tenders', auth: true, description: 'List all tenders with filters' },
        { method: 'GET', path: '/api/v1/tenders/:id', auth: true, description: 'Get tender by ID' },
        { method: 'POST', path: '/api/v1/tenders', auth: true, description: 'Create new tender (OFFICER role)', roles: ['OFFICER'] },
      ],
      bids: [
        { method: 'POST', path: '/api/v1/bids/commit', auth: true, description: 'Commit sealed bid (SHA-256 commitment)' },
        { method: 'POST', path: '/api/v1/bids/generate-commitment', auth: true, description: 'Generate SHA-256 bid commitment (client-side)' },
        { method: 'GET', path: '/api/v1/bids/tender/:tenderId', auth: true, description: 'Get bids for tender' },
      ],
      ai: [
        { method: 'POST', path: '/api/ai/analyze', auth: true, description: 'AI fraud analysis (Claude)', rate_limit: '10 req/min', validation: 'Zod schema' },
        { method: 'POST', path: '/api/ai/predict-fraud', auth: true, description: 'Fraud prediction model' },
        { method: 'POST', path: '/api/ai/predict-price', auth: true, description: 'Price anomaly detection' },
        { method: 'POST', path: '/api/ai/predict-cartel', auth: true, description: 'Cartel pattern detection' },
        { method: 'POST', path: '/api/ai/scan-document', auth: true, description: 'Document verification AI' },
        { method: 'POST', path: '/api/ai/query', auth: true, description: 'Natural language query' },
        { method: 'POST', path: '/api/ai/generate-report', auth: true, description: 'Generate analysis report' },
        { method: 'GET', path: '/api/ai/judge-simulator', auth: true, description: 'Judge readiness score' },
      ],
      blockchain: [
        { method: 'GET', path: '/api/blockchain/blocks', auth: true, description: 'List recent blocks' },
        { method: 'POST', path: '/api/blockchain/submit', auth: true, description: 'Submit audit event to chain' },
      ],
      enforcement: [
        { method: 'POST', path: '/api/enforcement/auto-lock', auth: true, description: 'AI-triggered tender freeze', roles: ['AI_SYSTEM'] },
        { method: 'POST', path: '/api/enforcement/approve-unlock', auth: true, description: 'Admin unlock frozen tender', roles: ['NIC_ADMIN'] },
      ],
      monitoring: [
        { method: 'GET', path: '/api/health', auth: false, description: 'System health (Supabase, backend, AI)' },
        { method: 'GET', path: '/api/mode/status', auth: false, description: 'Demo/production mode status' },
        { method: 'GET', path: '/api/docs', auth: false, description: 'This API documentation' },
      ],
      trust_reputation: [
        { method: 'GET', path: '/api/trust/:company_id', auth: true, description: 'Company trust score' },
        { method: 'GET', path: '/api/reputation/:bidder_id', auth: true, description: 'Bidder reputation profile' },
        { method: 'GET', path: '/api/officers/:officer_id/metrics', auth: true, description: 'Officer performance metrics' },
      ],
      public: [
        { method: 'GET', path: '/api/public/tenders', auth: false, description: 'Public tender transparency portal' },
        { method: 'POST', path: '/api/rti/generate', auth: false, description: 'RTI report generation' },
      ],
    },
    data_models: {
      Tender: ['id', 'title', 'ministry_code', 'estimated_value_crore', 'risk_level', 'status', 'blockchain_tx', 'block_number'],
      Bid: ['id', 'tender_id', 'company', 'amount_crore', 'zkp_commitment', 'submitted_at'],
      AIAlert: ['id', 'tender_id', 'risk_score', 'risk_level', 'flags', 'summary'],
      AuditEvent: ['id', 'action', 'actor', 'tender_id', 'blockchain_tx', 'block', 'timestamp'],
    },
  };

  return NextResponse.json(apiDocs, {
    headers: { 'Content-Type': 'application/json' },
  });
}
