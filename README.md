# 🏛️ TenderShield

> **India's First AI-Secured, Blockchain-Based Government Procurement Monitoring System**

[![Blockchain India Competition 2025](https://img.shields.io/badge/Blockchain%20India-Competition%202025-blue)]()
[![Hyperledger Fabric 2.5](https://img.shields.io/badge/Hyperledger%20Fabric-2.5-green)]()
[![Python 3.11](https://img.shields.io/badge/Python-3.11-blue)]()
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow)]()

---

## 🎯 Problem Statement

India spends **₹45 lakh crore annually** on government procurement. Estimates suggest **10-15% is lost to corruption** — that's ₹4-6 lakh crore every year. The 2G scam, the Coal scam, the Defence procurement scandals — they all had one thing in common: **no transparent, tamper-proof audit trail that caught fraud in real-time.**

TenderShield changes that.

## 💡 Solution

TenderShield creates an **immutable, AI-monitored, cryptographically secure** tender management system that:

- **Records every action on blockchain** — tender creation, bid submission, evaluation, award — all permanent, tamper-proof
- **Encrypts bids using Zero-Knowledge Proofs** (Pedersen Commitments) — no one can see bid amounts until the deadline
- **Detects fraud in real-time** using 5 AI algorithms running in parallel, catching bid rigging, shell companies, and cartels
- **Integrates with Indian government infrastructure** — GeM, Aadhaar, PFMS, NIC

---

## 🏗️ Architecture Overview

```
┌─────────── User Layer (Officers / Bidders / CAG Auditors / NIC) ───────────┐
│                                                                             │
├─────────── Identity Layer (Aadhaar eKYC + Fabric CA + DSC) ────────────────┤
│                                                                             │
├─────────── API Gateway (FastAPI + JWT + Rate Limiting) ─────────────────────┤
│                                                                             │
├─────────── App Services (Tender / Bid / ZKP / Alert) ───────────────────────┤
│                                                                             │
├─────────── AI Engine (Bid Rigging / Collusion / Cartel / Timing) ──────────┤
│                                                                             │
├─────────── Blockchain (Hyperledger Fabric — 4 Orgs, Raft) ──────────────────┤
│                                                                             │
├─────────── Event Streaming (Apache Kafka) ──────────────────────────────────┤
│                                                                             │
├─────────── Storage (IPFS + PostgreSQL + Redis) ─────────────────────────────┤
│                                                                             │
└─────────── Monitoring (Prometheus + Grafana) ───────────────────────────────┘
```

## 🔧 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Blockchain | Hyperledger Fabric 2.5 | Immutable ledger, permissioned network |
| Consensus | Raft (3 orderers) | Crash fault tolerance |
| Smart Contracts | Go (Fabric Contract API) | Business logic on-chain |
| Backend | FastAPI (Python 3.11) | REST API + WebSocket |
| Frontend | Next.js 14 + Tailwind CSS | Government dashboard |
| AI/ML | scikit-learn + NetworkX + PyTorch | Fraud detection |
| ZKP | Pedersen Commitments | Bid confidentiality |
| Identity | Fabric CA + Aadhaar eKYC | Verified participants |
| Storage | IPFS + PostgreSQL + Redis | Documents + metadata + cache |
| Events | Apache Kafka | Real-time event streaming |
| Monitoring | Prometheus + Grafana | Observability |

## 🏛️ Four Organizations on Blockchain

| Organization | Role | Represents |
|---|---|---|
| **MinistryOrg** | Creates tenders, evaluates bids, awards contracts | All central government ministries |
| **BidderOrg** | Submits ZKP-encrypted bids | Companies, MSMEs, startups |
| **AuditorOrg** | Monitors, audits, escalates fraud | CAG (Comptroller & Auditor General) |
| **NICOrg** | Infrastructure admin, AI service identity | National Informatics Centre |

---

## 🚀 Quick Start

### Prerequisites

- **Docker** 20.10+ & **Docker Compose** 2.0+
- **Go** 1.21+ (for chaincode compilation)
- **Python** 3.11+ (for backend & AI engine)
- **Node.js** 18+ & **npm** (for frontend)
- **Hyperledger Fabric binaries** 2.5 (`cryptogen`, `configtxgen`, `peer`)

### Step 1: Clone & Configure

```bash
git clone https://github.com/tendershield/tendershield.git
cd tendershield
cp .env.example .env
# Edit .env with your API keys (optional for demo mode)
```

### Step 2: Start Blockchain Network

```bash
cd network/scripts
chmod +x setup-network.sh
./setup-network.sh up
```

This will:
- ✅ Generate crypto material for all 4 organizations
- ✅ Create TenderChannel (all orgs) and AuditChannel (Ministry + CAG)
- ✅ Start 3 orderers (Raft), 8 peers, 4 CAs, 4 CouchDB instances
- ✅ Install & commit TenderShield chaincode
- ✅ Seed 3 demo tenders (MoRTH ₹450Cr, MoE ₹85Cr, MoH ₹120Cr)
- ✅ Run smoke test

### Step 3: Start Backend Services

```bash
# Install Python dependencies
pip install -r requirements.txt

# Start FastAPI backend (port 8000)
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# In another terminal — Start AI engine (port 8001)
cd ai_engine
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### Step 4: Start Frontend Dashboard

```bash
# Install Node dependencies
npm install

# Start Next.js dashboard (port 3000)
npm run dev
```

### Step 5: Open Dashboard

Navigate to **http://localhost:3000** — login with demo credentials.

### Demo Credentials

| Role | Username | Password |
|---|---|---|
| Ministry Officer | officer@morth.gov.in | Tender@2025 |
| Bidder (Legitimate) | medtech@medtechsolutions.com | Bid@2025 |
| Shell Company Bidder | admin@biomedicorp.com | Bid@2025 |
| CAG Auditor | auditor@cag.gov.in | Audit@2025 |
| NIC Admin | admin@nic.in | Admin@2025 |

---

## 🇮🇳 India-Specific Compliance

| Regulation | Implementation |
|---|---|
| **GFR 2017 Rule 149** | Open tender threshold (>₹25 lakh) enforced in chaincode |
| **GFR 2017 Rule 153** | Bid security (2-5%) auto-calculated |
| **GFR 2017 Rule 153A** | MSME preference scoring in evaluation |
| **CVC Guidelines** | Full audit trail + AI monitoring for corruption |
| **IT Act 2000** | DSC verification, Aadhaar eKYC, digital records validity |
| **GST Act** | GSTIN (15-char) validation for all bidders |
| **Aadhaar Act 2016** | eKYC identity verification via UIDAI |

---

## 🔐 Security Considerations

### 1. Man-in-the-Middle Attack Mitigation
- TLS 1.3 on all connections
- Mutual TLS (mTLS) between Fabric peers
- JWT tokens with RS256 signing and 15-minute expiry

### 2. Insider Threat Protection
- Dual endorsement: MinistryOrg AND NICOrg required for tender creation
- Full blockchain audit trail visible to CAG
- AI monitors officer-bidder correlation patterns
- Aadhaar eKYC ties every action to a real identity

### 3. ZKP Implementation Security
- Standard Pedersen commitment parameters (NIST curves)
- Commitment binding: computationally infeasible to change bid after commitment
- Commitment hiding: zero information leaked about bid amount
- Range proofs ensure valid bid amounts without revealing values

---

## 📂 Project Structure

```
tendershield/
├── docs/                          # Architecture & technical documentation
│   └── ARCHITECTURE.md            # 9-layer architecture diagram
├── network/                       # Hyperledger Fabric network
│   ├── crypto-config.yaml         # Crypto material generation config
│   ├── configtx.yaml              # Channel & consensus configuration
│   ├── docker-compose.yaml        # Full Docker network (20+ containers)
│   ├── prometheus/                # Monitoring configuration
│   └── scripts/
│       └── setup-network.sh       # One-command network setup
├── chaincode/
│   └── tendershield/
│       ├── models.go              # Go data models (CouchDB + composite keys)
│       ├── tender_contract.go     # Main chaincode (13 functions)
│       ├── zkp_utils.go           # Pedersen Commitment ZKP
│       ├── compliance.go          # GFR 2017 compliance engine
│       ├── identity.go            # Identity verification
│       └── tender_contract_test.go
├── backend/
│   ├── main.py                    # FastAPI application
│   ├── models/
│   │   └── data_models.py         # Pydantic schemas with Indian validators
│   ├── auth/                      # JWT + Aadhaar eKYC
│   ├── routers/                   # API endpoints (tenders, bids, audit)
│   ├── services/                  # IPFS, Kafka, GeM integration
│   └── database/                  # PostgreSQL models & migrations
├── ai_engine/
│   ├── main.py                    # AI microservice (port 8001)
│   ├── detectors/                 # 5 fraud detection algorithms
│   ├── risk_scorer.py             # Composite risk scoring
│   └── models/                    # ML model training & registry
├── frontend/
│   ├── app/                       # Next.js 14 App Router pages
│   ├── components/                # Reusable React components
│   ├── hooks/                     # Custom hooks (blockchain feed)
│   └── lib/                       # API client & utilities
├── demo/                          # Competition demo scripts
├── .env.example                   # Environment variables template
├── requirements.txt               # Python dependencies
├── package.json                   # Node.js dependencies
└── README.md                      # This file
```

---

## 🏆 Competition Differentiators

| Feature | Details |
|---|---|
| 🔐 **ZKP Innovation** | First known application of Pedersen Commitments to Indian government procurement |
| 🇮🇳 **India Integration** | Aadhaar eKYC, GeM, GFR 2017, GSTIN/PAN validation, IST timestamps |
| 🤖 **5 AI Fraud Detectors** | Bid rigging, collusion graph, cartel rotation, timing anomaly, shell company |
| ⛓️ **Enterprise Blockchain** | Hyperledger Fabric (not Ethereum), 4-org network, dual channels, Raft consensus |
| 📊 **Production Ready** | Docker Compose, Prometheus+Grafana monitoring, Kafka streaming, comprehensive tests |

---

## 📜 License

MIT License — Built for Blockchain India Competition 2025

---

**Built with ❤️ for a corruption-free India 🇮🇳**
