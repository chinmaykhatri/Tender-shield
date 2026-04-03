# TenderShield 🛡️
### AI-Powered Fraud Detection for Indian Government Procurement

India's CAG documents **₹4-6 lakh crore** in annual procurement fraud. TenderShield detects it in 3 seconds.

> **Blockchain India Challenge 2026** · MeitY + C-DAC · e-Procurement Track

![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-success?logo=github)
![Next.js](https://img.shields.io/badge/Frontend-Next.js_14-black?logo=nextdotjs)
![Hyperledger](https://img.shields.io/badge/Blockchain-Hyperledger_Fabric_2.5-blue?logo=hyperledger)
![Python](https://img.shields.io/badge/AI_Engine-Python_3.11-yellow?logo=python)

---

## Live Demo

🌐 **URL:** [tender-shield-final2.vercel.app](https://tender-shield-final2.vercel.app)

| Role | Email | Password |
|------|-------|----------|
| Ministry Officer | officer@morth.gov.in | Tender@2025 |
| Company Bidder | medtech@medtechsolutions.com | Bid@2025 |
| CAG Auditor | auditor@cag.gov.in | Audit@2025 |

---

## What Actually Works

| Feature | Status | Notes |
|---------|--------|-------|
| 5 fraud detectors | ✅ Real | Benford's Law, CV analysis, shell company, timing, shared director |
| ML fraud model | ✅ Real | GBM + Isolation Forest — trained on 847 GeM-calibrated records + 5 real CAG cases |
| Streaming AI analysis | ✅ Real | Claude explains detector output in real-time |
| Supabase data layer | ✅ Real | Live read/write on all tender operations |
| SHA-256 audit log | ✅ Real | Every TX is SHA-256 hash of actual content — cryptographically verifiable |
| Bid commitment scheme | ✅ Real | SHA-256 commit-reveal — verified matching test vectors |
| Go chaincode | ⚙️ Compiled | 13 functions, compiled and tested, deployable to Fabric |
| Hyperledger Fabric | ⚙️ Deployable | 4-org network config complete — connects when `FABRIC_LIVE=true` |
| Aadhaar eKYC | ⚙️ Demo | Accepts OTP 123456 — Surepass API key needed for production |
| GSTIN verification | ⚙️ Demo | Pre-loaded companies — API Setu key needed for production |
| GFR 2017 compliance | ✅ Real | Rules 144, 149, 153, 153A, 154, 166 validated in chaincode |

---

## The Honest Technical Claims

### What IS real:
- **5 fraud detectors** — Coefficient of Variation analysis, Benford's Law first-digit distribution, shell company age detection, timing collusion (60-second window), shared director PAN cross-referencing. These are the genuine technical contribution. Real statistical algorithms. Correct math.
- **ML model** — Pure-Python Gradient Boosting (100 trees) and Isolation Forest (150 trees). Trained on 847 records calibrated to real GeM procurement statistics (GeM Annual Report 2024), with 5 real CAG audit cases as ground truth anchors.
- **SHA-256 audit trail** — Every action hashes actual transaction content. Block chaining (each block references previous block hash). Cryptographically honest even without Fabric.
- **Go chaincode** — 900 lines, compiles, passes `go vet`, implements 13 functions covering full tender lifecycle with GFR compliance validation.

### What is NOT real (yet):
- **Hyperledger Fabric** is not running in production. The chaincode compiles and is deployable. Network configuration (4 orgs, 8 peers, Raft consensus) is complete. Demo uses SHA-256 chained audit log with honest labeling. Set `FABRIC_LIVE=true` to connect to a running peer.
- **Aadhaar/GSTIN** are demo flows. Real integration requires Surepass (Aadhaar) and API Setu (GSTIN) production API keys.
- **ML training data** is GeM-calibrated synthetic + 5 real CAG cases. Full GeM dataset is not publicly available via API.

---

## Architecture

```
Citizen / Officer / Auditor
       ↓
Next.js 14 Frontend (Vercel)
       ↓
Supabase (PostgreSQL + Auth + Realtime)
       ↓
FastAPI Backend (Python 3.11)
  ├── 5 Statistical Fraud Detectors
  ├── GBM + Isolation Forest ML Model
  └── Claude AI (explanation layer)
       ↓
SHA-256 Chained Audit Log
(→ Hyperledger Fabric when FABRIC_LIVE=true)
```

### Dual-Mode Architecture

| Mode | Data Source | Use Case |
|------|-----------|----------|
| **Production** | Supabase + Fabric | NIC deployment |
| **Demo** | Supabase fallback + SHA-256 audit log | Live demos, judge walkthroughs |

Both modes share identical UI — toggle via `FABRIC_LIVE` environment variable.

---

## 5 Fraud Detectors

These are the genuine core of TenderShield:

| # | Detector | Method | Threshold |
|---|----------|--------|-----------|
| 1 | **Bid CV Analysis** | Coefficient of Variation of bid amounts | CV < 5% = suspicious |
| 2 | **Shell Company** | GSTIN incorporation age at bid time | < 6 months = flagged |
| 3 | **Timing Collusion** | Bid submission timestamp clustering | All bids within 60s = flagged |
| 4 | **Cover Bid Detection** | Z-score outlier analysis | Z > 2.5 = likely cover bid |
| 5 | **Benford's Law** | First-digit distribution chi-square | Deviation > 0.25 = unnatural |

**Risk Levels:** 0-25 MONITOR → 26-50 FLAG → 51-75 FREEZE → 76-100 ESCALATE_CAG

These 5 detectors run locally. No external API call. No Claude dependency. Remove Claude → fraud still detected.

---

## ML Model

| Component | Details |
|-----------|---------|
| **Gradient Boosting** | 100 trees, depth 4, learning rate 0.1 — pure Python, no sklearn |
| **Isolation Forest** | 150 trees, max samples 256 — anomaly detection |
| **Features** | 15 features: bid count, CV, min/max ratio, Benford distance, timing cluster, gap CV, state diversity, incorporation age, shared directors, turnover ratio |
| **Training Data** | 847 GeM-calibrated records + 5 real CAG cases |
| **Persistence** | JSON (no pickle — portable, inspectable) |
| **Integration** | Hybrid scoring: 60% rule-based + 40% ML |

---

## SHA-256 Bid Commitment

```
Commit Phase:   C = SHA-256(bid_amount || random_nonce)
Reveal Phase:   Bidder reveals (amount, nonce) → chain recomputes hash
Verification:   C_stored === SHA-256(amount || nonce) ✓
Properties:     Hiding (amount invisible until reveal)
                Binding (cannot change after commit)
```

Implements GFR 2017 Rule 144 (sealed bid enforcement).

---

## Fabric Network Topology (Deployable)

```
     ┌──────────────────────────────────────┐
     │         3 Raft Orderers              │
     │  orderer0 · orderer1 · orderer2      │
     └──────────────────────────────────────┘
               │
     ┌─────────┼─────────┐─────────┐
     ▼         ▼         ▼         ▼
 MinistryOrg  BidderOrg  AuditorOrg  NICOrg
 (2 peers)    (2 peers)  (2 peers)   (2 peers)
 + CouchDB    + CouchDB  + CouchDB   + CouchDB
 + CA         + CA       + CA        + CA
```

- **TenderChannel**: All 4 orgs — tender lifecycle
- **AuditChannel**: Ministry + Auditor — confidential CAG investigations
- **Status**: Config complete. Chaincode compiled. Network starts with `docker-compose up -d`.

---

## GFR 2017 Compliance

| Rule | Implementation |
|------|---------------|
| Rule 144 | Sealed bid enforcement via SHA-256 commit-reveal |
| Rule 149 | Open tender threshold validation (≥₹25 Lakh) |
| Rule 153 | Bid security auto-calculation (2-5% of estimated value) |
| Rule 153A | MSME preference scoring |
| Rule 154 | Bid security clause enforcement |
| Rule 166 | Documentation requirements checklist |

---

## Project Structure

```
tendershield/
├── app/                    # Next.js 14 App Router
│   ├── dashboard/          # Role-based dashboards (Officer/Bidder/Auditor/Admin)
│   ├── api/                # API routes (blockchain, AI, enforcement)
│   └── architecture/       # System architecture page
├── ai_engine/              # Python AI fraud detection
│   ├── detectors/          # 5 detectors: bid_rigging, shell_company, timing, collusion, cartel
│   ├── ml/                 # GBM + Isolation Forest (pure Python, no sklearn)
│   └── data/               # GeM-calibrated training data + CAG cases
├── backend/                # FastAPI backend (auth, RBAC, Fabric integration)
├── chaincode/              # Go chaincode for Hyperledger Fabric (13 functions)
├── network/                # Fabric network configuration (17 containers)
├── tests/                  # Python test suite
├── __tests__/              # TypeScript test suite (92 tests)
└── .github/workflows/      # CI/CD (8 parallel jobs)
```

---

## Testing

```bash
# Frontend (92 tests)
npx vitest run

# Backend (54 tests)
python -m pytest tests/ -v

# Type checking
npx tsc --noEmit

# Production build
npx next build
```

**146 total tests** across 2 test suites.

---

## CI/CD Pipeline

8 parallel GitHub Actions jobs on every push:

| Job | Description |
|-----|-------------|
| 🔍 Lint & Type Check | ESLint + TypeScript noEmit |
| 🧪 Unit Tests | Vitest + Pytest with coverage |
| 🏗️ Production Build | Next.js build verification |
| 🐍 Backend | Python Ruff lint + import check |
| ⛓️ Chaincode | Go build + vet |
| 🐳 Docker | Compose config validation |
| 🔒 Security | npm audit + secret scan |
| 📊 CI Summary | Aggregated status report |

---

## Honest Limitations

1. Hyperledger Fabric is deployable but not running in the demo environment
2. ML model trained on GeM-calibrated synthetic data + 5 real CAG cases (full GeM dataset not publicly available)
3. Aadhaar/GSTIN verification uses demo mode (production API keys required)
4. No government pilot deployed (GovTech procurement cycles are 18-36 months)
5. Adoption requires regulatory mandate — corrupt actors would not voluntarily adopt this system

---

## Running Locally

```bash
# 1. Clone
git clone https://github.com/chinmaykhatri/Tender-shield.git
cd Tender-shield

# 2. Install
npm install

# 3. Environment
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# 4. Run
npm run dev
# → http://localhost:3000

# 5. (Optional) Start backend services
cd backend && uvicorn main:app --reload --port 8000
cd ai_engine && uvicorn main:app --reload --port 8001

# 6. (Optional) Start Fabric network (requires Docker)
cd network && docker-compose up -d
# Set FABRIC_LIVE=true in .env to connect
```

---

## Competition Context

Built for: **Blockchain India Challenge 2026** (MeitY + C-DAC)

**Genuine contribution:** 5 statistical fraud detectors + ML pipeline that detect patterns human auditors miss. SHA-256 commit-reveal for cryptographic bid confidentiality. Go chaincode implementing GFR 2017 compliance.

**Path to real deployment:** NIC integration + GFR 2017 amendment mandate.

---

## Team

Built by **Chinmay Khatri** for the Blockchain India Challenge 2026

## License

MIT

---

*Built with Next.js 14, Hyperledger Fabric 2.5, FastAPI, and Python AI/ML*
