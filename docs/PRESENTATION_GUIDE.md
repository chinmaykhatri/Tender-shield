# ============================================================================
# TenderShield — Competition Presentation Guide
# ============================================================================
# Blockchain India Competition 2025 — Judging Presentation Script
# ============================================================================

## 🎯 Presentation Flow (15 Minutes)

### Opening (2 min)
- "TenderShield is India's first AI-secured, blockchain-based government procurement system"
- Problem statement: ₹80,000 Crore annual procurement fraud in India
- Solution: SHA-256 sealed bidding + AI fraud detection + immutable audit trail

### Live Demo (8 min)

#### Step 1: Login as Officer
```
Email: officer@morth.gov.in
Password: Tender@2025
```
- Show Dashboard with real-time stats
- Highlight ₹655 Crore total procurement value
- Point out AI-flagged tender (MoH medical equipment)

#### Step 2: Create a Tender
- Click "Create Tender" (if you built the form, otherwise show Swagger)
- Show GFR Rule 149 compliance check
- Ministry code: MoRTH, Value: ₹250 Crore

#### Step 3: Sealed Bid Demo
- Login as Bidder: `medtech@medtechsolutions.com` / `Bid@2025`
- Navigate to Sealed Bids page
- Generate commitment for ₹240 Crore
- Show encrypted hash — "Nobody can see the amount"
- Explain Phase 1 → Phase 2 → Phase 3

#### Step 4: AI Fraud Detection
- Navigate to AI Alerts page
- Click "Bid Rigging" scenario
- Show risk score jumping to 62 (FREEZE)
- Show detected flags: LOW_BID_VARIANCE, BURST_SUBMISSION
- Click "Shell Company" — score hits 80 (ESCALATE_CAG)

#### Step 5: Audit Trail
- Navigate to Audit Trail
- Show immutable blockchain log
- "Every action is on Hyperledger Fabric — cannot be tampered"

### Technical Deep Dive (3 min)
- 4-org Hyperledger Fabric network (Ministry, Bidder, Auditor/CAG, NIC)
- 13 chaincode functions in Go
- 5 AI detectors with weighted composite scoring
- SHA-256 hash commitment scheme (sealed bidding)

### Impact & Compliance (2 min)
- GFR 2017 Rules 144/149/153/153A enforced at blockchain level
- CVC bid rigging detection guidelines
- Even a compromised backend can't bypass chaincode rules
- CAG auditors have immutable read access to entire history

---

## 📊 Key Numbers to Mention

| Metric | Value |
|--------|-------|
| Total files | 55+ |
| Chaincode functions | 13 |
| Backend API routes | 22 |
| AI detectors | 5 |
| Frontend pages | 5 |
| Unit tests | 26 |
| Demo users | 7 |
| GFR rules enforced | 4 |

## 🎯 Competition Differentiators

1. **Sealed Bid Commitments** — SHA-256 hash commitments ensure bid secrecy until reveal
2. **5 AI Detectors** — Benford's Law, graph theory, Wald-Wolfowitz runs test
3. **GFR Chaincode** — Compliance rules enforced at consensus level, not API level
4. **India-First** — GSTIN/PAN/Aadhaar validators, IST timestamps, ₹ paise precision
5. **Complete Stack** — Hyperledger + Go + Python + Next.js + TypeScript

## 🔧 Terminal Demo Command
```bash
# Run the full end-to-end demo
python scripts/demo_e2e.py

# Start all services
python scripts/start_servers.py
```

## 🏛️ Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| MoRTH Officer | officer@morth.gov.in | Tender@2025 |
| MoE Officer | officer@moe.gov.in | Tender@2025 |
| Bidder (Genuine) | medtech@medtechsolutions.com | Bid@2025 |
| Bidder (Shell Co) | admin@biomedicorp.com | Bid@2025 |
| Road Builders | infra@roadbuildersltd.com | Bid@2025 |
| CAG Auditor | auditor@cag.gov.in | Audit@2025 |
| NIC Admin | admin@nic.in | Admin@2025 |
