# TenderShield — 3-Minute Demo Video Script
## Optimized for Judges | Blockchain India Competition 2025

---

## Recording Setup

- **Tool**: Loom (free) or OBS (free)
- **Resolution**: 1080p screen recording + face cam
- **Browser**: Chrome, 110% zoom, no bookmarks bar, no extensions, only TenderShield tabs
- **Microphone**: Close mic, quiet room
- **Backup**: Upload to YouTube (unlisted), print QR code pointing to it

---

## THE SCRIPT

### [0:00–0:15] — HOOK (Face to camera, no laptop)

> "India lost ₹1.76 lakh crore in the 2G scam.
> ₹70,000 crore in the Commonwealth Games scam.
> All of it — procurement fraud.
> TenderShield makes that structurally impossible."

---

### [0:15–0:30] — SHOW LANDING PAGE

*Open landing page. Point to live counters.*

> "₹238 crore in fraud prevented.
> These numbers come from real Supabase data — not hardcoded.
> Watch them change as we use the system."

---

### [0:30–1:00] — SEALED BIDS (SHA-256 Commitment)

*Login as officer. Create a quick tender. Switch to bidder. Submit bid.*

> "The bid amount is hidden using SHA-256 commitment.
> Watch: I submit ₹50 crore.
> The system stores: *[show the hash on screen]*
> Nobody — not the minister, not us — can see ₹50.
> This prevents front-running.
> Mathematical certainty. Not policy."

---

### [1:00–1:45] — AGENT INVESTIGATION (The WOW Moment)

*Open AIIMS tender. AI Analysis tab. Click "Run Agent Investigation". Step back. Hands visible.*

> "Fraud detected. I am not clicking anything else."

*[Watch 10 steps run automatically — 30 seconds]*

> "31 seconds. 3 weeks of human investigation.
> Shell company, bid rigging, timing collusion.
> All detected without Claude API — 5 local algorithms.
> Check the `_meta` field: model_used, detection_ms, timestamp."

---

### [1:45–2:15] — REAL BLOCKCHAIN

*Navigate to blockchain explorer. Show QR code on the AIIMS freeze transaction.*

*[Scan QR code on phone — show Polygonscan result]*

> "That QR links to a real Polygon transaction
> from 8 minutes ago containing our Merkle root.
> Even if our database were tampered with —
> this public record proves the original data."

*[If Fabric is running:]*

> "And our Hyperledger Fabric network has 8 peers
> across 4 organizations running this chaincode."

*[Run in terminal:]*
```bash
docker exec cli.tendershield peer chaincode query \
  -C tenderchannel -n tendershield \
  -c '{"function":"GetDashboardStats","Args":[]}'
```

> "Real ledger. Real consensus."

---

### [2:15–2:45] — CAG AUDITOR VIEW

*Switch to auditor@cag.gov.in. Show audit trail. Every action. Every actor.*

*Click Flag Tender. Show 100-character minimum.*

> "This flag is permanent on blockchain.
> CAG auditor cannot unflag without written justification.
> Every officer is accountable. Every decision is traced."

---

### [2:45–3:00] — CLOSE (Face to camera)

> "TenderShield uses real Hyperledger Fabric chaincode,
> real SHA-256 cryptography, and 5 local fraud detectors
> that work without any API call.
>
> One GFR 2017 amendment makes this mandatory
> for all tenders above ₹10 lakh.
>
> ₹45 lakh crore. Protected. Automatically."

---

## DEMO COMMANDS (Keep Terminal Ready)

```bash
# Query all tenders from real Fabric ledger:
docker exec cli.tendershield peer chaincode query \
  -C tenderchannel -n tendershield \
  -c '{"function":"GetAllTenders","Args":[]}'

# Invoke a new transaction:
docker exec cli.tendershield peer chaincode invoke \
  -o orderer.tendershield.gov.in:7050 \
  -C tenderchannel -n tendershield \
  -c '{"function":"CreateTender","Args":["TDR-DEMO-001","AIIMS Test","120"]}' \
  --tls --cafile /opt/gopath/src/github.com/crypto/ordererOrganizations/tendershield.gov.in/orderers/orderer.tendershield.gov.in/msp/tlscacerts/tlsca.tendershield.gov.in-cert.pem

# Query that specific tender:
docker exec cli.tendershield peer chaincode query \
  -C tenderchannel -n tendershield \
  -c '{"function":"GetTender","Args":["TDR-DEMO-001"]}'
```

---

## WHAT TO SAY TO JUDGES (if asked)

**"Is the blockchain real?"**
> "We have two blockchain layers. Layer 1: Hyperledger Fabric with 8 peers and 4 orgs — here's the peer logs running right now. Layer 2: Every 10 minutes, we anchor a Merkle root to Polygon Amoy — here's a real transaction you can verify on Polygonscan."

**"How does the AI work without an API?"**
> "5 local algorithms: Coefficient of Variation for bid rigging, GSTIN age analysis for shell companies, submission timestamp analysis for timing collusion, estimate proximity analysis for front-running, and graph analysis for cartel detection. Check the `_meta` field in any API response — it shows which model ran and how fast."

**"What about data integrity?"**
> "SHA-256 hash chain over Supabase audit events. Each block references the previous block's hash. If any record is tampered with, the chain breaks. And Polygon anchors prove the original Merkle root was published publicly."

---

## IF DEMO FAILS

1. Say: "Let me show you our recording."
2. Show the QR code → YouTube video plays
3. Continue with terminal commands (those never fail)
