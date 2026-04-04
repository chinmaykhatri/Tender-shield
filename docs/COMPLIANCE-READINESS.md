# Compliance Readiness — TenderShield

## STQC Certification (Software Testing & Quality Certification)

### What It Is
STQC is mandatory for government software deployment in India. It certifies software quality, security, and performance under MeitY guidelines.

### Readiness Checklist

| Requirement | Status | Evidence |
|-------------|:------:|----------|
| Functional testing | ✅ | 107 automated tests (Vitest) |
| Security testing | ✅ | HMAC auth, Zod validation, CSP headers, rate limiting |
| Input validation | ✅ | Zod schemas on all critical API routes |
| SQL injection prevention | ✅ | Parameterized queries via Supabase client |
| XSS prevention | ✅ | CSP headers, HttpOnly cookies |
| Authentication | ✅ | HMAC-SHA256 signed session cookies |
| Authorization | ⚠️ | Role-based (demo accounts; needs Aadhaar eKYC for production) |
| Performance testing | ⚠️ | Load test script exists; needs formal report |
| Accessibility (WCAG 2.1) | ⚠️ | Semantic HTML used; needs full WCAG audit |
| Documentation | ✅ | Architecture, API docs, model card, onboarding guide |
| Source code review | ⚠️ | Self-reviewed; needs third-party audit |
| Data localization | ✅ | Supabase instance (ap-south-1) in India |

### Action Items for STQC

1. **Engage STQC empanelled testing lab** (e.g., CDAC Pune, TCS iON)
2. **Generate formal test report** from Vitest output
3. **Complete WCAG 2.1 AA audit** using axe-core
4. **Submit application** to STQC via stqc.gov.in

---

## CERT-In Security Audit

### Security Posture Summary

| Control | Implementation |
|---------|---------------|
| **Authentication** | HMAC-SHA256 signed cookies (cryptographic, not guess-able) |
| **Session Management** | 24-hour expiry, server-side verification |
| **Input Validation** | Zod schemas on all POST endpoints |
| **Rate Limiting** | 5 req/min on auth endpoint |
| **CSP Headers** | Strict Content-Security-Policy |
| **Data Encryption** | TLS in transit, Supabase encryption at rest |
| **Audit Logging** | Every action logged to `audit_events` table |
| **Cryptography** | SHA-256 commitment scheme (matches Go chaincode) |

### Vulnerability Assessment

| Category | Risk | Status |
|----------|------|--------|
| SQL Injection | LOW | Supabase client uses parameterized queries |
| XSS | LOW | CSP headers + React auto-escaping |
| CSRF | MEDIUM | SameSite=Strict cookies; no CSRF token yet |
| Auth Bypass | LOW | HMAC verification on every request |
| Data Exposure | LOW | Secrets (v, r) never sent to client |
| DDoS | MEDIUM | Rate limiting on auth; no WAF yet |

### Action Items for CERT-In

1. **Commission VAPT** (Vulnerability Assessment & Penetration Testing)
2. **Add CSRF tokens** to state-changing forms
3. **Deploy WAF** (AWS WAF or Cloudflare) for DDoS protection
4. **Generate IS 15408 (Common Criteria) security target document**

---

## Data Localization (Data Protection Bill 2023)

| Data Category | Storage Location | Compliance |
|---------------|-----------------|:----------:|
| Tender metadata | Supabase (ap-south-1, Mumbai) | ✅ |
| Bid commitments | In-memory + Supabase (India) | ✅ |
| User PII (name, email) | Supabase (India) | ✅ |
| Aadhaar data | NOT stored (verified, not retained) | ✅ |
| ML model weights | Static file (deployed with app) | ✅ |
| Blockchain ledger | Docker volumes (deployed on-prem) | ✅ |

**No data is transferred outside India.**

---

## NIC Cloud Readiness

| Requirement | Status |
|-------------|:------:|
| Docker containerization | ✅ Multi-stage Dockerfile |
| Health check endpoint | ✅ `/api/health` |
| Environment-based config | ✅ All secrets via env vars |
| Logging | ✅ Structured logger with levels |
| Horizontal scaling | ✅ Supabase-backed state (not in-memory) |
| Backup strategy | ⚠️ Supabase automated backups; needs formal BCP |
