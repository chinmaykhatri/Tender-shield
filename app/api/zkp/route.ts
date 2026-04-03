/**
 * TenderShield — Unified ZKP API
 * POST /api/zkp — Generate SHA-256 commitment + Fiat-Shamir proof
 * Uses the same scheme as chaincode/tendershield/zkp_utils.go
 * Cross-layer compatible: browser commitment can be verified on-chain
 */
import { NextRequest, NextResponse } from 'next/server';
import { createCommitment, verifyCommitment, generateZKProof, verifyZKProof } from '@/lib/zkp';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, valueCrore, commitment: commitmentHex, value, blindingFactor, proof } = body;

    if (action === 'commit') {
      // Generate SHA-256 commitment: C = SHA256(amount || "||" || randomness)
      const commitment = createCommitment(valueCrore || 120);
      
      // Generate ZK proof
      const zkProof = generateZKProof(commitment);

      return NextResponse.json({
        success: true,
        algorithm: 'SHA-256 Commitment (matches chaincode)',
        commitment: {
          C: commitment.C,
          formula: 'C = SHA256(amount_paise || "||" || randomness)',
          params: commitment.params,
        },
        proof: zkProof.proof,
        verified: zkProof.verified,
        security: '256-bit (SHA-256 FIPS 180-4, matches chaincode/zkp_utils.go)',
        // Keep secrets for reveal phase (in production, stored client-side only)
        _secrets: {
          v: commitment.v,
          r: commitment.r,
          warning: 'These values must be kept secret until bid reveal phase',
        },
      });
    }

    if (action === 'verify') {
      // Verify commitment: recompute SHA256 and compare
      const isValid = verifyCommitment(commitmentHex, value, blindingFactor);

      return NextResponse.json({
        success: true,
        valid: isValid,
        formula: `g^${value?.slice(0, 8)}... · h^${blindingFactor?.slice(0, 8)}... mod p`,
        message: isValid
          ? 'Commitment VALID — bid amount matches the original sealed commitment'
          : 'Commitment INVALID — bid amount does NOT match',
      });
    }

    if (action === 'verify-proof') {
      // Verify zero-knowledge proof without knowing v or r
      const result = verifyZKProof(commitmentHex, proof);

      return NextResponse.json({
        success: true,
        valid: result.valid,
        steps: result.steps,
        message: result.valid
          ? 'ZK Proof VALID — prover knows (v, r) without revealing them'
          : 'ZK Proof INVALID — prover does not know the opening',
      });
    }

    return NextResponse.json({ error: 'Invalid action. Use: commit, verify, verify-proof' }, { status: 400 });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : String(error)) }, { status: 500 });
  }
}
