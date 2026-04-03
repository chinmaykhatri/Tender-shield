/**
 * Security Tests — Authentication, Rate Limiting, IDOR, Sessions
 * 
 * Run: npx vitest run __tests__/security.test.ts
 */

import { describe, it, expect } from 'vitest';

describe('Security: Authentication Utilities', () => {
  it('generates session tokens with correct expiry', async () => {
    const { generateSessionToken, isSessionExpired } = await import('../lib/auth/authUtils');
    
    const session = generateSessionToken(60_000); // 1 min TTL
    expect(session.token).toMatch(/^ts_/);
    expect(session.expiresAt).toBeGreaterThan(Date.now());
    expect(session.createdAt).toBeLessThanOrEqual(Date.now());
    
    // Not expired yet
    expect(isSessionExpired(session.expiresAt)).toBe(false);
    
    // Expired session
    expect(isSessionExpired(Date.now() - 1000)).toBe(true);
  });

  it('verifies demo passwords with constant-time comparison', async () => {
    const { verifyDemoPassword } = await import('../lib/auth/authUtils');
    
    // Correct password
    expect(verifyDemoPassword('officer@morth.gov.in', 'Tender@2025')).toBe(true);
    
    // Wrong password
    expect(verifyDemoPassword('officer@morth.gov.in', 'WrongPassword')).toBe(false);
    
    // Unknown email
    expect(verifyDemoPassword('unknown@email.com', 'Tender@2025')).toBe(false);
    
    // Empty inputs
    expect(verifyDemoPassword('', '')).toBe(false);
  });

  it('generates unique reset tokens with expiry', async () => {
    const { generateResetToken, isResetTokenValid } = await import('../lib/auth/authUtils');
    
    const token = generateResetToken('test@example.com');
    expect(token.token).toMatch(/^rst_/);
    expect(token.email).toBe('test@example.com');
    expect(isResetTokenValid(token)).toBe(true);
    
    // Expired token
    const expired = { ...token, expiresAt: Date.now() - 1000 };
    expect(isResetTokenValid(expired)).toBe(false);
  });
});

describe('Security: IDOR Prevention', () => {
  it('allows resource owner access', async () => {
    const { assertOwnership } = await import('../lib/auth/apiAuth');
    
    const result = assertOwnership('user-123', 'user-123');
    expect(result.allowed).toBe(true);
  });

  it('blocks non-owner access', async () => {
    const { assertOwnership } = await import('../lib/auth/apiAuth');
    
    const result = assertOwnership('user-123', 'user-456');
    expect(result.allowed).toBe(false);
    expect(result.error).toContain('do not own');
  });

  it('allows admin role override', async () => {
    const { assertOwnership } = await import('../lib/auth/apiAuth');
    
    const result = assertOwnership('admin-1', 'user-456', {
      allowRoles: ['NIC_ADMIN', 'CAG_AUDITOR'],
      userRole: 'NIC_ADMIN',
    });
    expect(result.allowed).toBe(true);
  });

  it('blocks non-admin role override', async () => {
    const { assertOwnership } = await import('../lib/auth/apiAuth');
    
    const result = assertOwnership('bidder-1', 'user-456', {
      allowRoles: ['NIC_ADMIN'],
      userRole: 'BIDDER',
    });
    expect(result.allowed).toBe(false);
  });
});

describe('Security: CSRF & Origin Validation', () => {
  it('validates same-origin requests', async () => {
    const { validateOrigin } = await import('../lib/security/securityLogger');
    
    // No origin header = same origin
    const req = new Request('http://localhost:3000/api/test');
    const result = validateOrigin(req);
    expect(result.valid).toBe(true);
  });

  it('rejects cross-origin requests', async () => {
    const { validateOrigin } = await import('../lib/security/securityLogger');
    
    const req = new Request('http://localhost:3000/api/test', {
      headers: { origin: 'https://evil-site.com' },
    });
    const result = validateOrigin(req);
    expect(result.valid).toBe(false);
  });
});

describe('Security: Environment Validation', () => {
  it('detects missing required env vars', async () => {
    const { validateEnvironment } = await import('../lib/env');
    const result = validateEnvironment();
    
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('missing');
    expect(result.missing).toBeInstanceOf(Array);
  });
});
