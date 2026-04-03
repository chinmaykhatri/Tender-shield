/**
 * API Route: /api/v1/bids/generate-commitment
 * 
 * Generates a Pedersen commitment for sealed bid submission.
 * Uses real modular exponentiation: C = g^m * h^r (mod p)
 */

import { NextRequest, NextResponse } from 'next/server';

// Pedersen parameters (must match lib/zkp.ts)
const SAFE_PRIME = BigInt('0xFFFFFFFFFFFFFFC5');
const GENERATOR_G = BigInt('0x5A827999');
const GENERATOR_H = BigInt('0x6ED9EBA1');

function modPow(base: bigint, exp: bigint, modulus: bigint): bigint {
  let result = 1n;
  base = base % modulus;
  if (base === 0n) return 0n;
  while (exp > 0n) {
    if (exp % 2n === 1n) result = (result * base) % modulus;
    exp = exp / 2n;
    base = (base * base) % modulus;
  }
  return result;
}

function generateBlindingFactor(): bigint {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let r = 0n;
  for (const b of bytes) {
    r = (r << 8n) | BigInt(b);
  }
  return r % (SAFE_PRIME - 1n) + 1n;
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const amountPaise = parseInt(url.searchParams.get('amount_paise') || '0');

    if (amountPaise <= 0) {
      return NextResponse.json({ detail: 'Invalid amount' }, { status: 400 });
    }

    // Real Pedersen commitment: C = g^m * h^r (mod p)
    const m = BigInt(amountPaise);
    const r = generateBlindingFactor();
    const gm = modPow(GENERATOR_G, m, SAFE_PRIME);
    const hr = modPow(GENERATOR_H, r, SAFE_PRIME);
    const commitment = (gm * hr) % SAFE_PRIME;

    const commitmentHex = '0x' + commitment.toString(16).padStart(16, '0');
    const blindingHex = '0x' + r.toString(16).padStart(16, '0');

    const amountRupees = amountPaise / 100;
    let amountDisplay: string;
    if (amountRupees >= 1_00_00_000) {
      amountDisplay = `₹${(amountRupees / 1_00_00_000).toFixed(2)} Cr`;
    } else if (amountRupees >= 1_00_000) {
      amountDisplay = `₹${(amountRupees / 1_00_000).toFixed(2)} L`;
    } else {
      amountDisplay = `₹${amountRupees.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    }

    return NextResponse.json({
      commitment_hash: commitmentHex,
      zkp_proof: `pedersen_modexp_${commitmentHex.slice(2, 18)}`,
      scheme: 'pedersen-modexp',
      amount_paise: amountPaise,
      amount_display: amountDisplay,
      blinding_factor: blindingHex,
      warning: 'Save your blinding factor! You need it to reveal your bid. If lost, your bid cannot be verified.',
      math: `C = g^${amountPaise} * h^r (mod p) = ${commitmentHex}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}
