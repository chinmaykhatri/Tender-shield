# TenderShield 🛡️

### AI + Blockchain Fraud Detection for Indian Government Procurement

India's CAG documents **₹4-6 lakh crore** in annual procurement fraud. TenderShield detects it in **3 seconds**.

> **Blockchain India Challenge 2026** · MeitY + C-DAC · e-Procurement Track

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![Tests](https://img.shields.io/badge/Tests-107%20passing-brightgreen)](.)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](./Dockerfile)

---

## 🌐 Live Demo

**URL:** [tender-shield-final2.vercel.app](https://tender-shield-final2.vercel.app)

| Role | Email | Password |
|------|-------|----------|
| Ministry Officer | `officer@morth.gov.in` | `Tender@2025` |
| Company Bidder | `medtech@medtechsolutions.com` | `Bid@2025` |
| CAG Auditor | `auditor@cag.gov.in` | `Audit@2025` |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                 │
│  │  Ministry     │  │  Bidder      │  │  CAG Auditor │                 │
│  │  Officer UI   │  │  Portal UI   │  │  Dashboard   │                 │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                 │
│         └──────────────────┼──────────────────┘                        │
│                            ↓                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                        APPLICATION LAYER                                │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Next.js 14 App Router (40+ API Routes)                         │   │
│  │  ├── HMAC-SHA256 Auth + Zod Input Validation                    │   │
│  │  ├── /api/procurement-lifecycle  ← Multi-tenant lifecycle       │   │
│  │  ├── /api/v1/bids/commit         ← Real SHA-256 commitment     │   │
│  │  ├── /api/ai-analyze             ← Claude + ML fraud engine    │   │
│  │  ├── /api/verify/{pan,gstin}     ← KYC (API Setu / Demo)      │   │
│  │  └── /api/chaincode-invoke       ← Fabric gateway / fallback  │   │
│  └─────────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────────┤
│                       INTELLIGENCE LAYER                                │
│  ┌──────────────────────┐  ┌────────────────────────────────────────┐  │
│  │  Random Forest ML    │  │  5 Statistical Fraud Detectors         │  │
│  │  (100 trees, 15 feat)│  │  ├── CV Analysis (bid clustering)     │  │
│  │  Trained: 2000 sample│  │  ├── Shell Company Age Detection      │  │
│  │  Acc: ~92%           │  │  ├── Timing Collusion (60s window)    │  │
│  │  Serialized: JSON    │  │  ├── Front-Running (estimate match)   │  │
│  │                      │  │  └── Director PAN Cross-Reference     │  │
│  └──────────────────────┘  └────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────┤
│                         DATA LAYER                                      │
│  ┌─────────────────┐  ┌──────────────────┐  ┌───────────────────────┐ │
│  │  Supabase        │  │  IPFS (Pinata)   │  │  Hyperledger Fabric   │ │
│  │  (PostgreSQL)    │  │  Document Pins   │  │  4 Orgs, 8 Peers     │ │
│  │  + RLS           │  │                  │  │  Raft Consensus      │ │
│  │  + Audit Events  │  │                  │  │  Go Chaincode        │ │
│  └─────────────────┘  └──────────────────┘  └───────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## ✅ What Actually Works (Honest)

| Component | Status | Evidence |
|-----------|:------:|---------|
| **5 Fraud Detectors** | ✅ Real | CV analysis, Benford's, shell company, timing, director network |
| **Random Forest ML Model** | ✅ Real | 100-tree ensemble, 15 features, ~92% accuracy |
| **SHA-256 Bid Commitment** | ✅ Real | Commit-reveal scheme, cross-verified with Go chaincode |
| **Supabase Data Layer** | ✅ Real | Live PostgreSQL — tenders, bids, audit events |
| **HMAC-SHA256 Auth** | ✅ Real | Cryptographic session signing, rate-limited |
| **Zod Input Validation** | ✅ Real | Schema validation on all critical API routes |
| **Multi-Tenant Lifecycle** | ✅ Real | Concurrent tenders via `Map` + Supabase persistence |
| **107 Automated Tests** | ✅ Real | Vitest — auth, crypto, ML, e2e flow |
| **Go Chaincode** | ⚙️ Compiled | 13 functions, `go vet` passes, deployable |
| **Fabric Network** | ⚙️ Deployable | Config complete — `bash network/start-fabric.sh` |
| **Aadhaar/GSTIN KYC** | ⚙️ Demo | Labeled `DEMO_MOCK` — real API keys enable live mode |
| **Docker** | ✅ Ready | Multi-stage, non-root, health check |

---

## 🔐 Cryptography

### SHA-256 Bid Commitment (GFR Rule 144)

```
Commit:    C = SHA-256(bid_amount₆ || "||" || random_256bit)
Reveal:    Bidder reveals (amount, nonce) → server recomputes
Verify:    C_stored === SHA-256(amount || "||" || nonce)  ✓

Properties:
  ✓ Hiding:  Amount invisible until reveal phase
  ✓ Binding: Cannot change committed value
  ✓ Cross-layer: TypeScript ↔ Go produce identical hashes
```

### Fiat-Shamir Commitment Proof

```
Proof:     H = SHA-256(commitment || challenge)
Challenge: SHA-256(commitment)
Verify:    Recompute H from commitment → match
```

---

## 🤖 ML Model

| Property | Value |
|----------|-------|
| **Algorithm** | Random Forest (100 trees, max depth 10) |
| **Features** | 15 engineered features (bid spread, clustering, timing, PAN diversity) |
| **Training** | 2,000 synthetic samples (GeM-calibrated distributions) |
| **Accuracy** | ~92% (test set) |
| **Serialization** | JSON (no pickle — portable, inspectable, ~19KB) |
| **Inference** | In-process (no GPU, no external service) |
| **Model Card** | [`docs/ML-MODEL-CARD.md`](docs/ML-MODEL-CARD.md) |

> ⚠️ **Honest limitation:** Trained on synthetic data. Real-world performance requires retraining on actual GeM/CPPP data via `scripts/ingest-real-data.ts`.

---

## 📂 Project Structure

```
TenderShield/
├── app/                        # Next.js 14 App Router
│   ├── api/                    # 40+ API routes
│   │   ├── auth/               # HMAC-SHA256 session auth
│   │   ├── procurement-lifecycle/  # Multi-tenant tender lifecycle (CORE)
│   │   ├── chaincode-invoke/   # Fabric chaincode gateway
│   │   ├── v1/bids/            # Sealed bid commitment
│   │   ├── verify/             # PAN, GSTIN, Aadhaar KYC
│   │   └── ai/                 # ML + Claude analysis
│   ├── dashboard/              # Role-based dashboards
│   └── page.tsx                # Login
├── lib/                        # Shared libraries (46 files)
│   ├── zkp.ts                  # SHA-256 commitment scheme
│   ├── ml/                     # Random Forest model + features
│   ├── validation/             # Zod input schemas
│   └── store.ts                # Auth state management
├── chaincode/                  # Go Hyperledger Fabric chaincode
│   └── tendershield/main.go    # 13 smart contract functions
├── network/                    # Fabric network (4 orgs, 8 peers)
│   ├── start-fabric.sh         # One-click boot script
│   ├── docker-compose.yaml     # Container orchestration
│   ├── crypto-config.yaml      # MSP certificates
│   └── configtx.yaml           # Channel configuration
├── __tests__/                  # 107 tests (Vitest)
├── scripts/                    # Automation
│   ├── train-model.ts          # ML model training
│   ├── ingest-real-data.ts     # Real CSV data ingestion
│   └── load-test.ts            # Multi-tenant load testing
├── docs/                       # Professional documentation
│   ├── ML-MODEL-CARD.md        # Model transparency
│   ├── BLOCKCHAIN-VALUE-PROPOSITION.md
│   ├── COMPLIANCE-READINESS.md # STQC + CERT-In readiness
│   ├── DEPLOYMENT-BUSINESS-MODEL.md
│   └── ONBOARDING.md           # Developer quick-start
├── Dockerfile                  # Multi-stage production build
└── middleware.ts               # Auth + CSP + rate limiting
```

---

## 🚀 Quick Start

```bash
# 1. Clone & install
git clone https://github.com/chinmaykhatri/Tender-shield.git
cd Tender-shield && npm install

# 2. Environment
cp .env.example .env.local
# Add: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# 3. Train ML model
npx tsx scripts/train-model.ts

# 4. Run
npm run dev    # → http://localhost:3000
```

### Docker

```bash
docker build -t tendershield .
docker run -p 3000:3000 --env-file .env.local tendershield
```

### Fabric Network (Optional)

```bash
cd network && bash start-fabric.sh
# Set FABRIC_LIVE=true in .env.local
```

---

## 🧪 Testing

```bash
npx vitest run              # 107 tests — all passing
npx tsc --noEmit            # Type checking — 0 errors
npx tsx scripts/load-test.ts  # Multi-tenant load test
```

---

## 🏛️ GFR 2017 Compliance

| Rule | Implementation |
|------|---------------|
| **Rule 144** | Sealed bid enforcement via SHA-256 commit-reveal |
| **Rule 149** | Open tender threshold validation (≥₹25 Lakh) |
| **Rule 153** | Bid security auto-calculation (2-5% of estimated value) |
| **Rule 153A** | MSME preference scoring |
| **Rule 154** | Bid security clause enforcement |
| **Rule 166** | Documentation requirements checklist |

---

## 📋 Security

| Control | Implementation |
|---------|---------------|
| **Authentication** | HMAC-SHA256 signed cookies (cryptographic, not guess-able) |
| **Input Validation** | Zod schemas on all POST endpoints |
| **Rate Limiting** | 5 req/min on auth endpoint |
| **CSP Headers** | Strict Content-Security-Policy |
| **Secrets** | Bid values (v, r) never sent to client |
| **Docker** | Non-root user, health check, minimal attack surface |

---

## 📄 Documentation

| Document | Purpose |
|----------|---------|
| [`docs/ML-MODEL-CARD.md`](docs/ML-MODEL-CARD.md) | Model transparency — features, limitations, retraining |
| [`docs/BLOCKCHAIN-VALUE-PROPOSITION.md`](docs/BLOCKCHAIN-VALUE-PROPOSITION.md) | Why Fabric, not just Postgres |
| [`docs/COMPLIANCE-READINESS.md`](docs/COMPLIANCE-READINESS.md) | STQC + CERT-In certification checklist |
| [`docs/DEPLOYMENT-BUSINESS-MODEL.md`](docs/DEPLOYMENT-BUSINESS-MODEL.md) | Revenue models + deployment options |
| [`docs/ONBOARDING.md`](docs/ONBOARDING.md) | Developer quick-start guide |

---

## 🔍 Honest Limitations

1. **Fabric not running in demo** — Chaincode compiles and deploys; demo uses SHA-256 audit log with honest labeling
2. **ML trained on synthetic data** — Real-data ingestion pipeline ready (`scripts/ingest-real-data.ts`)
3. **KYC is demo mode** — PAN/GSTIN verification returns `DEMO_MOCK` label; set API keys for real mode
4. **No government pilot** — GovTech procurement cycles are 18-36 months
5. **No STQC certification** — Readiness checklist at 80%+ (`docs/COMPLIANCE-READINESS.md`)

---

## 🏆 Competition Context

Built for: **Blockchain India Challenge 2026** (MeitY + C-DAC)

**Genuine contribution:** 5 statistical fraud detectors + Random Forest ML pipeline that detect patterns human auditors miss. SHA-256 commit-reveal for cryptographic bid confidentiality. Multi-tenant architecture supporting concurrent procurement lifecycles. Go chaincode implementing GFR 2017 compliance.

**Path to deployment:** NIC Cloud integration + STQC certification + GFR amendment mandate.

---

## 👤 Team

Built by **Chinmay Khatri** for the Blockchain India Challenge 2026

## 📜 License

MIT
