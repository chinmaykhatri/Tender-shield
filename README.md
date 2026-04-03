# TenderShield 🛡️

**India's First AI-Secured, Blockchain-Based Government Procurement Platform**

> **Blockchain India Challenge 2026** · MeitY + C-DAC · e-Procurement Track

![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-success?logo=github)
![Next.js](https://img.shields.io/badge/Frontend-Next.js_14-black?logo=nextdotjs)
![Hyperledger](https://img.shields.io/badge/Blockchain-Hyperledger_Fabric_2.5-blue?logo=hyperledger)
![Python](https://img.shields.io/badge/AI_Engine-Python_3.11-yellow?logo=python)
![Tests](https://img.shields.io/badge/Tests-146_Passing-green?logo=vitest)
![Mobile](https://img.shields.io/badge/Mobile-Responsive-purple?logo=googlechrome)

---

## 🚀 What Is TenderShield?

India loses **₹4-6 lakh crore annually** to procurement fraud. TenderShield ends this by combining:

| Technology | Purpose |
|-----------|---------|
| **Hyperledger Fabric 2.5** | Immutable audit trail with 4-org, 8-peer multi-org endorsement |
| **5-Detector AI Fraud Engine** | Shell company, bid rigging, cartel rotation, front-running, timing collusion |
| **SHA-256 Commit-Reveal** | Hash-based sealed bid privacy — bidders commit `SHA-256(amount \|\| nonce)`, then reveal after deadline |
| **Auto-Enforcement** | High-risk tenders automatically frozen and escalated to CAG |
| **Constitutional AI Safety** | Every AI decision is auditable and bounded by safety rules |
| **GFR 2017 Compliance** | Rules 144, 149, 153, 153A, 154, 166 validated in chaincode |

---

## 🏗️ Architecture

```
╔══════════════════════════════════════════════════════════╗
║                    TENDERSHIELD STACK                     ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  ┌─────────────────────────────────────────────────┐    ║
║  │  Layer 1: Next.js 14 Dashboard                  │    ║
║  │  • 3D glassmorphism UI with aurora animations   │    ║
║  │  • Mobile-responsive (bottom nav + hamburger)   │    ║
║  │  • 4 role-based dashboards (Officer/Bidder/     │    ║
║  │    CAG Auditor/Admin)                           │    ║
║  │  • Judge walkthrough with narrated tour         │    ║
║  └────────────────────┬────────────────────────────┘    ║
║                       │ API Routes                       ║
║  ┌────────────────────▼────────────────────────────┐    ║
║  │  Layer 2: FastAPI Backend (Port 8000)           │    ║
║  │  • JWT auth + RBAC + rate limiting              │    ║
║  │  • GFR compliance validation                    │    ║
║  │  • Supabase integration (PostgreSQL)            │    ║
║  └────────────┬────────────────┬───────────────────┘    ║
║               │                │                         ║
║  ┌────────────▼────────┐  ┌───▼────────────────────┐   ║
║  │ AI Engine (8001)    │  │ Hyperledger Fabric     │   ║
║  │ • 5 fraud detectors │  │ • 4 orgs, 8 peers     │   ║
║  │ • ML model (RF)     │  │ • Go chaincode (13 fn) │   ║
║  │ • Risk scoring      │  │ • Raft consensus      │   ║
║  └─────────────────────┘  └────────────────────────┘   ║
║                                                          ║
║  ┌──────────────────────────────────────────────────┐   ║
║  │  Layer 3: Storage & Events                       │   ║
║  │  • PostgreSQL (Supabase) · CouchDB · SHA-256   │   ║
║  └──────────────────────────────────────────────────┘   ║
╚══════════════════════════════════════════════════════════╝
```

### Dual-Mode Architecture

| Mode | Data Source | Use Case |
|------|-----------|----------|
| **Demo/Sandbox** | In-memory fallback data | Live demos, judge walkthroughs |
| **Real/Production** | Supabase + Fabric | Production deployment |

Both modes share identical UI — toggle via environment variable.

---

## ⚡ Quick Start

```bash
# 1. Clone
git clone https://github.com/chinmaykhatri/Tender-shield-final.git
cd Tender-shield-final

# 2. Install
npm install

# 3. Environment
cp .env.example .env.local
# Fill in: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

# 4. Run
npm run dev
# → http://localhost:3000

# 5. (Optional) Start Fabric network
bash network/start-fabric.sh

# 6. (Optional) Start backend services
cd backend && uvicorn main:app --reload --port 8000
cd ai_engine && uvicorn main:app --reload --port 8001
```

### Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Ministry Officer | officer@morth.gov.in | Tender@2025 |
| Company Bidder | medtech@medtechsolutions.com | Bid@2025 |
| CAG Auditor | auditor@cag.gov.in | Audit@2025 |

---

## 🛡️ Key Features

### 1. AI Fraud Detection Engine
5 independent detectors with weighted composite scoring:

| Detector | Weight | What It Checks |
|----------|--------|----------------|
| Shell Company | 0.30 | Shared PAN/CIN, common directors, dummy addresses |
| Bid Rigging | 0.25 | Coefficient of variation < 3% (normal: 8-15%) |
| Cartel Rotation | 0.20 | Same companies winning across tenders |
| Front-Running | 0.15 | Bids clustering near estimate value |
| Timing Collusion | 0.10 | Submission timestamps within seconds |

**Risk Levels:** 0-25 MONITOR → 26-50 FLAG → 51-75 FREEZE → 76-100 ESCALATE_CAG

### 2. SHA-256 Commit-Reveal Sealed Bids
Cryptographic bid confidentiality using hash-based commitments:
```
Commit Phase:   C = SHA-256(bid_amount || random_nonce)
Reveal Phase:   Bidder reveals (amount, nonce) → chain recomputes hash
Verification:   C_stored === SHA-256(amount || nonce) ✓
Properties:     Hiding (amount invisible until reveal), Binding (cannot change after commit)
```

### 3. Blockchain Immutability
- Go chaincode with 13 smart contract functions
- 4-org network (Ministry, Bidder, Auditor, NIC)
- Raft consensus with 3 orderers (crash fault tolerant)
- Dual-channel architecture (TenderChannel + AuditChannel)
- CouchDB state database for rich queries
- SHA-256 Merkle tree for integrity verification

### 4. CAG Auditor Dashboard
- Real-time fraud alerts with auto-escalation
- Complete immutable audit trail
- One-click investigation flagging
- Compliance report generation

### 5. Mobile-First Responsive Design
- **Phone (<768px):** Bottom nav, stacked cards, hamburger menu
- **Tablet (768-1024px):** Compact sidebar, responsive grids
- **Desktop (>1024px):** Full sidebar, 3D animations, data tables

### 6. ML Model (Random Forest)
- Trained on procurement data patterns
- Confusion matrix, ROC curve, precision/recall visualization
- Integrated into dashboard for real-time predictions

---

## 🏗️ Fabric Network Topology

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

---

## 📁 Project Structure

```
tendershield/
├── app/                    # Next.js 14 App Router (28+ pages)
│   ├── dashboard/          # Role-based dashboards
│   ├── api/                # API routes (blockchain, AI, enforcement)
│   └── architecture/       # System architecture page
├── ai_engine/              # Python AI fraud detection (5 detectors)
│   └── detectors/          # bid_rigging, shell_company, timing, etc.
├── backend/                # FastAPI backend (auth, RBAC)
├── chaincode/              # Go chaincode for Hyperledger Fabric
│   └── tendershield/       # Smart contract (tender_contract.go)
├── network/                # Fabric network configuration
│   ├── docker-compose.yaml # 17-container production topology
│   ├── configtx.yaml       # Channel policies
│   ├── crypto-config.yaml  # Organization certificates
│   └── start-fabric.sh     # One-click network startup
├── tests/                  # Python test suite (54 tests)
├── __tests__/              # TypeScript test suite (92 tests)
├── e2e/                    # Playwright E2E tests
├── docs/                   # Architecture, threat model, API reference
└── .github/workflows/      # CI/CD (7 parallel jobs)
```

---

## 🧪 Testing

```bash
# Frontend (92 tests)
npx vitest run

# Backend (54 tests)
.venv/Scripts/python.exe -m pytest tests/ -v

# Type checking
npx tsc --noEmit

# Production build
npx next build
```

**146 total tests** across 2 test suites covering AI detectors, blockchain API, cryptography, data layer, security, and state management.

---

## 🔄 CI/CD Pipeline

7 parallel GitHub Actions jobs on every push:

| Job | Description |
|-----|-------------|
| 🔍 Lint & Type Check | ESLint + TypeScript noEmit |
| 🧪 Unit Tests | Vitest + Pytest with coverage |
| 🏗️ Production Build | Next.js build verification |
| 🐍 Backend | Python Ruff lint + import check |
| ⛓️ Chaincode | Go build + vet |
| 🐳 Docker | Compose config validation |
| 🔒 Security | npm audit + secret scan |

---

## 📋 GFR 2017 Compliance

| Rule | Implementation |
|------|---------------|
| Rule 144 | Sealed bid enforcement via SHA-256 commit-reveal |
| Rule 149 | Open tender threshold validation (≥₹25 Lakh) |
| Rule 153 | Bid security auto-calculation (2-5% of estimated value) |
| Rule 153A | MSME preference scoring |
| Rule 154 | Bid security clause enforcement |
| Rule 166 | Documentation requirements checklist |

---

## 🔒 Security

- **Authentication:** JWT + Aadhaar eKYC + DSC verification
- **Authorization:** Role-based (4 roles) + Fabric MSP attributes
- **Data Integrity:** Blockchain immutability + SHA-256 commitment binding
- **Confidentiality:** Hash commitments hide bid amounts until reveal
- **Monitoring:** 5-detector AI + real-time alerting + auto-enforcement
- **Compliance:** GFR 2017, IT Act 2000, Aadhaar Act §29

---

## 🏆 Competition Highlights

- ✅ Real Hyperledger Fabric with Go chaincode (4 orgs, 8 peers, Raft consensus)
- ✅ SHA-256 Commit-Reveal for cryptographic bid confidentiality
- ✅ 5 independent AI fraud detectors with ML meta-weighting
- ✅ SHA-256 pairwise Merkle tree for data integrity
- ✅ Full GFR 2017 compliance (6 rules in chaincode)
- ✅ 146 tests passing (92 frontend + 54 backend)
- ✅ CI/CD with 7 parallel jobs (strict, no continue-on-error)
- ✅ Mobile-responsive design (phone, tablet, desktop)
- ✅ Docker containerized (17 containers)
- ✅ Dual-mode (Demo/Production) with honest simulation labels
- ✅ STRIDE threat model documentation
- ✅ CAG auditor dashboard with escalation workflows

---

## 👥 Team

Built by **Chinmay Khatri** for the **Blockchain India Challenge 2026** (MeitY + C-DAC)

## License

MIT

---

*Built with Next.js 14, Hyperledger Fabric 2.5, FastAPI, and Python AI/ML*
