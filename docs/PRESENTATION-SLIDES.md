# 🎯 TenderShield — Presentation Slides Content

> **10-minute competition presentation, 15 slides**  
> Format: Each section below = 1 slide

---

## Slide 1: Title

```
🛡️ TENDERSHIELD
━━━━━━━━━━━━━━━━━━━━━
AI-Secured Government Procurement
on Hyperledger Fabric

Blockchain India Challenge 2026
MeitY + C-DAC · e-Procurement Track

Team: [Your Name]
```

---

## Slide 2: The Problem

```
₹4-6 LAKH CRORE LOST ANNUALLY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Shell companies win tenders using fake identities
❌ Bid rigging: Prices within 2% of each other  
❌ Cartel rotation: Same 3 companies win everything
❌ Retroactive alteration of tender documents
❌ Zero accountability — no immutable audit trail

Source: CVC Annual Reports, CAG Audit Findings
```

---

## Slide 3: Our Solution

```
TENDERSHIELD = AI + BLOCKCHAIN + ZKP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧠 AI Fraud Detection    → 5 independent detectors
⛓️ Blockchain            → Immutable audit trail
🔒 Zero-Knowledge Proofs → Sealed bid privacy
⚡ Auto-Enforcement      → High-risk = auto-freeze
📋 GFR 2017 Compliant    → Indian law compliance

Every action = On-chain transaction
Every detection = Auditable AI decision
```

---

## Slide 4: Architecture (Visual)

```
[Show 9-layer architecture diagram]
See: docs/ARCHITECTURE.md

Key Points:
• 4-org Fabric network (Ministry, Bidder, CAG, NIC)
• Dual-channel: TenderChannel + AuditChannel
• Raft consensus (crash-fault tolerant)
• Event streaming via Kafka
```

---

## Slide 5: AI Fraud Engine

```
5 DETECTORS × WEIGHTED SCORING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Shell Company Detection   30%  ← PAN/CIN cross-reference
Bid Rigging Analysis      25%  ← Statistical CV analysis
Cartel Rotation Tracking  20%  ← Win pattern detection
Front-Running Detection   15%  ← Estimate clustering
Timing Collusion          10%  ← Timestamp analysis

RESULT: Composite Risk Score (0-100)
  0-25:  MONITOR
  26-50: FLAG
  51-75: AUTO-FREEZE
  76-100: ESCALATE TO CAG
```

---

## Slide 6: ZKP Implementation

```
REAL PEDERSEN COMMITMENTS (secp256k1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

C = g^v · h^r mod p

• g = secp256k1 generator
• h = independent generator (no known DLP)
• v = bid amount (HIDDEN)
• r = random blinding factor

Verification: Schnorr Protocol + Fiat-Shamir
• Commitment BINDING: Cannot change bid
• Commitment HIDING: Cannot see amount
```

---

## Slide 7: Live Demo — Dashboard

```
[LIVE DEMO]

Show:
1. Landing page with animated counters
2. Login as Ministry Officer
3. Dashboard: 47 tenders, live blockchain feed
4. AIIMS Delhi critical alert (auto-frozen)
```

---

## Slide 8: Live Demo — AI Detection

```
[LIVE DEMO]

Show:
1. Navigate to AI Monitor
2. 5 detector cards with real-time scores
3. Click "Analyze" → Watch AI flag tender
4. Risk score: 94/100
5. Evidence: Shell company cartel detected
6. Auto-freeze triggered
```

---

## Slide 9: Live Demo — Full Lifecycle

```
[LIVE DEMO]

Show:
1. Create a new tender (GFR validated)
2. ZKP bid commitment (Pedersen)
3. Bid reveal (proof verification)
4. Award → Blockchain transaction
5. CAG Auditor sees complete trail
```

---

## Slide 10: CAG Auditor View

```
[LIVE DEMO]

Show:
1. Switch to Auditor role
2. 3 active investigations
3. Flag a suspicious tender
4. Generate compliance report
5. Complete audit trail (every action logged)
```

---

## Slide 11: Go Chaincode

```
13 CHAINCODE FUNCTIONS
━━━━━━━━━━━━━━━━━━━━━

CreateTender     → with GFR compliance check
SubmitBid        → sealed with ZKP commitment
RevealBid        → verify & open
FreezeTender     → AI-triggered auto-freeze
RecordAuditEvent → immutable trail
ValidateGFR      → 6 rules checked
GetHistory       → complete modification log

Endorsement: MinistryOrg AND NICOrg required
```

---

## Slide 12: Security & Compliance

```
STRIDE THREAT MODEL IMPLEMENTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Spoofing    → Aadhaar eKYC + DSC + JWT
✅ Tampering   → Blockchain immutability
✅ Repudiation → On-chain audit trail
✅ Info Leak   → ZKP hides bids
✅ DoS         → Rate limiting + Raft consensus
✅ EoP         → RBAC + MSP identity

GFR 2017: Rules 144, 149, 153, 153A, 154, 166
Aadhaar: §29 compliance (hash-only storage)
```

---

## Slide 13: Engineering Maturity

```
PRODUCTION-READY ENGINEERING
━━━━━━━━━━━━━━━━━━━━━━━━━━━

🧪 9 test suites (vitest)
🔄 CI/CD: 7 GitHub Actions jobs
🐳 Docker containerized
📱 Mobile responsive (phone + tablet)
🎨 3D glassmorphism UI
⚡ Error boundaries + graceful fallbacks
📊 ML model with confusion matrix
🔒 Security audit + secret scanning
```

---

## Slide 14: What Makes Us Different

```
UNIQUE DIFFERENTIATORS
━━━━━━━━━━━━━━━━━━━━━

Most competitors:           TenderShield:
• Single blockchain         • Fabric + AI + ZKP combined
• Simulated ZKP             • Real Pedersen commitments
• No AI                     • 5 detectors + ML model
• No compliance check       • Full GFR 2017 validation
• Desktop only              • Mobile responsive
• No audit trail            • Complete CAG dashboard
• Basic CI                  • 7-job CI/CD pipeline
```

---

## Slide 15: Closing

```
TENDERSHIELD — BECAUSE
PROCUREMENT FRAUD ENDS HERE
━━━━━━━━━━━━━━━━━━━━━━━━━━

🛡️ AI-Secured
⛓️ Blockchain-Immutable
🔒 Zero-Knowledge Privacy
📋 GFR 2017 Compliant
🇮🇳 Made for India

GitHub: [repo link]
Live: [deployment URL]
Contact: [email]

Thank you 🙏
```

---

## Presentation Tips

1. **Time per slide**: ~40 seconds each (15 × 40s = 10 min)
2. **Live demos**: Slides 7-10 are live — have fallback screenshots ready
3. **Backup plan**: If internet fails, demo from localhost
4. **Practice**: Rehearse 3 times with a timer
5. **Questions**: Prepare for "Is this real?" — answer with live Fabric queries
6. **Dress code**: Professional, confident
7. **Opening**: Start with the ₹4-6 lakh crore stat — it grabs attention
