# TenderShield Security Model

## Threat Model

### Assets
- **Bid amounts**: Sealed via SHA-256 hash commitment until deadline
- **User credentials**: Supabase Auth (Aadhaar-verified for officers)
- **AI risk scores**: HMAC-signed to prevent tampering
- **Audit trail**: Append-only on Hyperledger Fabric (when deployed)

### Trust Boundaries
1. **Browser → API**: All API calls authenticated via Supabase JWT
2. **API → Supabase**: Service role key (server-only, never exposed to client)
3. **API → AI Engine**: Internal network only (port 8001)
4. **Frontend → Blockchain**: Read-only via API, write via authenticated API calls

### Security Controls
| Control | Implementation | Status |
|---------|---------------|--------|
| Authentication | Supabase Auth + JWT | ✅ Active |
| Authorization | Role-based (Officer, Bidder, Auditor, Admin) | ✅ Active |
| CSP Headers | script-src without unsafe-eval | ✅ Hardened |
| HSTS | max-age=31536000; includeSubDomains; preload | ✅ Active |
| Bid Confidentiality | SHA-256 hash commitment (commit-reveal) | ✅ Active |
| Data Integrity | HMAC-SHA256 checksums on AI scores | ✅ Active |
| Input Sanitization | DOMPurify + server-side validation | ✅ Active |
| Rate Limiting | Middleware-based per-IP limiting | ✅ Active |

### Known Limitations (Honest)
1. **CSP**: `unsafe-inline` required for Next.js 14 style injection — cannot fully remove without breaking SSR
2. **Blockchain**: Hyperledger Fabric network configured but not always running in demo — uses SHA-256 simulation with identical data structures
3. **ML Model**: Trained on synthetic + CAG-anchored data — no access to live procurement fraud labels
4. **Demo Mode**: Bypasses Aadhaar OTP and GSTIN verification for non-production demos

## Reporting Vulnerabilities
Contact: [team email] or open a GitHub issue with `[SECURITY]` prefix.
