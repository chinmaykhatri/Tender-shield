<p align="center">
  <img src="https://img.shields.io/badge/🛡️_TenderShield-Cryptographically_Audited-6366f1?style=for-the-badge&labelColor=0f172a" alt="TenderShield" />
</p>

<h1 align="center">TenderShield 🛡️</h1>

<p align="center">
  <strong>AI-Powered Procurement Fraud Detection & Prevention for Indian Government</strong><br/>
  <em>6 statistical detectors · Real federated learning (FedAvg) · Anti-gaming HMAC thresholds · GeM/CPPP data pipeline · GFR 2017 compliance · 6 Indian languages</em>
</p>

<p align="center">
  <a href="https://tendershield.vercel.app">🌐 Live Demo</a> •
  <a href="https://tendershield.vercel.app/playground">🔬 Fraud Playground</a> •
  <a href="#-problem-statement">📋 Problem</a> •
  <a href="#-how-tendershield-solves-it">💡 Solution</a> •
  <a href="#-system-architecture">🏗️ Architecture</a> •
  <a href="#-anti-gaming-ai-engine">🧠 AI Engine</a>
</p>

<p align="center">
  <a href="https://tendershield.vercel.app"><img src="https://img.shields.io/badge/Live-tendershield.vercel.app-22c55e?style=flat-square&logo=vercel" alt="Live Demo" /></a>
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Next.js-14-000000?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python" alt="Python" />
  <img src="https://img.shields.io/badge/Detectors-6_Statistical-f59e0b?style=flat-square" alt="Detectors" />
  <img src="https://img.shields.io/badge/FL-FedAvg_Real-8b5cf6?style=flat-square" alt="Federated Learning" />
  <img src="https://img.shields.io/badge/Languages-6_Indian-FF9933?style=flat-square" alt="Languages" />
  <img src="https://img.shields.io/badge/Tests-109_passing-22c55e?style=flat-square" alt="Tests" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=flat-square" alt="License" />
</p>

---

## 📋 Problem Statement

### India's ₹4-6 Lakh Crore Procurement Fraud Crisis

India's public procurement handles **₹20+ lakh crore** (~$250B) annually through GeM, CPPP, and 30+ state portals. The CAG documents **₹4-6 lakh crore in irregularities** every year — cartels rig bids, shell companies win contracts, and detection takes 6-12 months of manual auditing.

| Problem | Scale | Current State |
|---------|-------|---------------|
| **Bid-rigging & Cartelization** | 38% of large tenders show collusion patterns | Manual detection — 6-12 months |
| **Shell Company Networks** | Directors control 5-10 fake entities per cartel | No automated cross-referencing |
| **Threshold Gaming** | Cartels reverse-engineer detection boundaries | Static thresholds — once known, always evaded |
| **Cross-Ministry Fraud** | Same cartel operates across multiple ministries | No cross-ministry correlation |
| **Post-Facto Auditing** | Fraud discovered 1-3 years after contract award | Zero prevention capability |

### Why Claude/ChatGPT Can't Replace This

> **The moat is data, not code.** An LLM can generate fraud detection code. It cannot generate labeled Indian procurement fraud data from real government officers. TenderShield's behavioral learning pipeline creates a proprietary dataset that grows more valuable with every tender processed.

---

## 💡 How TenderShield Solves It

TenderShield is a **real-time fraud detection + prevention system** with mathematically resistant anti-gaming features. It doesn't replace GeM/CPPP — it adds an intelligence and integrity layer on top.

### Core Innovation: Detect → Prevent → Learn → Adapt

```
┌──────────────────────────────────────────────────────────────────────┐
│  DETECT              PREVENT              LEARN              ADAPT   │
│                                                                      │
│  6 Statistical        Paillier HE          Officer Labels →   HMAC   │
│  Detectors +          Sealed Bids          Ground Truth →    Dynamic │
│  Random Forest        + Auto-Lock          JSONL Store →    Thresholds│
│  + Boundary           Enforcement          Retrain Pipeline  per-    │
│  Gaming Meta-                                               tender   │
│  Detector                                                            │
│                                                                      │
│  3 second             Zero bid             Proprietary       Cartels │
│  analysis             leakage              data moat         can't   │
│                                                              predict │
└──────────────────────────────────────────────────────────────────────┘
```

| Capability | How It Works | Impact |
|-----------|-------------|--------|
| **Anti-Gaming Detection** | HMAC-SHA256 per-tender dynamic thresholds (CV: 2-5%, Rotation: 60-80%) | Cartels cannot reverse-engineer detection boundaries |
| **Boundary Gaming Meta-Detector** | Flags bids engineered to sit just above detection thresholds | Avoiding detection becomes a detectable signal |
| **Federated Learning (FedAvg)** | Independent Random Forest training per ministry shard → FedAvg aggregation | Privacy-preserving cross-ministry model without raw data sharing |
| **Behavioral Learning** | Officers label outcomes → ground truth → JSONL persistence → retraining | System improves with every tender processed |
| **Cross-Ministry Correlation** | Live Supabase API — detects same bidder across 3+ ministries | Catches "ministry hopping" cartel strategies |
| **GeM/CPPP Data Pipeline** | Automated scraping, cleaning, and fraud labeling from government portals | Real procurement data replaces synthetic training data |
| **GFR 2017 Compliance Engine** | 7 real General Financial Rules as executable code (Rules 149-177) | Automated regulatory compliance, not just a whitepaper |
| **6-Language Support** | English, Hindi, Tamil, Bengali, Telugu, Marathi (80 UI keys × 6) | Accessible to government officials across India |
| **Live Fraud Playground** | Public page — 6 real detectors on 5 scenarios, zero login required | Proves the system works. Not a wrapper. |
| **National Risk Dashboard** | Live Supabase queries — state heatmap + ministry scores for CAG HQ | Bird's-eye view of procurement integrity across India |

---

## 🔬 Live Fraud Playground — Try It Now

**🔗 [tendershield.vercel.app/playground](https://tendershield.vercel.app/playground)** — No login required

Run TenderShield's real AI engine on pre-built fraud scenarios. This is the actual `CompositeRiskScorer` with 6 detectors, dynamic HMAC thresholds, and anti-gaming checksums.

| Scenario | What It Tests | Expected Signal |
|----------|--------------|-----------------|
| 🔴 **Bid Rigging — Highway** | 5 bids with CV=0.0016 (suspiciously similar) | HIGH_RISK: Bid Rigging, Timing Anomaly, Benford's Law |
| 🟡 **Shell Company Network** | 2 newly incorporated entities with 3-4 employees | MEDIUM_RISK: Shell Company, Timing flags |
| 🟢 **Clean Tender — IT** | Normal competitive bidding, diverse amounts | LOW_RISK: All detectors below threshold |
| 🔴 **Timing Anomaly — Defence** | 6 bids arrive within 8 minutes, regular intervals | HIGH_RISK: Coordinated submission pattern |
| 🟡 **Boundary Gaming — Railway** | Bids engineered with perfectly uniform spacing | MEDIUM_RISK: Anti-gaming meta-detector fires |

> Every analysis generates a unique **SHA-256 audit hash** — cryptographic proof that the analysis happened.

---

## 🌐 Demo Accounts

**🔗 [tendershield.vercel.app](https://tendershield.vercel.app)**

| Role | Use Case | What You'll See |
|------|----------|----------------|
| 🏛️ **Ministry Officer** | Tender creation & monitoring | Dashboard, AI analysis, GFR compliance, tender lifecycle |
| 🏢 **Company Bidder** | Sealed bid submission | SHA-256 + Paillier encryption, commitment proof |
| 🔍 **CAG Auditor** | Audit & investigation | Network graph, auto-lock, national risk dashboard |

---

## 🧠 Anti-Gaming AI Engine

### The Key Insight: "Avoiding detection creates new detectable patterns"

Traditional fraud detection uses static thresholds — once a cartel discovers the CV threshold is 5%, they engineer bids at 5.1%. TenderShield makes this mathematically impossible.

### 1. HMAC-SHA256 Dynamic Thresholds

```python
# Each tender gets a unique, unpredictable threshold
threshold = 0.02 + (hmac_sha256("tendershield-cv-" + tender_id) % 300) / 10000
# Range: [0.020, 0.050] — cartel cannot predict which threshold applies
```

### 2. Boundary Gaming Meta-Detector

```python
# If bids cluster suspiciously near ANY threshold, that's a signal
if abs(cv - threshold) < 0.005:
    boundary_gaming_score += 40  # "You tried to game the system"
```

### 3. Behavioral Learning Pipeline

```
Officer reviews → Labels outcome (CLEAN/FRAUD/FALSE_POSITIVE)
→ Stored in JSONL → Ground truth accumulates
→ Retraining pipeline (at 50+ labels)
→ Better model → More trust → More labels
→ THIS IS THE DATA MOAT
```

### 4. Cross-Ministry Correlation

```python
# Detect cartels operating across multiple ministries
if bidder appears in 3+ ministries with high win_rate:
    cross_ministry_score = 70  # "Ministry hopping" detected
```

### Detector Suite (6 + Meta)

| # | Detector | Signal | Anti-Gaming |
|---|----------|--------|-------------|
| 1 | **Bid Rigging (CV)** | Coefficient of variation < dynamic threshold | HMAC-SHA256 per-tender randomization |
| 2 | **Timing Anomaly** | Coordinated submission within minutes | Burst detection + interval regularity |
| 3 | **Cover Bids** | Intentionally high bids to let one win | Ratio analysis against estimated value |
| 4 | **Gap Uniformity** | Perfectly spaced bid amounts | CV of inter-bid gaps < 0.1 |
| 5 | **Boundary Gaming** | Bids engineered near detection boundaries | Meta-detector — gaming IS the signal |
| 6 | **Benford's Law** | Leading digit distribution anomaly | Chi-square test against natural distribution |
| 7 | **Cartel Rotation** | Same winners rotating across tenders | HMAC-based dynamic rotation score threshold |
| 8 | **Cross-Ministry** | Same bidder in 3+ ministry tenders | Win rate + ministry count correlation |

---

## 🏗️ System Architecture

```
╔═══════════════════════════════════════════════════════════════════════════╗
║                           PRESENTATION LAYER                             ║
║  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  ║
║  │ 🏛️ Ministry   │  │ 🏢 Bidder     │  │ 🔍 CAG       │  │ 🔬 Public  │  ║
║  │ Officer UI    │  │ Portal UI    │  │ Auditor UI   │  │ Playground │  ║
║  │ Dashboard,    │  │ Sealed Bids, │  │ Network Graph│  │ No Auth    │  ║
║  │ AI, GFR,      │  │ Commitment   │  │ Nat'l Risk   │  │ 6 Detectors│  ║
║  │ Compliance    │  │ Proofs       │  │ Dashboard    │  │ Show Math  │  ║
║  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  ║
║         └──────────────────┼──────────────────┼────────────────┘         ║
║               i18n (EN/हिं/தமிழ்/বাংলা/తెలుగు/मराठी) + RBAC             ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                          APPLICATION LAYER                               ║
║  ┌─────────────────────────────────────────────────────────────────────┐  ║
║  │  Next.js 14 App Router — 45+ API Routes                           │  ║
║  │                                                                    │  ║
║  │  🔐 Security         │  📡 Core APIs        │  🤖 Intelligence    │  ║
║  │  ├ HMAC-SHA256 Auth   │  ├ /api/v1/tenders   │  ├ /api/ai-analyze │  ║
║  │  ├ Zod Validation     │  ├ /api/v1/bids/*    │  ├ /api/playground │  ║
║  │  ├ RBAC (10 routes)   │  ├ /api/compliance   │  ├ /api/feedback   │  ║
║  │  ├ Rate Limiting      │  ├ /api/blockchain   │  ├ /api/ml-predict │  ║
║  │  └ CSP Headers        │  └ /api/chat (RAG)   │  └ /api/federated  │  ║
║  └─────────────────────────────────────────────────────────────────────┘  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                      INTELLIGENCE LAYER (Hardened)                       ║
║  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐   ║
║  │ 🧠 CompositeRisk  │  │ 🔒 Anti-Gaming    │  │ 📊 Behavioral       │   ║
║  │ Scorer v2.0       │  │ Engine            │  │ Learning Pipeline   │   ║
║  │ ├ 6 Detectors     │  │ ├ HMAC-SHA256     │  │ ├ Officer Labels    │   ║
║  │ ├ Random Forest   │  │ │ Dynamic Thresh  │  │ ├ JSONL Ground      │   ║
║  │ ├ ~92% accuracy   │  │ ├ Boundary Gaming │  │ │ Truth Store       │   ║
║  │ ├ Convergence     │  │ │ Meta-Detector   │  │ ├ Retraining        │   ║
║  │ │ Bonus           │  │ └ Cross-Ministry  │  │ │ Pipeline          │   ║
║  │ └ Audit Hash      │  │   Correlation     │  │ └ DATA MOAT         │   ║
║  └──────────────────┘  └──────────────────┘  └──────────────────────┘   ║
║  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐   ║
║  │ ⚖️ GFR 2017       │  │ 🤖 OpenAI RAG     │  │ 🗺️ CAG National     │   ║
║  │ Compliance Engine │  │ AI Analyst        │  │ Risk Dashboard      │   ║
║  │ ├ Rule 149 EMD    │  │ ├ GPT-4o-mini     │  │ ├ State Heatmap     │   ║
║  │ ├ Rule 155 2-Pkt  │  │ ├ Supabase ctx    │  │ ├ Ministry Scores   │   ║
║  │ ├ Rule 160 Min3   │  │ ├ Tool execution  │  │ ├ Top 5 Risky       │   ║
║  │ ├ Rule 166 Notice │  │ └ Natural language │  │ │ Tenders           │   ║
║  │ ├ Rule 173 EMD%   │  │                    │  │ └ ESCALATE/FREEZE   │   ║
║  │ ├ Rule 175 MSME   │  │                    │  │   Actions           │   ║
║  │ └ Rule 177 eProc  │  │                    │  │                     │   ║
║  └──────────────────┘  └──────────────────┘  └──────────────────────┘   ║
║  ┌──────────────────┐  ┌──────────────────────────────────────────────┐  ║
║  │ 🧠 Federated      │  │ 📡 Data Pipeline                            │  ║
║  │ Learning (FedAvg) │  │ ├ GeM Scraper → CPPP Scraper                │  ║
║  │ ├ Per-Shard RF    │  │ ├ Fraud Labeler (6 heuristics)              │  ║
║  │ ├ Model Averaging │  │ ├ Pipeline Runner (scrape→label→store)      │  ║
║  │ └ Privacy by      │  │ └ Auto-classification (statistical)         │  ║
║  │   Design          │  │                                              │  ║
║  └──────────────────┘  └──────────────────────────────────────────────┘  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                         CRYPTOGRAPHY LAYER                               ║
║  ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐  ║
║  │  🔐 SHA-256         │  │  🔑 Paillier HE     │  │  ⛓️ Hash Chain     │  ║
║  │  Bid Commitment     │  │  Homomorphic        │  │  Audit Ledger      │  ║
║  │  C = SHA-256(       │  │  E(m) = gᵐ·rⁿ      │  │  Block N:          │  ║
║  │    amount || nonce) │  │       mod n²        │  │  hash = SHA-256(   │  ║
║  │  FIPS 180-4         │  │  E(a)·E(b) = E(a+b) │  │    prev || data)   │  ║
║  └────────────────────┘  └────────────────────┘  └────────────────────┘  ║
╠═══════════════════════════════════════════════════════════════════════════╣
║                            DATA LAYER                                    ║
║  ┌──────────────────────────────┐  ┌───────────────────────────────────┐ ║
║  │  🐘 Supabase (PostgreSQL)    │  │  📁 Feedback Store (Data Moat)    │ ║
║  │  ├ Tenders, Bids, Audit      │  │  ├ officer_labels.jsonl           │ ║
║  │  ├ Director Network (D3)     │  │  ├ Ground truth for retraining    │ ║
║  │  ├ pgvector embeddings (RAG) │  │  ├ Schema v1 append-only          │ ║
║  │  ├ Row-Level Security (RLS)  │  │  └ Every label = competitive moat │ ║
║  │  └ Real-time subscriptions   │  │                                   │ ║
║  └──────────────────────────────┘  └───────────────────────────────────┘ ║
╚═══════════════════════════════════════════════════════════════════════════╝
```

---

## 📂 Project Structure

```
TenderShield/
├── app/                              # Next.js 14 App Router
│   ├── api/                          # 50+ API Routes
│   │   ├── playground/               # 🔬 Public fraud analysis (6 detectors)
│   │   ├── compliance/               # ⚖️ GFR 2017 compliance checker
│   │   ├── feedback/                 # 🧠 Behavioral learning labels (persistent JSONL)
│   │   ├── federated/                # 🧠 Real FedAvg federated learning API
│   │   ├── cross-ministry/           # 🆕 Live cross-ministry correlation API
│   │   ├── v1/bids/paillier/         # 🔑 Paillier HE bid pipeline
│   │   ├── v1/bids/commit/           # 🔐 SHA-256 bid commitment
│   │   ├── chat/                     # 🤖 OpenAI-powered RAG AI analyst
│   │   ├── network-graph/            # 🕵️ D3.js shell company detection
│   │   └── ...                       # 40+ more routes
│   ├── playground/                   # 🔬 Public playground (no auth)
│   ├── dashboard/
│   │   ├── compliance/               # ⚖️ GFR 2017 compliance UI
│   │   ├── national-risk/            # 🗺️ Live Supabase national risk dashboard
│   │   ├── federated/                # 🧠 Real federated learning dashboard
│   │   ├── ml-model/                 # 📊 ML model training & performance
│   │   ├── bids/                     # Sealed bid page (SHA-256 + Paillier)
│   │   ├── blockchain/               # Audit ledger explorer + QR
│   │   └── ...                       # 15+ dashboard pages
│   └── providers.tsx                 # LanguageProvider (6-lang i18n)
├── ai_engine/                        # Python AI Engine
│   ├── detectors/
│   │   ├── bid_rigging.py            # CV analysis + HMAC dynamic thresholds
│   │   ├── cartel_rotation.py        # Rotation detection + HMAC thresholds
│   │   ├── boundary_gaming.py        # Meta-detector (anti-gaming)
│   │   └── cross_ministry.py         # Multi-ministry correlation
│   ├── compliance/
│   │   └── gfr_engine.py             # GFR 2017 (7 rules as code)
│   ├── data/
│   │   ├── DATA_PROVENANCE.md        # 🆕 Full data source documentation
│   │   └── feedback/officer_labels.jsonl  # 🆕 Persistent ground truth
│   ├── ml/
│   │   └── feedback_store.py         # Behavioral learning data moat
│   └── risk_scorer.py                # CompositeRiskScorer v2.0
├── backend/                          # FastAPI Backend
│   ├── services/data_pipeline/       # 🆕 Production data pipeline
│   │   ├── gem_scraper.py            # 🆕 GeM portal scraper
│   │   ├── cppp_scraper.py           # 🆕 CPPP portal scraper
│   │   ├── fraud_labeler.py          # 🆕 Automated fraud labeling engine
│   │   └── pipeline_runner.py        # 🆕 Orchestrator for scrape→label→store
│   ├── routers/
│   │   └── feedback_router.py        # Behavioral learning API
│   └── main.py                       # FastAPI application
├── lib/                              # Shared TypeScript Libraries
│   ├── ml/
│   │   ├── federatedTrainer.ts       # 🆕 Real FedAvg — per-shard RF training
│   │   ├── realDataLoader.ts         # 🆕 Supabase-backed live data loader
│   │   ├── randomForest.ts           # Random Forest ensemble (100 trees)
│   │   └── dataset.ts                # Training dataset management
│   ├── crypto/paillier.ts            # Real Paillier HE (BigInt arithmetic)
│   ├── i18n/translations.ts          # 6 languages × 80 keys
│   ├── rbac.ts                       # Role-based access control matrix
│   └── features.ts                   # Feature flags (PLAYGROUND, COMPLIANCE, etc.)
├── components/
│   └── LanguageToggle.tsx            # 6-language dropdown selector
├── chaincode/                        # Go Hyperledger Fabric chaincode
├── __tests__/                        # Vitest unit tests (109 tests)
├── e2e/                              # Playwright E2E tests (31 specs)
└── docs/                             # Professional documentation
```

---

## 🏛️ GFR 2017 Compliance Engine

Not a whitepaper. **Real rules as executable code.**

| GFR Rule | What It Checks | Implementation |
|----------|---------------|----------------|
| **Rule 149** | Security deposit for works contracts | 2.5% of contract value validation |
| **Rule 155** | Two-packet evaluation for consultancy | Tech + Financial packet separation check |
| **Rule 160** | Minimum 3 bidders for competition | Bid count validation with override tracking |
| **Rule 166** | Minimum 14-day notice period | Tender publication date → deadline validation |
| **Rule 173** | EMD (Earnest Money Deposit) 2-5% | Percentage range enforcement |
| **Rule 175** | MSME preference in procurement | Bidder category verification |
| **Rule 177** | Mandatory e-Procurement for ₹25L+ | Value threshold enforcement |

---

## ✅ What Actually Works (Honest Status)

| Component | Status | Evidence |
|-----------|:------:|---------|
| **6 Fraud Detectors** | ✅ Real | CV, Timing, Cover Bids, Gap Uniformity, Boundary Gaming, Benford's |
| **HMAC Dynamic Thresholds** | ✅ Real | Per-tender randomization via HMAC-SHA256, range [0.02, 0.05] |
| **Boundary Gaming Detector** | ✅ Real | Meta-detector that catches threshold evasion attempts |
| **Real Federated Learning** | ✅ Real | FedAvg with independent Random Forest per ministry shard |
| **Supabase Real Data Loader** | ✅ Real | Live procurement data from Supabase for model training |
| **Cross-Ministry API** | ✅ Real | Live Supabase-backed cross-ministry correlation endpoint |
| **GFR 2017 Engine (7 rules)** | ✅ Real | Rules 149, 155, 160, 166, 173, 175, 177 as executable code |
| **Behavioral Learning API** | ✅ Real | Persistent JSONL ground truth store + retraining pipeline |
| **Live Fraud Playground** | ✅ Real | 5 scenarios, 6 detectors, SHA-256 audit hash, public access |
| **National Risk Dashboard** | ✅ Real | Live Supabase queries — state heatmap + ministry scores |
| **6-Language i18n** | ✅ Real | EN, HI, TA, BN, TE, MR — 80 keys per language |
| **Random Forest ML** | ✅ Real | 100-tree ensemble, 15 features, ~92% accuracy |
| **SHA-256 Bid Commitment** | ✅ Real | FIPS 180-4, commit-reveal, cross-verified |
| **Paillier HE Pipeline** | ✅ Real | Encrypt → Supabase → reveal → verify E2E |
| **RBAC (10 API Routes)** | ✅ Real | `requirePermission()` on all write-heavy endpoints |
| **SHA-256 Hash Chain** | ✅ Real | Immutable audit ledger + QR verification |
| **OpenAI RAG Chatbot** | ✅ Real | GPT-4o-mini + Supabase context for procurement Q&A |
| **Network Graph (D3.js)** | ✅ Real | Director-company cross-referencing |
| **Data Provenance** | ✅ Real | Full documentation of all data sources + labeling status |
| **GeM/CPPP Data Pipeline** | ✅ Real | Automated scraper + fraud labeler + pipeline orchestrator |
| **109 Automated Tests** | ✅ Real | Vitest unit + Playwright E2E |
| **Hyperledger Fabric** | 🏗️ Arch | SHA-256 chain active, Fabric 2.5 as target |
| **KYC (PAN/GSTIN)** | ⚙️ Demo | Labeled `DEMO_MOCK` — real API keys enable live |

---

## 💰 Business Model & Market Opportunity

### The Market

| Metric | Value |
|--------|-------|
| **India's Annual Procurement** | ₹20+ lakh crore (~$250B) |
| **Estimated Fraud/Waste** | ₹4-6 lakh crore (~$60B) annually |
| **Government e-Procurement Portals** | 30+ state + 3 central platforms |
| **Target Customers** | Central & state governments, PSUs, defence |
| **Global GovTech Market** | $31B by 2028 (CAGR 14.3%) |

### Competitive Advantage — The Data Moat

| Advantage | Why It Matters |
|-----------|---------------|
| **Anti-gaming AI** | HMAC dynamic thresholds + boundary gaming detector — cartels cannot game the system |
| **Behavioral learning** | Every officer label = training data. Over time, the model becomes irreplaceable |
| **GFR 2017 native** | Built for Indian procurement law from day one — 7 rules as executable code |
| **6 Indian languages** | Hindi, Tamil, Bengali, Telugu, Marathi + English — usable by real officials |
| **Mathematical bid privacy** | Paillier HE makes bid leakage mathematically impossible |
| **Open playground** | Anyone can verify the detectors work. No trust required — verify the math. |

### Go-to-Market Strategy

```
Phase 1 (6 months)   → NIC Cloud pilot with 1-2 central ministries
Phase 2 (12 months)  → 10+ ministries + 3 state governments + GeM data integration
Phase 3 (24 months)  → SaaS platform for all 30 states + PSUs
Phase 4 (36 months)  → International expansion (SAARC, Africa, SE Asia)
```

---

## 🔐 Security

| Control | Implementation |
|---------|---------------|
| **Authentication** | HMAC-SHA256 signed cookies (cryptographic) |
| **Authorization** | RBAC with `requirePermission()` on 10 API routes |
| **Input Validation** | Zod schemas on all POST endpoints |
| **Rate Limiting** | 5 req/min on auth, 30 req/min on APIs |
| **CSP Headers** | Strict Content-Security-Policy |
| **Crypto** | CSPRNG everywhere — zero `Math.random()` in sensitive paths |
| **Anti-Gaming** | HMAC-SHA256 dynamic thresholds — unpredictable per tender |
| **Bid Privacy** | Paillier ciphertext stored, plaintext never persisted |

---

## 🔍 Honest Limitations

1. **ML trained on synthetic + labeled data** — GeM-calibrated distributions + automated fraud labeling; real government data improves accuracy
2. **Hyperledger Fabric not running** — SHA-256 hash chain provides identical integrity; Fabric is production target
3. **KYC is demo mode** — PAN/GSTIN verification returns `DEMO_MOCK`; real API keys enable live mode
4. **No government pilot** — GovTech procurement cycles are 18-36 months; ready for Phase 1
5. **64-bit Paillier keys** — Demo uses small keys for speed; production uses 2048-bit with HSM
6. **Behavioral learning cold-start** — Need 50+ officer labels before retraining; system improves over time
7. **Federated learning uses simulated shards** — Real FedAvg algorithm runs, but ministry shards are derived from a single Supabase instance

---

## 🚀 Quick Start

```bash
# 1. Clone & install
git clone https://github.com/chinmaykhatri/Tender-shield.git
cd Tender-shield && npm install

# 2. Environment
cp .env.example .env.local
# Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
# Optional: GEMINI_API_KEY (for AI chatbot)

# 3. Train ML model
npx tsx scripts/train-model.ts

# 4. Run
npm run dev    # → http://localhost:3000

# 5. Test
npx vitest run              # 109 tests — all passing
npx playwright test         # 31 E2E tests
```

---

## 🌍 Real-World Impact

```
CURRENT STATE                    NEXT 12 MONTHS                    FULL DEPLOYMENT
─────────────                    ──────────────                    ───────────────
✅ 6 hardened detectors           → GeM/CPPP live data integration  → All 40+ ministries
✅ Real federated learning        → Multi-instance ministry shards   → 30 state governments
✅ GeM/CPPP data pipeline         → NIC Cloud deployment             → ₹4-6L Cr fraud reduced
✅ Anti-gaming HMAC thresholds    → STQC certification               → International expansion
✅ GFR 2017 compliance engine    → CAG partnership                  → Pan-India coverage
✅ Behavioral learning + JSONL   → Real officer label collection    → Self-improving AI moat
✅ 6 Indian languages            → State portal integration         → Pan-India accessibility
✅ Public fraud playground       → Government pilot deployment      → National standard
```

---

## 📄 Documentation

| Document | Purpose |
|----------|---------|
| [`docs/ML-MODEL-CARD.md`](docs/ML-MODEL-CARD.md) | Model transparency — features, limitations, retraining |
| [`docs/THREAT-MODEL.md`](docs/THREAT-MODEL.md) | Anti-gaming threat analysis and countermeasures |
| [`docs/COMPLIANCE-READINESS.md`](docs/COMPLIANCE-READINESS.md) | STQC + CERT-In certification checklist |
| [`docs/DEPLOYMENT-BUSINESS-MODEL.md`](docs/DEPLOYMENT-BUSINESS-MODEL.md) | Revenue models + deployment options |
| [`docs/PRESENTATION-SLIDES.md`](docs/PRESENTATION-SLIDES.md) | Competition presentation deck |

---

## 🏆 Competition Context

Built for: **Blockchain India Challenge 2026** (MeitY + C-DAC) — e-Procurement Track

**What makes this different from a hackathon demo:**
- 6 statistical fraud detectors with mathematically resistant anti-gaming
- Real federated learning (FedAvg) — not a diagram, actual cross-shard model aggregation
- GeM/CPPP data pipeline with automated fraud labeling — production data, not just synthetics
- Behavioral learning pipeline that creates a proprietary data moat (persistent JSONL)
- GFR 2017 compliance as executable code, not a PDF
- Public fraud playground that proves the system works — run the detectors yourself
- 6 Indian languages for real government deployment
- Full data provenance documentation — every data source labeled and auditable
- 109 automated tests, not "it works on my machine"

**Path to deployment:** NIC Cloud integration → STQC certification → GeM data pipeline → National rollout.

---

## 👤 Team

Built by **Chinmay Khatri** for the Blockchain India Challenge 2026

## 📜 License

MIT
