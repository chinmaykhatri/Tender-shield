# 🛡️ TenderShield — AI-Powered Blockchain Procurement Integrity Platform

> **India's first AI + Blockchain system that detects, prevents, and prosecutes government procurement fraud in real-time.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://typescriptlang.org/)
[![Hyperledger Fabric](https://img.shields.io/badge/Hyperledger-Fabric%202.5-2F3134?logo=hyperledger)](https://hyperledger.org/use/fabric)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)](https://supabase.com/)
[![Claude AI](https://img.shields.io/badge/Claude-Constitutional%20AI-D97757?logo=anthropic)](https://anthropic.com/)

---

## 🇮🇳 The Problem

India loses an estimated **₹5,00,000 Crore annually** to procurement fraud — bid rigging, shell companies, timing collusion, and front-running. Traditional audit catches fraud **months or years later**. By then, public money is gone.

## 💡 The Solution

TenderShield uses **5 parallel AI fraud detectors** running on a **Hyperledger Fabric blockchain** to catch procurement fraud **in real-time** — before a single rupee is spent. When risk exceeds 75/100, tenders are **automatically frozen** and auditors are notified within seconds.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 14)                    │
│  Dashboard │ Fraud Demo │ Blockchain Explorer │ Heatmap │ RTI   │
│  Cartel Graph │ ZKP Verifier │ Impact Dashboard │ CAG Cases     │
├─────────────────────────────────────────────────────────────────┤
│                     API LAYER (Next.js API Routes)              │
│  /api/demo/analyze │ /api/cartel-graph │ /api/rti/generate      │
│  /api/verify/gem │ /api/evidence/certificate │ /api/cag/parse   │
│  /api/impact/stats │ /api/heatmap/data │ /api/audit/timeline    │
│  /api/blockchain/blocks │ /api/reports/generate                 │
├─────────────────────────────────────────────────────────────────┤
│              AI ENGINE (Claude Constitutional AI)               │
│  Bid Rigging │ Shell Company │ Timing │ Front-Running │ GeM     │
│  Claude Constitution: cannot help circumvent fraud detection    │
├─────────────────────────────────────────────────────────────────┤
│             BLOCKCHAIN (Hyperledger Fabric 2.5)                 │
│  4-org Raft consensus │ Immutable audit trail │ ZKP commitments │
├─────────────────────────────────────────────────────────────────┤
│              DATABASE (Supabase + PostgreSQL)                   │
│  Tenders │ Bids │ AI Alerts │ User Verification │ Audit Logs    │
│  RTI Applications │ CAG Cases │ Trust Scores │ Officer Ledger   │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✨ Features (28 Total)

### 🔍 Core AI Detection (5 Detectors)

| Detector | What It Catches | Method |
|----------|----------------|--------|
| **Bid Rigging** | Coordinated bid amounts | Coefficient of Variation analysis — CV < 3% = suspicious |
| **Shell Company** | Fake companies created for fraud | GSTIN age, director overlap, MCA verification |
| **Timing Collusion** | Coordinated bid submission | Submission timestamp clustering analysis |
| **Front-Running** | Insider knowledge of budget | Bid-to-estimate accuracy > 95% = suspicious |
| **GeM Price Anomaly** | Overpriced items | Comparison against Government e-Marketplace catalog |

### 📊 Visual Features (10)

| # | Feature | URL | Highlights |
|---|---------|-----|-----------|
| 1 | **Live Impact Dashboard** | `/impact` | Animated ₹238.5 Cr counter, live feed, scam comparison |
| 2 | **Interactive Fraud Demo** | `/demo` | 4 preset scenarios, terminal streaming, risk gauge |
| 3 | **Visual Blockchain Explorer** | `/blockchain` | Block chain visualization, TX details, hash verifier |
| 4 | **India Corruption Heatmap** | `/heatmap` | TreeMap by state, ministry breakdown, risk filters |
| 5 | **WhatsApp Alert Simulator** | Component | Phone mockup, typing animation, notification sound |
| 6 | **ZKP Live Proof** | `/verify/zkp` | 4-step visual + live Web Crypto commitment demo |
| 7 | **Audit Trail Timeline** | Component | Vertical timeline, risk chart, blockchain TX links |
| 8 | **AI Explainability Panel** | Component | SVG visuals, plain English, statistical evidence |
| 9 | **Auto Compliance Report** | `/api/reports/generate/[id]` | Full HTML → PDF report for CAG auditors |
| 10 | **Hindi/English Toggle** | Global | 70+ translation keys in both languages |

### 🚀 Advanced Deployment Features (5)

| # | Feature | URL | Why It's Unique |
|---|---------|-----|------------------|
| 1 | **RTI Auto-Filing Portal** | `/rti` | One-click legally-correct RTI letter under RTI Act 2005 |
| 2 | **Multi-Tender Cartel Graph** | `/ai-monitor/cartel-graph` | Force-directed network detecting cross-ministry cartels |
| 3 | **Court-Admissible Evidence** | `/api/evidence/certificate/[id]` | Section 65B (Indian Evidence Act) certificate |
| 4 | **GeM Integration** | Component | Seller verification + price comparison vs gem.gov.in |
| 5 | **CAG Report Parser** | `/auditor/cag-cases` | 10 real CAG fraud cases + AI pattern matching |

### 🔒 Enforcement Features (8)

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Auto-Lock Enforcement** | Tenders auto-frozen when risk > 75/100 |
| 2 | **Officer Risk Ledger** | Track officer involvement across flagged tenders |
| 3 | **Public Transparency Portal** | Citizens can view tender status and risk scores |
| 4 | **Trust Score Economy** | Companies earn trust through clean bidding history |
| 5 | **Whistleblower Engine** | Anonymous encrypted reporting with blockchain proof |
| 6 | **Adaptive AI Thresholds** | Self-adjusting risk thresholds based on sector data |
| 7 | **Policy Embedding** | GFR rules encoded into smart contract logic |
| 8 | **Financial Trail Integration** | Follow-the-money analysis of payment chains |

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS | Server-rendered React with API routes |
| **AI Engine** | Claude Constitutional AI (Anthropic) | Fraud detection with ethical safety constraints |
| **Blockchain** | Hyperledger Fabric 2.5 | Immutable audit trail with 4-org Raft consensus |
| **Database** | Supabase (PostgreSQL) + Row Level Security | Multi-role data access with real-time subscriptions |
| **Auth** | Supabase Auth + Aadhaar + Access Codes | Government-grade identity verification |
| **Deployment** | Vercel (Frontend) + Docker (Backend) | Production-ready with CI/CD |
| **Security** | Constitutional AI + Rate Limiting + CSRF | Cannot be manipulated to assist fraud |

---

## 🔐 Security Architecture

- **Constitutional AI**: Claude is bound by a constitution — it cannot help users circumvent fraud detection
- **Misuse Logging**: All attempts to manipulate the AI are logged to blockchain
- **Row Level Security**: Supabase RLS ensures role-based data isolation
- **ZKP Bid Commitments**: SHA-256 cryptographic commitments hide bid amounts until deadline
- **Rate Limiting**: API-level protection against abuse
- **Aadhaar Verification**: Government-grade identity verification for officers

---

## 🇮🇳 India-Specific Legal Compliance

| Law | How TenderShield Complies |
|-----|--------------------------|
| **RTI Act 2005** | Auto-generates RTI applications for citizens |
| **Indian Evidence Act, Section 65B** | Court-admissible digital evidence certificates |
| **GFR 149, 166, 173, 175** | Auto-checks against General Financial Rules |
| **Prevention of Corruption Act** | Evidence packages prepared for prosecution |
| **IT Act 2000** | Electronic records meet Section 65B requirements |
| **CVC Guidelines** | Alerts routed to Central Vigilance Commission |

---

## 📁 Project Structure

```
TenderShield/
├── app/
│   ├── api/
│   │   ├── demo/analyze/          # Interactive fraud demo
│   │   ├── impact/stats/          # Impact dashboard data
│   │   ├── blockchain/blocks/     # Blockchain explorer data
│   │   ├── heatmap/data/          # India heatmap data
│   │   ├── audit/timeline/[id]/   # Audit trail events
│   │   ├── reports/generate/[id]/ # PDF compliance reports
│   │   ├── rti/generate/          # RTI letter generator
│   │   ├── cartel-graph/          # Cartel network data
│   │   ├── evidence/certificate/  # Section 65B certificates
│   │   ├── verify/gem/            # GeM seller verification
│   │   ├── gem/price-check/       # GeM price comparison
│   │   ├── cag/parse-report/      # CAG report parser
│   │   └── ...                    # Auth, tenders, bids, etc.
│   ├── dashboard/                 # Main dashboard
│   ├── demo/                      # Interactive fraud demo
│   ├── impact/                    # Impact dashboard
│   ├── blockchain/                # Blockchain explorer
│   ├── heatmap/                   # India risk heatmap
│   ├── verify/zkp/                # ZKP live proof
│   ├── rti/                       # RTI auto-filing portal
│   ├── ai-monitor/cartel-graph/   # Cartel detection graph
│   ├── auditor/cag-cases/         # CAG cases database
│   └── globals.css                # Design system
├── components/
│   ├── WhatsAppSimulator.tsx      # WhatsApp alert mockup
│   ├── AuditTimeline.tsx          # Vertical audit timeline
│   ├── AIExplainabilityPanel.tsx   # AI explanation cards
│   ├── ReportDownload.tsx         # PDF report downloader
│   ├── CourtEvidencePackage.tsx   # Section 65B package
│   ├── GemVerification.tsx        # GeM verification UI
│   └── LanguageToggle.tsx         # Hindi/English switch
├── lib/
│   ├── cag/historicalCases.ts     # 10 real CAG fraud cases
│   ├── i18n/translations.ts      # Bilingual translations
│   └── supabase/                  # Database client
├── backend/                       # FastAPI backend
├── ai_engine/                     # AI analysis engine
└── supabase/                      # Database migrations
```

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# Optional: ANTHROPIC_API_KEY (enhances AI analysis)

# Run development server
npm run dev

# Visit: http://localhost:3000
```

### Demo Mode

Set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local` — all features work with realistic mock data, zero API keys required.

---

## 🎯 Key URLs

| Page | URL | Access |
|------|-----|--------|
| Dashboard | `/dashboard` | Login required |
| Impact Dashboard | `/impact` | Public |
| Fraud Demo | `/demo` | Public |
| Blockchain Explorer | `/blockchain` | Public |
| India Heatmap | `/heatmap` | Public |
| ZKP Verification | `/verify/zkp` | Public |
| RTI Portal | `/rti` | Public (any citizen) |
| Cartel Graph | `/ai-monitor/cartel-graph` | Auditor / Admin |
| CAG Cases | `/auditor/cag-cases` | Auditor / Admin |

---

## 📊 12 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/impact/stats` | GET | Impact dashboard statistics |
| `/api/demo/analyze` | POST | Interactive fraud analysis |
| `/api/blockchain/blocks` | GET | Blockchain explorer data |
| `/api/heatmap/data` | GET | State-wise risk data |
| `/api/audit/timeline/[id]` | GET | Audit trail events |
| `/api/reports/generate/[id]` | GET | HTML compliance report |
| `/api/rti/generate` | POST | RTI letter generator |
| `/api/cartel-graph` | GET | Cartel network graph data |
| `/api/evidence/certificate/[id]` | GET | Section 65B certificate |
| `/api/verify/gem` | POST | GeM seller verification |
| `/api/gem/price-check` | POST | GeM price comparison |
| `/api/cag/parse-report` | GET/POST | CAG cases + pattern matching |

---

## 🏆 Competition Pitch Flow

```
"India's CAG has documented procurement fraud since 1858."
→ Show CAG Cases Database (10 verified patterns)

"TenderShield learned from those patterns."
→ Show AI Analysis with real-time detection

"We don't just detect — we trace networks."
→ Show Multi-Tender Cartel Graph

"We generate court-admissible evidence."
→ Show Section 65B Certificate

"We validate against government market prices."
→ Show GeM Price Comparison

"And we give every citizen the power to demand answers."
→ Show RTI Auto-Filing Portal

"From 166 years of CAG audits to real-time AI —
 TenderShield is India's procurement future."
```

---

## 👥 Roles

| Role | Access Level |
|------|-------------|
| `BIDDER` | Submit bids, view own tenders |
| `MINISTRY_OFFICER` | Create tenders, view bids |
| `CAG_AUDITOR` | Full read access, evidence packages, RTI |
| `NIC_ADMIN` | Full system access, AI configuration |

---

## 📝 License

Built for the **Blockchain India Competition 2025**.

---

<p align="center">
  🛡️ <strong>TenderShield</strong> — Because public money deserves public protection.
</p>
