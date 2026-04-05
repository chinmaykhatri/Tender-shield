/**
 * TenderShield — Centralized Zod Validation Schemas
 * 
 * Every API route that accepts POST/PUT bodies MUST validate input
 * through these schemas before processing.
 * 
 * Usage:
 *   import { loginSchema } from '@/lib/validation/schemas';
 *   const parsed = loginSchema.safeParse(body);
 *   if (!parsed.success) return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
 */

import { z } from 'zod';

// ── Auth ──────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().max(255).optional().default(''),
  password: z.string().max(128).optional(),
  token: z.string().optional(),
  role: z.enum(['OFFICER', 'BIDDER', 'AUDITOR', 'NIC_ADMIN', 'CAG_AUDITOR', 'MINISTRY_OFFICER']).optional(),
});

// ── Bid Commitment ────────────────────────────────────────────────

export const bidCommitSchema = z.object({
  tender_id: z.string().min(1, 'tender_id required').max(64),
  bidder_did: z.string().max(128).optional().default(''),
  commitment_hash: z.string().regex(/^[0-9a-fA-F]{16,128}$/, 'Invalid commitment hash format'),
  zkp_proof: z.string().max(2048).optional().default(''),
});

// ── Procurement Lifecycle ─────────────────────────────────────────

const lifecycleActions = z.enum([
  'create', 'submit-bid', 'close-bidding', 'reveal', 'evaluate', 'award', 'reset',
]);

export const lifecycleCreateSchema = z.object({
  action: z.literal('create'),
  title: z.string().min(3, 'Title too short').max(256).optional(),
  ministry: z.string().min(2).max(32).optional(),
  estimatedValue: z.number().positive().max(100_000).optional(), // ₹ crore
  category: z.enum(['GOODS', 'WORKS', 'SERVICES', 'CONSULTANCY']).optional(),
});

export const lifecycleSubmitBidSchema = z.object({
  action: z.literal('submit-bid'),
  bidder: z.string().max(128).optional(),
  company: z.string().max(128).optional(),
  amount: z.union([z.string(), z.number()]).refine(
    (v) => !isNaN(Number(v)) && Number(v) > 0,
    'Amount must be a positive number'
  ),
});

export const lifecycleSimpleAction = z.object({
  action: lifecycleActions,
});

export const lifecycleSchema = z.discriminatedUnion('action', [
  lifecycleCreateSchema,
  lifecycleSubmitBidSchema,
  z.object({ action: z.literal('close-bidding') }),
  z.object({ action: z.literal('reveal') }),
  z.object({ action: z.literal('evaluate') }),
  z.object({ action: z.literal('award') }),
  z.object({ action: z.literal('reset') }),
]);

// ── Chaincode Invoke ──────────────────────────────────────────────

export const chaincodeInvokeSchema = z.object({
  function: z.string().min(1).max(64, 'Function name too long'),
  args: z.array(z.string().max(4096)).max(10, 'Too many arguments'),
  channel: z.string().max(64).optional(),
});

// ── Sealed Bid Commitment API ─────────────────────────────────────

export const commitActionSchema = z.object({
  action: z.literal('commit'),
  valueCrore: z.number().positive().max(100_000).optional(),
});

export const verifyActionSchema = z.object({
  action: z.literal('verify'),
  commitment: z.string().regex(/^[0-9a-fA-F]{64}$/, 'Invalid commitment (must be 64 hex chars)'),
  value: z.string().min(1),
  blindingFactor: z.string().min(1),
});

export const verifyProofActionSchema = z.object({
  action: z.literal('verify-proof'),
  commitment: z.string().optional(),
  proof: z.object({
    A: z.string(),
    challenge: z.string(),
    response_v: z.string(),
    response_r: z.string(),
  }),
});

export const zkpApiSchema = z.discriminatedUnion('action', [
  commitActionSchema,
  verifyActionSchema,
  verifyProofActionSchema,
]);

// ── Helper ────────────────────────────────────────────────────────

/**
 * Parse and validate request body. Returns 400 response on failure.
 */
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): 
  { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
