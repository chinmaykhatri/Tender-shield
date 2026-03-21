# 🛡️ TenderShield

> **India's First AI-Secured, Blockchain-Based Government Procurement Monitoring System**

[![Blockchain India Competition 2025](https://img.shields.io/badge/Blockchain%20India-Competition%202025-blue)]()
[![Hyperledger Fabric 2.5](https://img.shields.io/badge/Hyperledger%20Fabric-2.5-green)]()
[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue)]()
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6)]()
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3ECF8E)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)]()

---

## 🎯 Problem Statement

India spends **₹45 lakh crore annually** on government procurement. Estimates suggest **10-15% is lost to corruption** — that's ₹4-6 lakh crore every year. The 2G scam, the Coal scam, the Defence procurement scandals — they all had one thing in common: **no transparent, tamper-proof audit trail that caught fraud in real-time.**

TenderShield changes that.

## 💡 Solution

TenderShield creates an **immutable, AI-monitored, cryptographically secure** tender management system that:

- 🔗 **Records every action on blockchain** — tender creation, bid submission, evaluation, award — all permanent, tamper-proof
- 🔐 **Encrypts bids using Zero-Knowledge Proofs** (Pedersen Commitments) — no one can see bid amounts until the deadline
- 🤖 **Detects fraud in real-time** using 5 AI algorithms running in parallel, catching bid rigging, shell companies, and cartels
- 🇮🇳 **Integrates with Indian government infrastructure** — GeM, Aadhaar eKYC, GSTIN, PAN, PFMS, NIC
- 🛡️ **AI Safety & Constitution** — Claude-powered AI with built-in constitutional safety, security logging, and misuse prevention

---

## 🏗️ Architecture

```
┌─────────── User Layer (Officers / Bidders / CAG Auditors / NIC Admin) ──────┐
│                                                                              │
├─────────── Identity & Verification Layer ────────────────────────────────────┤
│  Aadhaar eKYC (Surepass) · GSTIN (API Setu) · PAN · Employee ID · DSC      │
│  3-Gate Registration: Account → Verification → Admin Approval                │
│                                                                              │
├─────────── Frontend (Next.js 14 + TypeScript + TailwindCSS) ────────────────┤
│  Dashboard · Tender CRUD · Bid Submission · AI Monitor · Admin Panel         │
│  Real-time Notifications · Session Management · RBAC                         │
│                                                                              │
├─────────── API Layer (Next.js API Routes + FastAPI) ─────────────────────────┤
│  Auth · Verification · Tenders · Bids · AI Analysis · Blockchain Bridge     │
│  Rate Limiting · JWT · CSRF Protection · Security Headers                    │
│                                                                              │
├─────────── AI Engine (Python FastAPI — Port 8001) ───────────────────────────┤
│  5 Fraud Detectors · Composite Risk Scorer · Claude AI Assistant             │
│  Constitutional Safety · Security Logging · Explainability                   │
│                                                                              │
├─────────── Blockchain (Hyperledger Fabric 2.5 — 4 Orgs, Raft) ──────────────┤
│  Smart Contracts (Go) · ZKP Bid Encryption · Immutable Audit Trail          │
│  MinistryOrg · BidderOrg · AuditorOrg · NICOrg                              │
│                                                                              │
├─────────── Storage Layer ────────────────────────────────────────────────────┤
│  Supabase (PostgreSQL + Auth + Realtime) · Redis Cache · IPFS Documents     │
│                                                                              │
└─────────── Infrastructure ───────────────────────────────────────────────────┘
   Docker · CI/CD (GitHub Actions) · Vercel Deploy · Prometheus + Grafana
```

---

## ✨ Key Features

### 🔐 3-Gate Registration System
| Gate | What Happens |
|------|-------------|
| **Gate 1** | Supabase account created (email + password) |
| **Gate 2** | Role-specific identity verification (Aadhaar, GSTIN, PAN, Employee ID) |
| **Gate 3** | Admin approval (Officers + Bidders wait, CAG Auditors auto-approved) |

### 🤖 5 AI Fraud Detectors
| Detector | What It Catches |
|----------|----------------|
| **Bid Rigging** | Abnormally close bid amounts, round-number clustering |
| **Collusion Graph** | Companies that always bid together, shared directors |
| **Shell Company** | Newly registered companies (< 6 months), suspicious patterns |
| **Cartel Rotation** | Winners rotating in a predictable pattern across tenders |
| **Timing Anomaly** | Bids submitted suspiciously close together (within seconds) |

### 🇮🇳 India-Specific Integrations
- **Aadhaar eKYC** — OTP-based identity verification via Surepass API
- **GSTIN Verification** — Company validation + shell company detection via API Setu
- **PAN Verification** — Duplicate director detection across bidder companies
- **GFR Compliance** — GFR Rules 144, 149, 153, 154, 155 enforcement
- **GeM Integration** — Government e-Marketplace seller verification

### 🔗 Blockchain Features
- **Hyperledger Fabric 2.5** — 4-org permissioned network with Raft consensus
- **Zero-Knowledge Proofs** — Pedersen Commitments for bid encryption
- **Smart Contracts (Go)** — Tender lifecycle, bid management, ZKP verification
- **Immutable Audit Trail** — Every action timestamped and cryptographically signed

### 🛡️ AI Safety (Claude Constitution)
- **Constitutional AI** — Every AI response checked against safety rules
- **Security Logging** — Misuse attempts permanently recorded to audit trail
- **Prompt Injection Protection** — Input sanitization and output validation
- **Rate Limiting** — Per-user API call limits to prevent abuse

### 👥 Role-Based Access Control (4 Roles)
| Role | Access |
|------|--------|
| **Ministry Officer** | Create tenders, manage procurement, view dashboard |
| **Senior Officer** | Approve large tenders (> ₹100 Cr), oversight |
| **Bidder / Company** | Browse tenders, submit encrypted bids, track status |
| **CAG Auditor** | Full audit access, AI fraud monitoring, security logs |

---

## 📂 Project Structure

```
TenderShield/
├── app/                          # Next.js 14 App Router
│   ├── page.tsx                  # Login page (cinematic split layout)
│   ├── register/                 # Multi-step registration
│   │   ├── page.tsx              # Role selection
│   │   ├── bidder/page.tsx       # Bidder verification (GSTIN + PAN + Aadhaar)
│   │   ├── ministry-officer/     # Officer verification
│   │   ├── senior-officer/       # Senior officer verification
│   │   └── auditor/page.tsx      # CAG auditor verification
│   ├── dashboard/                # Protected dashboard
│   │   ├── page.tsx              # Main dashboard with stats
│   │   ├── layout.tsx            # Dashboard layout with sidebar
│   │   ├── tenders/              # Tender management
│   │   └── bids/                 # Bid management
│   ├── admin/                    # NIC Admin panel
│   ├── auditor/                  # CAG Auditor panel
│   ├── ai-monitor/               # AI fraud monitoring
│   ├── verify-pending/           # Verification pending status
│   ├── awaiting-approval/        # Admin approval status
│   ├── registration-rejected/    # Rejected registration
│   ├── api/                      # API Routes
│   │   ├── v1/auth/              # Authentication
│   │   ├── v1/tenders/           # Tender CRUD
│   │   ├── v1/bids/              # Bid operations
│   │   ├── verify/               # Identity verification
│   │   │   ├── aadhaar/          # Aadhaar OTP send/verify
│   │   │   ├── gstin/            # GSTIN verification
│   │   │   ├── pan/              # PAN verification
│   │   │   ├── employee-id/      # Employee ID save
│   │   │   ├── access-code/      # Auditor access codes
│   │   │   └── email-domain/     # Email domain validation
│   │   ├── ai/                   # AI analysis endpoints
│   │   ├── blockchain/           # Blockchain bridge
│   │   └── admin/                # Admin operations
│   └── components/               # Shared UI components
├── ai_engine/                    # Python AI Engine (FastAPI)
│   ├── main.py                   # FastAPI app entry
│   ├── risk_scorer.py            # Composite risk scoring
│   └── detectors/                # 5 fraud detection algorithms
│       ├── bid_rigging.py
│       ├── collusion_graph.py
│       ├── shell_company.py
│       ├── cartel_rotation.py
│       └── timing_anomaly.py
├── backend/                      # Python Backend (FastAPI)
│   ├── main.py                   # Backend entry
│   └── models/data_models.py     # Pydantic data models
├── chaincode/tendershield/       # Hyperledger Fabric Smart Contracts (Go)
│   ├── tender_contract.go
│   ├── zkp_utils.go
│   └── tender_contract_test.go
├── lib/                          # Shared TypeScript libraries
│   ├── supabase.ts               # Supabase client
│   ├── store.ts                  # Zustand auth store
│   ├── api.ts                    # API client
│   ├── dataLayer.ts              # Data abstraction layer
│   ├── ai/                       # AI utilities
│   │   ├── protectedClaudeCall.ts
│   │   ├── securityLogger.ts
│   │   └── safeParser.ts
│   ├── auth/                     # Auth utilities
│   │   ├── rateLimiter.ts
│   │   └── requireAuth.ts
│   └── verification/             # Verification utilities
│       ├── aadhaar.ts
│       ├── gstin.ts
│       ├── pan.ts
│       └── types.ts
├── supabase/                     # Database migrations
│   ├── complete-migration.sql
│   ├── seed-demo-data.sql
│   └── add-verification-columns.sql
├── middleware.ts                  # Auth + Verification Gate + Security Headers
├── .github/workflows/ci.yml      # CI/CD pipeline
├── docker-compose.yml            # Docker orchestration
└── pyrightconfig.json            # Python type checker config
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.11+
- Supabase account

### 1. Clone & Install
```bash
git clone https://github.com/chinmaykhatri/Tender-shield-final.git
cd Tender-shield-final
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env.local
# Fill in your Supabase URL, keys, and API tokens
```

### 3. Database Setup
Run the SQL migrations in Supabase SQL Editor:
1. `supabase/complete-migration.sql` — Creates all tables
2. `supabase/seed-demo-data.sql` — Seeds demo users and data
3. `supabase/add-verification-columns.sql` — Adds verification columns

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 5. Run AI Engine (Optional)
```bash
cd ai_engine
pip install -r requirements.txt
uvicorn main:app --port 8001
```

---

## 🎮 Demo Mode

TenderShield runs in **demo mode** by default — all identity verifications work without external API keys.

### Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Ministry Officer | `officer@morth.gov.in` | `Tender@2025` |
| Company Bidder | `medtech@medtechsolutions.com` | `Bid@2025` |
| CAG Auditor | `auditor@cag.gov.in` | `Audit@2025` |

### Demo Verification Credentials
| Verification | Demo Input |
|-------------|-----------|
| Aadhaar OTP | Any 12 digits → OTP: `123456` |
| GSTIN (Clean) | `07AABCM1234A1ZK` → MedTech Solutions |
| GSTIN (Shell) | `07AABCB5678B1ZP` → BioMed Corp (flagged) |
| PAN | `MEDTK1234M` → Valid |
| PAN (Duplicate) | `ABCDE1234F` → Shared director detected |
| Access Code | `TS-AUD-DEMO01` → Auditor auto-approved |

---

## 🔒 Security Features

- **Middleware-level verification gate** — Unverified users cannot access dashboard
- **Security headers** — X-Frame-Options, CSP, HSTS, XSS Protection
- **Rate limiting** — Per-user API call limits
- **RBAC** — Role-based access at middleware, API, and component levels
- **JWT authentication** — Supabase Auth with session management
- **Input sanitization** — All user inputs validated server-side
- **AI safety logging** — Misuse attempts permanently recorded

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14, TypeScript, TailwindCSS, Zustand |
| **Backend** | FastAPI (Python 3.11), Pydantic |
| **AI Engine** | Python, Claude AI, 5 Custom Detectors |
| **Database** | Supabase (PostgreSQL), Redis |
| **Blockchain** | Hyperledger Fabric 2.5, Go Smart Contracts |
| **Auth** | Supabase Auth, JWT, Aadhaar eKYC |
| **Identity** | Surepass (Aadhaar), API Setu (GSTIN/PAN) |
| **Deployment** | Vercel, Docker, GitHub Actions CI/CD |
| **Monitoring** | Prometheus, Grafana |

---

## 📜 GFR Compliance

TenderShield enforces **General Financial Rules (GFR)** of the Government of India:

| Rule | Enforcement |
|------|------------|
| **GFR 144** | Administrative approval required before tender creation |
| **GFR 149** | Open tender mandatory for procurement ≥ ₹25 Lakh |
| **GFR 153** | Bid security (EMD) auto-calculated at 2% of estimated value |
| **GFR 153(a)** | Performance security clause in all tender contracts |
| **GFR 154** | Evaluation criteria defined at tender creation |
| **GFR 155** | Award to lowest qualified bidder (L1) enforced |
| **GFR 166** | Record retention on blockchain for 10 years |

---

## 🏆 Competition Submission

**Blockchain India Competition 2025**

- **Team**: TenderShield
- **Category**: Government & Public Sector
- **Problem**: Procurement fraud in Indian government tenders
- **Solution**: AI + Blockchain + ZKP for transparent, tamper-proof procurement

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<p align="center">
  <b>🛡️ TenderShield — Securing India's ₹45 Lakh Crore Procurement</b><br>
  <sub>Built with ❤️ for Blockchain India 2025</sub>
</p>
