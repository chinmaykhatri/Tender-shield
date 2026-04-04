# 🔒 TenderShield — Threat Model Document

> Security Analysis for AI-Secured Government Procurement Platform  
> Last Updated: March 2026

---

## 1. System Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRUST BOUNDARY: PUBLIC INTERNET               │
│  ┌───────────────┐                                              │
│  │   End Users    │ ──── HTTPS/TLS 1.3 ───→                    │
│  │  (Browser)     │                         │                   │
│  └───────────────┘                         ▼                   │
│                              ┌──────────────────────┐           │
│     TRUST BOUNDARY: DMZ      │  Next.js Frontend    │           │
│                              │  (Vercel / VPS)      │           │
│                              └──────────┬───────────┘           │
│                                         │ API Routes            │
│                              ┌──────────▼───────────┐           │
│     TRUST BOUNDARY: BACKEND  │  FastAPI Gateway     │           │
│                              │  (Port 8000)         │           │
│                              └──────────┬───────────┘           │
│                                         │                       │
│                    ┌────────────────────┼────────────────┐      │
│                    ▼                    ▼                ▼      │
│         ┌──────────────┐    ┌──────────────┐  ┌────────────┐   │
│  TRUST  │  Supabase    │    │  AI Engine   │  │ Hyperledger│   │
│  BOUND  │  (PostgreSQL)│    │  (Port 8001) │  │ Fabric     │   │
│         └──────────────┘    └──────────────┘  └────────────┘   │
│                                                                  │
│     TRUST BOUNDARY: CRYPTO   Commitment Ops (SHA-256 Commitments)       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. STRIDE Threat Analysis

### 2.1 Spoofing Identity

| Threat | Impact | Likelihood | Mitigation |
|--------|--------|------------|------------|
| Fake ministry officer creates fraudulent tenders | CRITICAL | Medium | Aadhaar eKYC + DSC verification + dual-org endorsement |
| Session hijacking via stolen JWT | HIGH | Low | Short-lived tokens (15min), RS256 signing, secure httpOnly cookies |
| Demo mode bypass to access real data | MEDIUM | Low | Strict mode separation in `dataLayer.ts`, server-side mode validation |

### 2.2 Tampering

| Threat | Impact | Likelihood | Mitigation |
|--------|--------|------------|------------|
| Modify tender after publication | CRITICAL | Very Low | Blockchain immutability — every state change is a new TX |
| Alter bid amount after commitment | CRITICAL | Very Low | SHA-256 hash commitment binding property (collision-resistant) |
| Manipulate AI fraud scores | HIGH | Low | Deterministic fallback engine, scores logged on-chain |
| Frontend DOM manipulation | LOW | Medium | Server-side validation on all API routes |

### 2.3 Repudiation

| Threat | Impact | Likelihood | Mitigation |
|--------|--------|------------|------------|
| Officer denies creating a tender | HIGH | Medium | Blockchain TX with officer DID + timestamp |
| Bidder claims different bid amount | HIGH | Low | Commitment hash on-chain before reveal |
| Auditor denies seeing alert | MEDIUM | Low | `audit_events` table with immutable trail |

### 2.4 Information Disclosure

| Threat | Impact | Likelihood | Mitigation |
|--------|--------|------------|------------|
| Bid amounts leaked before reveal | CRITICAL | Low | SHA-256 hides values — commitment reveals zero info |
| Aadhaar data exposure | CRITICAL | Very Low | §29 compliance — only stores verification hash, never raw data |
| API key exposure in frontend | HIGH | Medium | All keys in `.env.local`, never in client bundle |

### 2.5 Denial of Service

| Threat | Impact | Likelihood | Mitigation |
|--------|--------|------------|------------|
| API rate abuse | MEDIUM | Medium | Rate limiting: Officer=100/min, Bidder=50/min |
| Blockchain spam transactions | LOW | Low | Endorsement policy requires multi-org signing |
| Heavy AI analysis requests | MEDIUM | Medium | AI engine has request queue + timeout (30s) |

### 2.6 Elevation of Privilege

| Threat | Impact | Likelihood | Mitigation |
|--------|--------|------------|------------|
| Bidder accesses officer functions | CRITICAL | Low | Role-based middleware + MSP identity on Fabric |
| Officer escalates to admin | HIGH | Low | Role embedded in JWT + Fabric X.509 cert attributes |
| SQL injection via tender forms | HIGH | Low | Parameterized queries via Supabase client |

---

## 3. Attack Tree — Procurement Fraud

```
                      ┌─────────────────────────┐
                      │   PROCUREMENT FRAUD      │
                      │   (Root Goal)            │
                      └───────────┬─────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
     ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
     │ Bid Rigging    │ │ Insider Threat │ │ System Attack  │
     │ (Bidder-side)  │ │ (Officer-side) │ │ (Technical)    │
     └───────┬────────┘ └───────┬────────┘ └───────┬────────┘
             │                  │                   │
     ┌───────┤          ┌──────┤            ┌──────┤
     ▼       ▼          ▼      ▼            ▼      ▼
  [Shell   [Cartel    [Leak  [Tailor    [Tamper  [Bypass
   Co.]    Rotate]    Specs] Spec to    Ledger]  Auth]
                             Bidder]
     │       │          │      │            │      │
     ▼       ▼          ▼      ▼            ▼      ▼
  🛡️ AI     🛡️ AI    🛡️ BC   🛡️ AI     🛡️ BC   🛡️ RBAC
  Detect   Detect    Audit   Pattern    Immut.  + JWT
  (PAN)    (Hist.)   Trail   Match     Fabric   + MSP
```

**Legend:** 🛡️ = TenderShield defense layer, BC = Blockchain

---

## 4. Security Controls Summary

| Layer | Control | Implementation |
|-------|---------|----------------|
| **Authentication** | Multi-factor identity | Aadhaar eKYC + DSC + Password |
| **Authorization** | RBAC + ABAC | JWT roles + Fabric MSP attributes |
| **Data Integrity** | Blockchain | Hyperledger Fabric endorsement policy |
| **Confidentiality** | Commitment Scheme | SHA-256 hash commitments (collision-resistant) |
| **Availability** | Redundancy | Raft consensus (3 orderers), peer replication |
| **Monitoring** | AI + Alerts | 5-detector fraud engine, auto-freeze |
| **Audit** | Complete trail | Every action = immutable blockchain TX |
| **Compliance** | Regulatory | GFR 2017, IT Act 2000, Aadhaar Act §29 |

---

## 5. Incident Response Plan

| Severity | Example | Response Time | Action |
|----------|---------|---------------|--------|
| **P0 — Critical** | Active bid data exposure | Immediate | Auto-freeze all affected tenders, notify CAG, rotate keys |
| **P1 — High** | AI detects 90+ risk score | < 30 minutes | Auto-freeze tender, escalate to auditor, generate report |
| **P2 — Medium** | Unusual login pattern | < 4 hours | Flag account, require re-authentication, log event |
| **P3 — Low** | Rate limit exceeded | < 24 hours | Log event, adjust limits if needed |
