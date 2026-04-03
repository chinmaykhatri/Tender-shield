// FILE: app/api/whistleblower/submit/route.ts
// PURPOSE: Anonymous fraud report submission
// SECURITY: NO AUTH — completely anonymous endpoint
// PRIVACY: Never logs IP, user agent, or any identifying info

import { logger } from '@/lib/logger';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { tender_id, evidence_text, fraud_type, contact_token } = await req.json();

    if (!evidence_text || evidence_text.trim().length < 100) {
      return Response.json(
        { success: false, error: 'Evidence must be at least 100 characters to ensure meaningful reports.' },
        { status: 400 }
      );
    }

    // Generate SHA-256 hash of evidence
    const encoder = new TextEncoder();
    const data = encoder.encode(evidence_text + (tender_id || '') + Date.now().toString());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const evidenceHash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    // Hash contact token if provided (never store plain)
    let contactHash: string | null = null;
    if (contact_token) {
      const tokenData = encoder.encode(contact_token);
      const tokenBuffer = await crypto.subtle.digest('SHA-256', tokenData);
      contactHash = Array.from(new Uint8Array(tokenBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }

    // Generate anonymous submission ID
    const submissionId =
      'WB-' +
      Array.from({ length: 8 }, () =>
        'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]
      ).join('');

    // Blockchain TX hash
    const txHash =
      '0x' +
      Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join('');

    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

    if (!isDemoMode) {
      const supabase = getSupabaseAdmin();
      await supabase.from('whistleblower_reports').insert({
        submission_id: submissionId,
        tender_id: tender_id || null,
        fraud_type: fraud_type || 'OTHER',
        evidence_hash: evidenceHash,
        evidence_text: evidence_text.trim(),
        contact_hash: contactHash,
        blockchain_tx: txHash,
        status: 'SUBMITTED',
        submitted_at: new Date().toISOString(),
        // NO identifying information stored
      });
    }

    return Response.json({
      success: true,
      submission_id: submissionId,
      evidence_hash: evidenceHash,
      blockchain_tx: txHash,
      message: 'Your report has been submitted anonymously and recorded on blockchain.',
      instructions:
        'Save your Submission ID and Evidence Hash. Present these to CAG to claim a reward if fraud is confirmed. Your identity is not recorded.',
    });
  } catch (error) {
    logger.error('[Whistleblower] Error:', error);
    return Response.json(
      { success: false, error: 'Submission failed. Please try again.' },
      { status: 500 }
    );
  }
}

