/**
 * ════════════════════════════════════════════════════════════════
 * TenderShield — CIDv1-Compatible Content Hash Utility
 * ════════════════════════════════════════════════════════════════
 *
 * PURPOSE:
 *   Compute deterministic, content-addressed hashes for tender
 *   documents, bid submissions, and audit payloads. These hashes
 *   serve as tamper-evident fingerprints stored in the audit chain.
 *
 * HOW IT WORKS:
 *   1. Content is normalized (trimmed, UTF-8 encoded).
 *   2. SHA-256 digest is computed via Node's crypto module.
 *   3. The digest is encoded as a CIDv1-style identifier using
 *      the multicodec raw prefix (0x55) and multihash SHA-256
 *      prefix (0x12, 0x20) with base32-lower encoding.
 *
 *   This produces identifiers structurally compatible with IPFS
 *   CIDv1 (raw codec, sha2-256), but does NOT require an IPFS
 *   node. If an IPFS gateway is later deployed, these same CIDs
 *   can be used for content retrieval.
 *
 * ARCHITECTURE FIT:
 *   - Used by the tender creation flow to hash specifications.
 *   - Used by the IPFS pinning module (lib/ipfs.ts) as a fallback.
 *   - Used by the audit chain writer to store document fingerprints.
 *   - Imported by API routes; never imported from client code.
 *
 * REFERENCES:
 *   - CIDv1 spec: https://github.com/multiformats/cid
 *   - Multicodec raw: 0x55
 *   - Multihash SHA-256: 0x12, length 0x20 (32 bytes)
 *   - Base32-lower (RFC 4648): used for human-readable encoding
 * ════════════════════════════════════════════════════════════════
 */

import { createHash } from 'crypto';

// ─── Constants ──────────────────────────────────────────────

/** CIDv1 version byte */
const CID_VERSION = 0x01;
/** Multicodec: raw binary (0x55) */
const CODEC_RAW = 0x55;
/** Multihash: SHA-256 function code */
const HASH_SHA256 = 0x12;
/** SHA-256 digest length in bytes */
const HASH_LENGTH = 0x20; // 32

// ─── Base32 Encoder (RFC 4648, lowercase, no padding) ───────

const BASE32_ALPHABET = 'abcdefghijklmnopqrstuvwxyz234567';

function encodeBase32Lower(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = '';

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

// ─── Types ──────────────────────────────────────────────────

export interface ContentHashResult {
  /** CIDv1-compatible content identifier (base32-lower, "b" prefix). */
  cid: string;
  /** Raw SHA-256 hex digest of the content. */
  sha256: string;
  /** Size of the input in bytes (UTF-8). */
  sizeBytes: number;
  /** ISO 8601 timestamp of hash computation. */
  computedAt: string;
}

export interface IntegrityCheckResult {
  /** Whether the content matches the expected CID / SHA-256. */
  valid: boolean;
  /** The computed CID for comparison. */
  computedCid: string;
  /** The expected CID that was checked against. */
  expectedCid: string;
}

// ─── Core Functions ─────────────────────────────────────────

/**
 * Compute a SHA-256 digest of the given content.
 *
 * @param content - The string or Buffer to hash.
 * @returns Lowercase hex SHA-256 digest (64 chars).
 */
export function sha256Hex(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Compute a CIDv1-compatible content hash.
 *
 * The resulting CID uses:
 *   - CIDv1 (version byte 0x01)
 *   - Raw binary codec (0x55)
 *   - SHA-256 multihash (0x12, 0x20, <32-byte digest>)
 *   - Base32-lower encoding with "b" multibase prefix
 *
 * This is byte-for-byte compatible with `ipfs add --cid-version=1
 * --raw-leaves` for small, single-block files.
 *
 * @param content - The string or Buffer to hash.
 * @returns ContentHashResult with CID, sha256, and metadata.
 */
export function computeContentHash(content: string | Buffer): ContentHashResult {
  const buf = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
  const digest = createHash('sha256').update(buf).digest();

  // Build the CIDv1 binary representation:
  // [version=0x01] [codec=0x55] [hash-fn=0x12] [hash-len=0x20] [32-byte digest]
  const cidBytes = Buffer.alloc(2 + 2 + HASH_LENGTH);
  cidBytes[0] = CID_VERSION;
  cidBytes[1] = CODEC_RAW;
  cidBytes[2] = HASH_SHA256;
  cidBytes[3] = HASH_LENGTH;
  digest.copy(cidBytes, 4);

  // Multibase: "b" prefix = base32-lower
  const cid = 'b' + encodeBase32Lower(cidBytes);

  return {
    cid,
    sha256: digest.toString('hex'),
    sizeBytes: buf.length,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Verify that a piece of content matches an expected CID or SHA-256 hash.
 *
 * Accepts either:
 *   - A CIDv1 string (starts with "b")
 *   - A SHA-256 hex string (64 chars)
 *   - A legacy "bafkrei…" string from the old IPFS module
 *
 * @param content  - The content to verify.
 * @param expected - The expected hash / CID to compare against.
 * @returns IntegrityCheckResult indicating whether content is valid.
 */
export function verifyContentIntegrity(
  content: string | Buffer,
  expected: string
): IntegrityCheckResult {
  const result = computeContentHash(content);

  // Case 1: CIDv1 match
  if (expected.startsWith('b') && expected.length > 40) {
    return {
      valid: result.cid === expected,
      computedCid: result.cid,
      expectedCid: expected,
    };
  }

  // Case 2: Raw SHA-256 hex match (64-char hex string)
  if (/^[a-f0-9]{64}$/.test(expected)) {
    return {
      valid: result.sha256 === expected,
      computedCid: result.cid,
      expectedCid: expected,
    };
  }

  // Case 3: Legacy "bafkrei" CID from lib/ipfs.ts
  if (expected.startsWith('bafkrei')) {
    const legacyHash = expected.slice(7); // strip "bafkrei"
    const match = result.sha256.startsWith(legacyHash);
    return {
      valid: match,
      computedCid: result.cid,
      expectedCid: expected,
    };
  }

  // Unknown format — cannot verify
  return {
    valid: false,
    computedCid: result.cid,
    expectedCid: expected,
  };
}

/**
 * Generate a document fingerprint string suitable for storage
 * in the audit_events table or blockchain record.
 *
 * Format: "cidv1:<cid>|sha256:<hex>|size:<bytes>"
 */
export function documentFingerprint(content: string | Buffer): string {
  const h = computeContentHash(content);
  return `cidv1:${h.cid}|sha256:${h.sha256}|size:${h.sizeBytes}`;
}
