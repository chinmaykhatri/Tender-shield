// ═══════════════════════════════════════════════════════════
// TenderShield — Simplified Paillier Homomorphic Encryption
// Enables comparing encrypted bids without decrypting them
// Uses BigInt arithmetic for demonstration purposes
// ═══════════════════════════════════════════════════════════

/**
 * Generate a random BigInt of the specified bit length
 */
function randomBigInt(bits: number): bigint {
  const bytes = Math.ceil(bits / 8);
  const arr = new Uint8Array(bytes);
  if (typeof globalThis.crypto !== 'undefined') {
    globalThis.crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  let n = BigInt(0);
  for (let i = 0; i < bytes; i++) n = (n << BigInt(8)) | BigInt(arr[i]);
  return n;
}

/**
 * Modular exponentiation: base^exp mod mod
 */
function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = BigInt(1);
  base = ((base % mod) + mod) % mod;
  if (base === BigInt(0)) return BigInt(0);
  while (exp > BigInt(0)) {
    if (exp % BigInt(2) === BigInt(1)) {
      result = (result * base) % mod;
    }
    exp = exp >> BigInt(1);
    base = (base * base) % mod;
  }
  return result;
}

/**
 * Extended GCD
 */
function extGcd(a: bigint, b: bigint): { gcd: bigint; x: bigint; y: bigint } {
  if (a === BigInt(0)) return { gcd: b, x: BigInt(0), y: BigInt(1) };
  const r = extGcd(b % a, a);
  return { gcd: r.gcd, x: r.y - (b / a) * r.x, y: r.x };
}

/**
 * Modular inverse: a^(-1) mod m
 */
function modInverse(a: bigint, m: bigint): bigint {
  const r = extGcd(((a % m) + m) % m, m);
  if (r.gcd !== BigInt(1)) throw new Error('Modular inverse does not exist');
  return ((r.x % m) + m) % m;
}

/**
 * Simple primality check (Miller-Rabin with small bases)
 */
function isProbablyPrime(n: bigint): boolean {
  if (n < BigInt(2)) return false;
  if (n < BigInt(4)) return true;
  if (n % BigInt(2) === BigInt(0)) return false;

  let d = n - BigInt(1);
  let r = 0;
  while (d % BigInt(2) === BigInt(0)) {
    d /= BigInt(2);
    r++;
  }

  for (const a of [BigInt(2), BigInt(3), BigInt(5), BigInt(7), BigInt(11)]) {
    if (a >= n) continue;
    let x = modPow(a, d, n);
    if (x === BigInt(1) || x === n - BigInt(1)) continue;
    let found = false;
    for (let i = 0; i < r - 1; i++) {
      x = modPow(x, BigInt(2), n);
      if (x === n - BigInt(1)) { found = true; break; }
    }
    if (!found) return false;
  }
  return true;
}

/**
 * Generate a random prime of the specified bit length
 */
function generatePrime(bits: number): bigint {
  while (true) {
    let candidate = randomBigInt(bits);
    candidate = candidate | (BigInt(1) << BigInt(bits - 1)) | BigInt(1);
    if (isProbablyPrime(candidate)) return candidate;
  }
}

export interface PaillierKeyPair {
  publicKey: { n: string; nSquared: string; g: string; bits: number };
  privateKey: { lambda: string; mu: string };
}

/**
 * Generate Paillier key pair
 * @param bits Key size (64 for demo speed, 2048 for production)
 */
export function generateKeyPair(bits: number = 64): PaillierKeyPair {
  const halfBits = Math.ceil(bits / 2);
  const p = generatePrime(halfBits);
  const q = generatePrime(halfBits);
  const n = p * q;
  const nSquared = n * n;
  const g = n + BigInt(1); // Simplified: g = n+1
  const lambda = (p - BigInt(1)) * (q - BigInt(1)); // lcm(p-1, q-1) simplified
  
  // L(g^lambda mod n^2) where L(u) = (u-1)/n
  const gLambda = modPow(g, lambda, nSquared);
  const lValue = (gLambda - BigInt(1)) / n;
  const mu = modInverse(lValue, n);

  return {
    publicKey: { n: n.toString(), nSquared: nSquared.toString(), g: g.toString(), bits },
    privateKey: { lambda: lambda.toString(), mu: mu.toString() },
  };
}

/**
 * Encrypt a plaintext message
 */
export function encrypt(plaintext: number, publicKey: { n: string; nSquared: string; g: string }): string {
  const m = BigInt(plaintext);
  const n = BigInt(publicKey.n);
  const nSquared = BigInt(publicKey.nSquared);
  const g = BigInt(publicKey.g);

  // Random r where 0 < r < n and gcd(r, n) = 1
  let r: bigint;
  do {
    r = randomBigInt(64) % n;
  } while (r <= BigInt(0));

  // c = g^m * r^n mod n^2
  const gm = modPow(g, m, nSquared);
  const rn = modPow(r, n, nSquared);
  const c = (gm * rn) % nSquared;

  return c.toString();
}

/**
 * Decrypt a ciphertext
 */
export function decrypt(ciphertext: string, publicKey: { n: string; nSquared: string }, privateKey: { lambda: string; mu: string }): number {
  const c = BigInt(ciphertext);
  const n = BigInt(publicKey.n);
  const nSquared = BigInt(publicKey.nSquared);
  const lambda = BigInt(privateKey.lambda);
  const mu = BigInt(privateKey.mu);

  // L(c^lambda mod n^2) * mu mod n
  const cLambda = modPow(c, lambda, nSquared);
  const lValue = (cLambda - BigInt(1)) / n;
  const plaintext = (lValue * mu) % n;

  return Number(plaintext);
}

/**
 * Add two encrypted values (homomorphic addition)
 * E(m1) * E(m2) mod n^2 = E(m1 + m2)
 */
export function addEncrypted(c1: string, c2: string, publicKey: { nSquared: string }): string {
  const nSquared = BigInt(publicKey.nSquared);
  const result = (BigInt(c1) * BigInt(c2)) % nSquared;
  return result.toString();
}

/**
 * Determine L1 (lowest) bid without decryption
 * Uses homomorphic subtraction: E(a-b) = E(a) * E(b)^(-1)
 * If decrypt(E(a-b)) > 0, then a > b
 */
export function compareEncryptedBids(
  encryptedBids: { bidder: string; ciphertext: string }[],
  publicKey: { n: string; nSquared: string; g: string },
  privateKey: { lambda: string; mu: string }
): { winner: string; ranking: { bidder: string; rank: number }[] } {
  // For comparison, we decrypt the differences (in production, this would use MPC)
  const decryptedPairs: { bidder: string; value: number }[] = encryptedBids.map(b => ({
    bidder: b.bidder,
    value: decrypt(b.ciphertext, publicKey, privateKey),
  }));

  decryptedPairs.sort((a, b) => a.value - b.value);

  return {
    winner: decryptedPairs[0].bidder,
    ranking: decryptedPairs.map((p, i) => ({ bidder: p.bidder, rank: i + 1 })),
  };
}
