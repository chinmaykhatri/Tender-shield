/**
 * TenderShield — Cryptographic Bid Commitment Engine
 * ═══════════════════════════════════════════════════
 *
 * Scheme: SHA-256 Hash-Based Commitment
 *   C = SHA-256(amount_paise_decimal || separator || randomness_hex)
 *
 * MATCHES: chaincode/tendershield/zkp_utils.go — identical algorithm
 *
 * IMPORTANT — WHAT THIS IS AND IS NOT:
 *   This is a HASH-BASED COMMITMENT scheme, NOT a Pedersen Commitment.
 *   - Pedersen: C = g^v · h^r mod p (discrete log groups, info-theoretic hiding)
 *   - This:    C = SHA-256(v || r) (hash-based, computationally hiding)
 *   Both are valid cryptographic commitments, but they are different primitives.
 *   We use SHA-256 for cross-layer compatibility with Go chaincode.
 *
 * Security Properties:
 *   - Hiding: SHA-256 is a one-way function → given C, cannot recover amount
 *   - Binding: SHA-256 is collision-resistant → cannot find different amount with same C
 *   - Verifiable: given (amount, randomness) → recompute C and compare
 *
 * Protocol:
 *   Phase 1 (COMMIT): Bidder creates C = SHA-256(amount || "||" || randomness)
 *     → Only C is stored on blockchain. Nobody can see the bid amount.
 *   Phase 2 (REVEAL): After deadline, bidder reveals amount + randomness
 *     → Chaincode verifies: SHA-256(amount || "||" || randomness) === stored C
 *     → If match → bid is authentic. If mismatch → tampering detected.
 *
 * India Context:
 *   CVC Guidelines mandate sealed bids — this commitment scheme provides
 *   the digital equivalent. Even blockchain nodes cannot see bid amounts
 *   until the reveal phase.
 *
 * Cross-layer Compatibility:
 *   TypeScript (this file) and Go (chaincode/zkp_utils.go) produce
 *   identical outputs for the same inputs. Verified with test vectors.
 */

// ═══════════════════════════════════════════════
// Pure-JS SHA-256 (synchronous — works on HTTP localhost, no crypto.subtle needed)
// Standard FIPS 180-4 implementation
// ═══════════════════════════════════════════════

function sha256Sync(message: Uint8Array): Uint8Array {
  const K: number[] = [
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
  ];

  let h0=0x6a09e667,h1=0xbb67ae85,h2=0x3c6ef372,h3=0xa54ff53a;
  let h4=0x510e527f,h5=0x9b05688c,h6=0x1f83d9ab,h7=0x5be0cd19;

  const msgLen = message.length;
  const bitLen = msgLen * 8;
  const padLen = ((msgLen + 9 + 63) & ~63);
  const padded = new Uint8Array(padLen);
  padded.set(message);
  padded[msgLen] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padLen - 4, bitLen >>> 0, false);
  view.setUint32(padLen - 8, (bitLen / 0x100000000) >>> 0, false);

  for (let offset = 0; offset < padLen; offset += 64) {
    const w = new Int32Array(64);
    for (let i = 0; i < 16; i++) w[i] = view.getInt32(offset + i * 4, false);
    for (let i = 16; i < 64; i++) {
      const s0 = (((w[i-15]>>>7)|(w[i-15]<<25))^((w[i-15]>>>18)|(w[i-15]<<14))^(w[i-15]>>>3))|0;
      const s1 = (((w[i-2]>>>17)|(w[i-2]<<15))^((w[i-2]>>>19)|(w[i-2]<<13))^(w[i-2]>>>10))|0;
      w[i] = (w[i-16]+s0+w[i-7]+s1)|0;
    }
    let a=h0,b=h1,c=h2,d=h3,e=h4,f=h5,g=h6,h=h7;
    for (let i = 0; i < 64; i++) {
      const S1 = (((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)))|0;
      const ch = ((e&f)^(~e&g))|0;
      const t1 = (h+S1+ch+K[i]+w[i])|0;
      const S0 = (((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)))|0;
      const maj = ((a&b)^(a&c)^(b&c))|0;
      const t2 = (S0+maj)|0;
      h=g; g=f; f=e; e=(d+t1)|0; d=c; c=b; b=a; a=(t1+t2)|0;
    }
    h0=(h0+a)|0;h1=(h1+b)|0;h2=(h2+c)|0;h3=(h3+d)|0;
    h4=(h4+e)|0;h5=(h5+f)|0;h6=(h6+g)|0;h7=(h7+h)|0;
  }

  const out = new Uint8Array(32);
  const ov = new DataView(out.buffer);
  ov.setUint32(0,h0,false);ov.setUint32(4,h1,false);ov.setUint32(8,h2,false);ov.setUint32(12,h3,false);
  ov.setUint32(16,h4,false);ov.setUint32(20,h5,false);ov.setUint32(24,h6,false);ov.setUint32(28,h7,false);
  return out;
}

/** Convert string to UTF-8 bytes */
function stringToBytes(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/** Convert byte array to hex string */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/** SHA-256 hash of a string — synchronous, no crypto.subtle */
function sha256Hex(input: string): string {
  return bytesToHex(sha256Sync(stringToBytes(input)));
}

// ═══════════════════════════════════════════════
// Commitment Separator — must match chaincode/zkp_utils.go
// ═══════════════════════════════════════════════

const COMMITMENT_SEPARATOR = '||';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

/** SHA-256 Hash-Based Bid Commitment (not Pedersen — see module docs) */
export interface HashCommitment {
  C: string;          // SHA-256 commitment hash (hex)
  r: string;          // Randomness / blinding factor (hex)
  v: string;          // Amount in paise (decimal string)
  params: {
    scheme: string;
    hash: string;
    separator: string;
    security: string;
  };
}

/** @deprecated Use HashCommitment instead — this is not a real Pedersen commitment */
export type PedersenCommitment = HashCommitment;

/** Commitment proof structure (challenge-response, not a full zero-knowledge proof) */
export interface CommitmentProof {
  commitment: string;
  proof: {
    A: string;
    challenge: string;
    response_v: string;
    response_r: string;
  };
  verified: boolean;
  algorithm: string;
  security_level: string;
}

/** @deprecated Use CommitmentProof instead */
export type ZKProof = CommitmentProof;

// ═══════════════════════════════════════════════
// Core: Generate cryptographically random hex string
// ═══════════════════════════════════════════════

function generateRandomHex(bytes: number = 32): string {
  const arr = new Uint8Array(bytes);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.getRandomValues) {
    globalThis.crypto.getRandomValues(arr);
  } else {
    // Fallback for environments without Web Crypto — uses Node.js crypto
    const nodeCrypto = require('crypto');
    const buf = nodeCrypto.randomBytes(bytes);
    arr.set(new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength));
  }
  return bytesToHex(arr);
}

// ═══════════════════════════════════════════════
// Commitment: C = SHA-256(amountPaise + "||" + randomnessHex)
// MATCHES: chaincode/zkp_utils.go CreateCommitment()
// ═══════════════════════════════════════════════

/**
 * Create a bid commitment.
 * @param valueCrore - Bid amount in Crore (e.g., 118.5 for ₹118.5 Crore)
 * @returns Commitment with hash, randomness, and value
 */
export function createCommitment(valueCrore: number): HashCommitment {
  const amountPaise = Math.round(valueCrore * 1_000_000); // Convert to paise-like integer for precision
  const randomness = generateRandomHex(32); // 256-bit randomness

  // Pre-image: "{amountPaise}||{randomnessHex}"
  // This MUST match the Go chaincode: fmt.Sprintf("%d%s%s", amountPaise, "||", randomnessHex)
  const preImage = `${amountPaise}${COMMITMENT_SEPARATOR}${randomness}`;
  const commitmentHash = sha256Hex(preImage);

  return {
    C: commitmentHash,
    r: randomness,
    v: amountPaise.toString(),
    params: {
      scheme: 'sha256-commitment',
      hash: 'SHA-256 (FIPS 180-4)',
      separator: COMMITMENT_SEPARATOR,
      security: '256-bit pre-image + 256-bit randomness',
    },
  };
}

/**
 * Verify a commitment reveal.
 * @param commitmentHex - The stored commitment hash
 * @param valueHex - The revealed amount (as decimal string or hex)
 * @param blindingHex - The revealed randomness
 * @returns true if commitment matches
 */
export function verifyCommitment(commitmentHex: string, valueHex: string, blindingHex: string): boolean {
  // valueHex is actually a decimal string of paise (same as Go's amountPaise.String())
  const preImage = `${valueHex}${COMMITMENT_SEPARATOR}${blindingHex}`;
  const recomputed = sha256Hex(preImage);

  // Constant-time comparison
  if (commitmentHex.length !== recomputed.length) return false;
  let result = 0;
  for (let i = 0; i < commitmentHex.length; i++) {
    result |= commitmentHex.charCodeAt(i) ^ recomputed.charCodeAt(i);
  }
  return result === 0;
}

// ═══════════════════════════════════════════════
// Commitment Proof (Challenge-Response)
// ═══════════════════════════════════════════════
// TECHNICAL HONESTY NOTE:
// This is NOT a zero-knowledge proof in the formal cryptographic sense.
// A ZKP proves knowledge of a secret without revealing any information about it.
// What we have is a Fiat-Shamir challenge-response that:
//   1. Verifies the challenge derivation is correct
//   2. Validates commitment format
// The actual proof-of-knowledge happens during the REVEAL phase, when
// the bidder opens (amount, randomness) and the verifier recomputes C.
// This is a standard commit-reveal protocol, which IS the security
// property we need for sealed bid auctions.
// ═══════════════════════════════════════════════

/**
 * Generate a commitment proof (challenge-response binding).
 * This binds a challenge to the commitment to prevent replay attacks.
 * Full knowledge proof happens at REVEAL time via verifyCommitment().
 */
export function generateCommitmentProof(commitment: HashCommitment): CommitmentProof {
  const amount = commitment.v;
  const randomness = commitment.r;
  const C = commitment.C;

  // Step 1: Generate random nonce
  const k = generateRandomHex(32);

  // Step 2: Create auxiliary commitment A = SHA256(nonce)
  const A = sha256Hex(k);

  // Step 3: Fiat-Shamir challenge = SHA256(C || A)
  const challenge = sha256Hex(`${C}${A}`);

  // Step 4: Response = SHA256(challenge || amount || randomness)
  const response_v = sha256Hex(`${challenge}${amount}`);
  const response_r = sha256Hex(`${challenge}${randomness}`);

  // Self-verify: recompute commitment from values
  const preImage = `${amount}${COMMITMENT_SEPARATOR}${randomness}`;
  const recomputed = sha256Hex(preImage);
  const verified = C === recomputed;

  return {
    commitment: C,
    proof: {
      A,
      challenge,
      response_v,
      response_r,
    },
    verified,
    algorithm: 'SHA-256 Commitment with Fiat-Shamir Challenge',
    security_level: '256-bit (SHA-256, matches chaincode/zkp_utils.go)',
  };
}

/** @deprecated Use generateCommitmentProof — renamed for accuracy */
export const generateZKProof = generateCommitmentProof;

/**
 * Verify a commitment proof without knowing amount or randomness.
 * HONEST: This verifies challenge derivation and format only.
 * Full verification requires the REVEAL phase (verifyCommitment with opened values).
 */
export function verifyCommitmentProof(
  commitmentHex: string,
  proof: { A: string; challenge: string; response_v: string; response_r: string }
): { valid: boolean; steps: string[] } {
  const steps: string[] = [];

  // Step 1: Verify Fiat-Shamir challenge derivation
  const expectedChallenge = sha256Hex(`${commitmentHex}${proof.A}`);
  steps.push(`Fiat-Shamir: e = SHA256(C || A) = ${expectedChallenge.slice(0, 16)}...`);

  if (proof.challenge !== expectedChallenge) {
    steps.push('❌ Challenge mismatch — proof rejected');
    return { valid: false, steps };
  }
  steps.push('✅ Challenge correctly derived (Fiat-Shamir)');

  // Step 2: Verify commitment format (64 hex chars = 256-bit hash)
  if (!/^[0-9a-f]{64}$/i.test(commitmentHex)) {
    steps.push('❌ Invalid commitment format');
    return { valid: false, steps };
  }
  steps.push('✅ Commitment format valid (256-bit SHA-256)');

  // Step 3: Verify response format
  if (!/^[0-9a-f]{64}$/i.test(proof.response_v) || !/^[0-9a-f]{64}$/i.test(proof.response_r)) {
    steps.push('❌ Invalid response format');
    return { valid: false, steps };
  }
  steps.push('✅ Response format valid');
  steps.push('✅ Commitment proof VALID — challenge-response verified');
  steps.push('ℹ️  Full knowledge proof completes at REVEAL phase (bidder opens amount + randomness)');

  return { valid: true, steps };
}

/** @deprecated Use verifyCommitmentProof — renamed for accuracy */
export const verifyZKProof = verifyCommitmentProof;

// ═══════════════════════════════════════════════
// Consumer APIs — Honest Naming
// Used by dataLayer.ts, tests, and the bid commitment demo page
// ═══════════════════════════════════════════════

/** Create a SHA-256 bid commitment */
export function createBidCommitment(amountPaise: number) {
  // amountPaise might be actual paise or crore — handle both
  const valueCrore = amountPaise >= 100000 ? amountPaise / 1_000_000 : amountPaise;
  const result = createCommitment(valueCrore);
  return {
    commitment: '0x' + result.C,
    blinding_factor: '0x' + result.r,
    amount_paise: amountPaise,
    scheme: 'sha256-commitment' as const,
    params: result.params,
    _C: result.C,
    _r: result.r,
    _v: result.v,
  };
}

/** @deprecated Use createBidCommitment — "Pedersen" name was inaccurate */
export const createPedersenCommitment = createBidCommitment;

/** Verify a SHA-256 bid commitment reveal */
export function verifyBidCommitment(
  commitmentHex: string,
  amountPaise: number,
  blindingHex: string
): { valid: boolean; scheme: string } {
  const c = commitmentHex.startsWith('0x') ? commitmentHex.slice(2) : commitmentHex;
  const r = blindingHex.startsWith('0x') ? blindingHex.slice(2) : blindingHex;
  // Convert to the decimal string that matches Go's fmt.Sprintf("%d", amountPaise)
  const paiseValue = amountPaise >= 100000 ? amountPaise : Math.round(amountPaise * 1_000_000);
  const vDecimal = paiseValue.toString();
  return {
    valid: verifyCommitment(c, vDecimal, r),
    scheme: 'sha256-commitment',
  };
}

/** @deprecated Use verifyBidCommitment — "Pedersen" name was inaccurate */
export const verifyPedersenCommitment = verifyBidCommitment;

/** Generate a Schnorr-like proof — compatibility alias */
export function generateSchnorrProof(commitmentHex: string, blindingHex: string) {
  const c = commitmentHex.startsWith('0x') ? commitmentHex.slice(2) : commitmentHex;
  const r = blindingHex.startsWith('0x') ? blindingHex.slice(2) : blindingHex;
  const k = generateRandomHex(32);
  const R_val = sha256Hex(k);
  const e = sha256Hex(`${c}${R_val}`);
  const s = sha256Hex(`${e}${r}`);
  return {
    t: '0x' + R_val,
    s: '0x' + s,
    e: '0x' + e,
    scheme: 'sha256-fiat-shamir' as const,
  };
}

/**
 * Range check — simplified bit-decomposition commitment.
 *
 * DISCLAIMER: This is NOT a formal Bulletproofs or Groth16 range proof.
 * It uses SHA-256 commitments on individual bits of the shifted amount
 * to demonstrate the concept. A production implementation would use
 * a cryptographic library like @noble/curves for proper Pedersen-based
 * range proofs with zero-knowledge guarantees.
 *
 * What this does: decomposes (amount - min) into bits, commits each bit,
 * and verifies amount ∈ [min, max] via application-layer checks.
 */
export function generateRangeProof(amount: number, min: number, max: number) {
  if (amount < min || amount > max) {
    return { valid: false, bit_commitments: [], range: { min, max }, scheme: 'sha256-range-check' as const };
  }
  const shifted = amount - min;
  const bits = shifted.toString(2).split('').map(Number);
  const bit_commitments = bits.map((bit, i) => {
    const r = generateRandomHex(16);
    const C = sha256Hex(`${bit}${COMMITMENT_SEPARATOR}${r}`);
    return { bit_index: i, commitment: '0x' + C.slice(0, 16) };
  });
  return { valid: true, bit_commitments, range: { min, max }, scheme: 'sha256-range-check' as const };
}

/** SHA-256 hash of a commitment string */
export async function commitmentHash(input: string): Promise<string> {
  const clean = input.startsWith('0x') ? input.slice(2) : input;
  return '0x' + sha256Hex(clean);
}

// modPow removed — was dead code from an earlier Pedersen prototype.
// If real group-based Pedersen is needed in the future, use @noble/curves.
