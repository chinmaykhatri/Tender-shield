/**
 * ZKP Cryptography Tests
 * Tests SHA-256 commitments, range proofs, and Fiat-Shamir proofs.
 * Updated to match unified scheme (lib/zkp.ts → chaincode/zkp_utils.go)
 */

import { describe, it, expect } from 'vitest';

describe('ZKP: Pedersen Commitments', () => {
  it('creates valid commitment and verifies it', async () => {
    const { createPedersenCommitment, verifyPedersenCommitment } = await import('../lib/zkp');

    const amount = 11850000; // ₹118.5 Cr in paise
    const result = createPedersenCommitment(amount);

    expect(result.commitment).toMatch(/^0x/);
    expect(result.blinding_factor).toMatch(/^0x/);
    expect(result.amount_paise).toBe(amount);
    expect(result.scheme).toBe('sha256-commitment');

    // Verify with correct values
    const verification = verifyPedersenCommitment(
      result.commitment,
      result.amount_paise,
      result.blinding_factor
    );
    expect(verification.valid).toBe(true);
    expect(verification.scheme).toBe('sha256-commitment');
  });

  it('rejects tampered amount', async () => {
    const { createPedersenCommitment, verifyPedersenCommitment } = await import('../lib/zkp');

    const result = createPedersenCommitment(5000000);

    // Try to verify with wrong amount
    const tamperedVerification = verifyPedersenCommitment(
      result.commitment,
      5000001, // off by 1 paisa
      result.blinding_factor
    );
    expect(tamperedVerification.valid).toBe(false);
  });

  it('generates unique commitments for same amount', async () => {
    const { createPedersenCommitment } = await import('../lib/zkp');

    const c1 = createPedersenCommitment(1000000);
    const c2 = createPedersenCommitment(1000000);

    // Different blinding factors → different commitments (hiding property)
    expect(c1.commitment).not.toBe(c2.commitment);
  });
});

describe('ZKP: Range Proofs', () => {
  it('generates valid range proof for amount in range', async () => {
    const { generateRangeProof } = await import('../lib/zkp');

    const proof = generateRangeProof(5000000, 1000000, 10000000);
    expect(proof.valid).toBe(true);
    expect(proof.bit_commitments.length).toBeGreaterThan(0);
    expect(proof.range.min).toBe(1000000);
    expect(proof.range.max).toBe(10000000);
    expect(proof.scheme).toBe('sha256-range-check');
  });

  it('rejects amount below range', async () => {
    const { generateRangeProof } = await import('../lib/zkp');

    const proof = generateRangeProof(500, 1000, 10000);
    expect(proof.valid).toBe(false);
    expect(proof.bit_commitments).toHaveLength(0);
  });

  it('rejects amount above range', async () => {
    const { generateRangeProof } = await import('../lib/zkp');

    const proof = generateRangeProof(20000, 1000, 10000);
    expect(proof.valid).toBe(false);
  });
});

describe('ZKP: Schnorr Proof of Knowledge', () => {
  it('generates valid Schnorr proof structure', async () => {
    const { createPedersenCommitment, generateSchnorrProof } = await import('../lib/zkp');

    const commitment = createPedersenCommitment(7500000);
    const proof = generateSchnorrProof(commitment.commitment, commitment.blinding_factor);

    // Verify proof structure
    expect(proof.t).toMatch(/^0x/);
    expect(proof.s).toMatch(/^0x/);
    expect(proof.e).toMatch(/^0x/);
    expect(proof.scheme).toBe('sha256-fiat-shamir');

    // Verify non-trivial values (not all zeros)
    expect(BigInt(proof.t)).toBeGreaterThan(0n);
    expect(BigInt(proof.s)).toBeGreaterThan(0n);
    expect(BigInt(proof.e)).toBeGreaterThan(0n);
  });

  it('generates different proofs for same commitment (randomized)', async () => {
    const { createPedersenCommitment, generateSchnorrProof } = await import('../lib/zkp');

    const commitment = createPedersenCommitment(5000000);
    const proof1 = generateSchnorrProof(commitment.commitment, commitment.blinding_factor);
    const proof2 = generateSchnorrProof(commitment.commitment, commitment.blinding_factor);

    // Different random nonces → different proofs (zero-knowledge property)
    expect(proof1.t).not.toBe(proof2.t);
  });
});

describe('ZKP: Commitment Hash', () => {
  it('produces deterministic SHA-256 hash', async () => {
    const { commitmentHash } = await import('../lib/zkp');

    const hash1 = await commitmentHash('0xabcdef1234567890');
    const hash2 = await commitmentHash('0xabcdef1234567890');

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('different inputs produce different hashes', async () => {
    const { commitmentHash } = await import('../lib/zkp');

    const h1 = await commitmentHash('0x1111111111111111');
    const h2 = await commitmentHash('0x2222222222222222');

    expect(h1).not.toBe(h2);
  });
});
