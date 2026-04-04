# 🏛️ TenderShield — System Architecture Document

> **India's First AI-Secured, Blockchain-Based Government Procurement Monitoring System**
> 
> Powered by: Hyperledger Fabric 2.5 | Zero-Knowledge Proofs | AI Fraud Engine | GeM Integration

---

## Project Scope Confirmation

TenderShield addresses India's ₹1.5 lakh crore annual procurement fraud problem by building an immutable, AI-monitored, cryptographically secure tender management system that integrates with existing Indian government infrastructure (GeM, Aadhaar, PFMS, NIC). The system uses Hyperledger Fabric for tamper-proof record keeping, SHA-256 hash commitment ZKPs for bid confidentiality, and a multi-algorithm AI fraud detection engine that continuously monitors blockchain events in real-time. Every action — tender creation, bid submission, evaluation, award, and audit — generates an immutable blockchain transaction, ensuring zero retroactive alteration and complete auditability by CAG.

---

## 9-Layer Architecture Diagram

```
╔══════════════════════════════════════════════════════════════════════════════════════╗
║                          TENDERSHIELD — SYSTEM ARCHITECTURE                         ║
║             India's AI-Secured Blockchain Government Procurement System              ║
╠══════════════════════════════════════════════════════════════════════════════════════╣
║                                                                                      ║
║  ┌─────────────────────────────────────────────────────────────────────────────────┐  ║
║  │                     LAYER 1: USER LAYER (IST Timezone)                         │  ║
║  │                                                                                 │  ║
║  │   🏛️ Government         💼 Bidders/         🔍 CAG              ⚙️ NIC          │  ║
║  │      Officers              Companies           Auditors            Admins        │  ║
║  │   (Ministry Staff)      (GSTIN+PAN          (Comptroller &      (National       │  ║
║  │   (Create Tenders)       Verified)           Auditor General)    Informatics     │  ║
║  │   (Award Contracts)     (Submit Bids)       (Monitor + Audit)    Centre)         │  ║
║  │                         (Sealed Bids)    (Escalate Fraud)    (Infra Admin)   │  ║
║  │                                                                                 │  ║
║  └────────────────┬─────────────┬──────────────┬───────────────┬───────────────────┘  ║
║                   │ HTTPS/TLS   │ HTTPS/TLS    │ HTTPS/TLS     │ HTTPS/TLS            ║
║                   ▼             ▼              ▼               ▼                      ║
║  ┌─────────────────────────────────────────────────────────────────────────────────┐  ║
║  │                   LAYER 2: IDENTITY & AUTHENTICATION LAYER                     │  ║
║  │                                                                                 │  ║
║  │  ┌──────────────┐  ┌───────────────────┐  ┌──────────────────┐                  │  ║
║  │  │ Aadhaar eKYC │  │ Hyperledger       │  │ DSC Verification │                  │  ║
║  │  │ Bridge       │  │ Fabric CA         │  │ (Digital         │                  │  ║
║  │  │              │  │                   │  │  Signature       │                  │  ║
║  │  │ • OTP Verify │  │ • X.509 Certs     │  │  Certificate)    │                  │  ║
║  │  │ • Demographics│  │ • MSP Identity    │  │                  │                  │  ║
║  │  │ • DID Linking│  │ • Enrollment      │  │ • e-Sign API     │                  │  ║
║  │  │              │  │ • Role Attributes  │  │ • CCA Validated  │                  │  ║
║  │  │ UIDAI Sandbox│  │ • TLS Mutual Auth │  │ • IT Act 2000    │                  │  ║
║  │  └──────┬───────┘  └────────┬──────────┘  └────────┬─────────┘                  │  ║
║  │         │ Aadhaar Token     │ X.509 Cert           │ DSC Token                  │  ║
║  └─────────┼───────────────────┼──────────────────────┼────────────────────────────┘  ║
║            ▼                   ▼                      ▼                               ║
║  ┌─────────────────────────────────────────────────────────────────────────────────┐  ║
║  │                    LAYER 3: API GATEWAY LAYER                                   │  ║
║  │                                                                                 │  ║
║  │  ┌─────────────────────────────────────────────────────────────────────────┐     │  ║
║  │  │                    FastAPI Gateway (Port 8000)                          │     │  ║
║  │  │                                                                         │     │  ║
║  │  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐ ┌───────────────────┐      │     │  ║
║  │  │  │ JWT Auth │ │ Rate     │ │ Request UUID │ │ Prometheus        │      │     │  ║
║  │  │  │ Middleware│ │ Limiter  │ │ Tracking     │ │ Metrics Collector │      │     │  ║
║  │  │  └──────────┘ └──────────┘ └──────────────┘ └───────────────────┘      │     │  ║
║  │  │                                                                         │     │  ║
║  │  │  Rate Limits: Officer=100/min | Bidder=50/min | Auditor=200/min         │     │  ║
║  │  │  All requests logged with: UUID, actor_did, timestamp_IST, action       │     │  ║
║  │  └─────────────────────────────────────────────────────────────────────────┘     │  ║
║  │                                                                                 │  ║
║  └────────────────┬──────────────┬──────────────┬──────────────┬──────────────────┘  ║
║                   │ REST API     │ REST API     │ REST API     │ REST API             ║
║                   ▼              ▼              ▼              ▼                      ║
║  ┌─────────────────────────────────────────────────────────────────────────────────┐  ║
║  │                 LAYER 4: APPLICATION SERVICES LAYER                             │  ║
║  │                                                                                 │  ║
║  │  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐    │  ║
║  │  │ Tender Service │ │ Bid Service    │ │ Commitment Svc │ │ Alert Service  │    │  ║
║  │  │                │ │                │ │                │ │                │    │  ║
║  │  │ • Create       │ │ • Commit       │ │ • SHA-256      │ │ • AI Alert     │    │  ║
║  │  │ • Publish      │ │ • Reveal       │ │   Commitment   │ │   Management   │    │  ║
║  │  │ • Evaluate     │ │ • Verify bid  │ │ • Generate     │ │ • Escalation   │    │  ║
║  │  │ • Award        │ │ • Query by     │ │   Proof        │ │ • CAG Notify   │    │  ║
║  │  │ • Freeze       │ │   Tender       │ │ • Verify       │ │ • Freeze       │    │  ║
║  │  │ • GFR Validate │ │ • GSTIN Check  │ │   Commitment   │ │   Trigger      │    │  ║
║  │  │ • History      │ │ • PAN Check    │ │ • Range Proof  │ │ • Dashboard    │    │  ║
║  │  └───────┬────────┘ └───────┬────────┘ └───────┬────────┘ └───────┬────────┘    │  ║
║  │          │                  │                  │                  │              │  ║
║  └──────────┼──────────────────┼──────────────────┼──────────────────┼──────────────┘  ║
║             │ Chaincode Invoke │ Chaincode Invoke │ Crypto Ops      │ Alert Events     ║
║             ▼                  ▼                  ▼                  ▼                  ║
║  ┌─────────────────────────────────────────────────────────────────────────────────┐  ║
║  │               LAYER 5: AI MONITORING LAYER (Port 8001)                         │  ║
║  │                                                                                 │  ║
║  │  ┌─────────────────────┐ ┌────────────────────┐ ┌──────────────────────────┐    │  ║
║  │  │ Anomaly Detection   │ │ Collusion Graph     │ │ Risk Score Engine       │    │  ║
║  │  │ Engine              │ │ Analyzer             │ │                          │    │  ║
║  │  │                     │ │                      │ │ Composite Score:         │    │  ║
║  │  │ • Bid Rigging       │ │ • NetworkX Graph     │ │  Bid Rigging    × 0.30  │    │  ║
║  │  │   (CV Analysis)     │ │ • Louvain Community  │ │  Collusion      × 0.25  │    │  ║
║  │  │ • Benford's Law     │ │ • Centrality Score   │ │  Cartel         × 0.20  │    │  ║
║  │  │ • Isolation Forest  │ │ • Shell Company      │ │  Timing         × 0.15  │    │  ║
║  │  │ • Cartel Rotation   │ │   Detection (PAN)    │ │  Shell Company  × 0.10  │    │  ║
║  │  │ • Timing Anomaly    │ │ • Temporal Cluster   │ │                          │    │  ║
║  │  │                     │ │                      │ │ Thresholds:              │    │  ║
║  │  │ scikit-learn +      │ │ NetworkX +           │ │  0-25:  MONITOR          │    │  ║
║  │  │ PyTorch             │ │ D3.js viz data       │ │  26-50: FLAG             │    │  ║
║  │  │                     │ │                      │ │  51-75: FREEZE           │    │  ║
║  │  │                     │ │                      │ │  76-100:ESCALATE_CAG     │    │  ║
║  │  └──────────┬──────────┘ └──────────┬───────────┘ └──────────┬───────────────┘    │  ║
║  │             │ Analysis Results      │ Graph Results          │ Risk Scores        │  ║
║  └─────────────┼──────────────────────┼──────────────────────┼─────────────────────┘  ║
║                │                      │                      │                        ║
║                ▼                      ▼                      ▼                        ║
║  ┌─────────────────────────────────────────────────────────────────────────────────┐  ║
║  │          LAYER 6: BLOCKCHAIN LAYER (Hyperledger Fabric 2.5)                    │  ║
║  │                                                                                 │  ║
║  │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │  ║
║  │   │ MinistryOrg │  │ BidderOrg   │  │ AuditorOrg  │  │ NICOrg      │           │  ║
║  │   │             │  │             │  │  (CAG)      │  │             │           │  ║
║  │   │ peer0       │  │ peer0       │  │ peer0       │  │ peer0       │           │  ║
║  │   │ peer1       │  │ peer1       │  │ peer1       │  │ peer1       │           │  ║
║  │   │ ca.ministry │  │ ca.bidder   │  │ ca.auditor  │  │ ca.nic      │           │  ║
║  │   │ couchdb0    │  │ couchdb1    │  │ couchdb2    │  │ couchdb3    │           │  ║
║  │   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘           │  ║
║  │          │                │                │                │                    │  ║
║  │          └────────────────┼────────────────┼────────────────┘                    │  ║
║  │                           │                │                                     │  ║
║  │              ┌────────────▼────────────────▼──────────────┐                      │  ║
║  │              │    Raft Ordering Service (3 Orderers)      │                      │  ║
║  │              │    orderer0 | orderer1 | orderer2          │                      │  ║
║  │              │    (Crash Fault Tolerant - 1 node failure) │                      │  ║
║  │              └───────────────────────────────────────────┘                      │  ║
║  │                                                                                 │  ║
║  │   Channels:                                                                     │  ║
║  │   ├── TenderChannel (All 4 Orgs) — All tender/bid operations                   │  ║
║  │   └── AuditChannel  (MinistryOrg + AuditorOrg) — CAG investigations only        │  ║
║  │                                                                                 │  ║
║  │   Endorsement Policy: TenderCreation requires (MinistryOrg AND NICOrg)          │  ║
║  │   Chaincode: tendershield (Go) — deployed on all peers                          │  ║
║  └────────────────┬────────────────────────────────────────────────────────────────┘  ║
║                   │ Blockchain Events (ChaincodeEvents)                               ║
║                   ▼                                                                   ║
║  ┌─────────────────────────────────────────────────────────────────────────────────┐  ║
║  │               LAYER 7: EVENT STREAMING LAYER                                    │  ║
║  │                                                                                 │  ║
║  │  ┌──────────────────────────────────────────────────────────────────┐            │  ║
║  │  │                 Apache Kafka Cluster                             │            │  ║
║  │  │                                                                  │            │  ║
║  │  │  Topics:                                                         │            │  ║
║  │  │  ├── tender-events    → AI Engine (anomaly baseline)             │            │  ║
║  │  │  ├── bid-events       → AI Engine (fraud analysis trigger)       │            │  ║
║  │  │  ├── ai-alerts        → Alert Service (freeze/escalate)          │            │  ║
║  │  │  ├── audit-events     → Audit Dashboard (real-time updates)      │            │  ║
║  │  │  └── blockchain-feed  → Frontend (live TX feed display)          │            │  ║
║  │  │                                                                  │            │  ║
║  │  │  Processing: Exactly-once delivery | Consumer groups per service  │            │  ║
║  │  │  Dead Letter Queue: Failed events for retry/investigation        │            │  ║
║  │  └──────────────────────────────────────────────────────────────────┘            │  ║
║  │                                                                                 │  ║
║  └────────────────┬────────────────────────────────────────────────────────────────┘  ║
║                   │ Events consumed by services                                      ║
║                   ▼                                                                   ║
║  ┌─────────────────────────────────────────────────────────────────────────────────┐  ║
║  │                    LAYER 8: STORAGE LAYER                                       │  ║
║  │                                                                                 │  ║
║  │  ┌──────────────────┐  ┌──────────────────────┐  ┌───────────────────┐          │  ║
║  │  │ IPFS + MinIO     │  │ PostgreSQL 15         │  │ Redis 7           │          │  ║
║  │  │                  │  │                        │  │                   │          │  ║
║  │  │ • Tender Docs    │  │ • TenderMetadata       │  │ • JWT Blacklist   │          │  ║
║  │  │   (PDF/Images)   │  │ • BidMetadata          │  │ • Session Cache   │          │  ║
║  │  │ • Bid Documents  │  │ • UserProfile          │  │ • Rate Limit      │          │  ║
║  │  │ • Evidence Files │  │ • AlertRecord          │  │   Counters        │          │  ║
║  │  │                  │  │ • AuditLog             │  │ • Query Cache     │          │  ║
║  │  │ Hash stored on   │  │                        │  │ • Dashboard       │          │  ║
║  │  │ blockchain for   │  │ Indexes: ministry_code │  │   Stats Cache     │          │  ║
║  │  │ integrity verify │  │ status, tender_id,     │  │                   │          │  ║
║  │  │                  │  │ bidder_did, risk_score  │  │ TTL: 5 min        │          │  ║
║  │  └──────────────────┘  └──────────────────────┘  └───────────────────┘          │  ║
║  │                                                                                 │  ║
║  └─────────────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                      ║
║  ┌─────────────────────────────────────────────────────────────────────────────────┐  ║
║  │                   LAYER 9: MONITORING & OBSERVABILITY LAYER                    │  ║
║  │                                                                                 │  ║
║  │  ┌──────────────────┐  ┌──────────────────────┐  ┌───────────────────┐          │  ║
║  │  │ Prometheus       │  │ Grafana              │  │ Alert Manager     │          │  ║
║  │  │ (Port 9090)      │  │ (Port 3001)          │  │                   │          │  ║
║  │  │                  │  │                        │  │ • Email Alerts    │          │  ║
║  │  │ Metrics:         │  │ Dashboards:            │  │ • SMS via UIDAI   │          │  ║
║  │  │ • API Latency    │  │ • Fabric Network       │  │ • Webhook to      │          │  ║
║  │  │ • TX Throughput  │  │ • API Performance      │  │   NIC CERT-In     │          │  ║
║  │  │ • Fraud Alerts/h │  │ • AI Model Performance │  │ • PagerDuty       │          │  ║
║  │  │ • Block Height   │  │ • Fraud Heatmap        │  │   Integration     │          │  ║
║  │  │ • Peer Health    │  │ • Tender Volume        │  │                   │          │  ║
║  │  └──────────────────┘  └──────────────────────┘  └───────────────────┘          │  ║
║  │                                                                                 │  ║
║  └─────────────────────────────────────────────────────────────────────────────────┘  ║
║                                                                                      ║
╚══════════════════════════════════════════════════════════════════════════════════════╝
```

---

## Data Flow Summary

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        DATA FLOW OVERVIEW                                │
│                                                                          │
│  [User Action]                                                           │
│       │                                                                  │
│       ▼                                                                  │
│  [Aadhaar/DSC Auth] ──→ [JWT Token Issued]                               │
│       │                                                                  │
│       ▼                                                                  │
│  [API Gateway] ──→ [Request UUID + Audit Log]                            │
│       │                                                                  │
│       ▼                                                                  │
│  [App Service] ──→ [Validate Input + GFR Check]                          │
│       │                                                                  │
│       ├──→ [IPFS] ──→ Document stored, hash returned                     │
│       │                                                                  │
│       ├──→ [Chaincode] ──→ State written to Fabric ledger                │
│       │         │                                                        │
│       │         └──→ [ChaincodeEvent emitted]                            │
│       │                    │                                             │
│       │                    ▼                                             │
│       │              [Kafka Topic] ──→ [AI Engine consumes]              │
│       │                                    │                             │
│       │                                    ▼                             │
│       │                              [Fraud Analysis]                    │
│       │                                    │                             │
│       │                    ┌───────────────┼───────────────┐             │
│       │                    ▼               ▼               ▼             │
│       │              [MONITOR]        [FREEZE]       [ESCALATE]          │
│       │              (Log only)    (Auto-freeze     (Notify CAG          │
│       │                            tender on         auditor for         │
│       │                            blockchain)       investigation)      │
│       │                                                                  │
│       ├──→ [PostgreSQL] ──→ Metadata indexed for fast search             │
│       └──→ [Redis] ──→ Response cached (5 min TTL)                       │
│                                                                          │
│  [Prometheus] ◄── Metrics scraped every 15s                              │
│       │                                                                  │
│       ▼                                                                  │
│  [Grafana] ──→ Real-time dashboards for NIC operations team              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

### Vulnerability 1: Man-in-the-Middle Attack on API Gateway
**Risk:** API traffic between frontend and backend could be intercepted.
**Mitigation:** 
- TLS 1.3 enforced on all connections
- Mutual TLS (mTLS) between Fabric peers
- JWT tokens signed with RS256 (asymmetric) and short expiry (15 min)
- All inter-service communication encrypted

### Vulnerability 2: Insider Threat — Compromised Ministry Officer
**Risk:** A corrupt ministry officer could manipulate tender specifications to favor a bidder.
**Mitigation:**
- All tender creation requires dual endorsement (MinistryOrg AND NICOrg MSP)
- Every modification is a new blockchain transaction — full audit trail visible to CAG
- AI continuously monitors for suspicious patterns (e.g., officer-bidder correlation)
- Aadhaar eKYC ties every action to a verified real identity — no anonymous manipulation

### Vulnerability 3: Commitment Implementation Weakness
**Risk:** Incorrectly implemented hash commitments could leak bid amounts or allow bidders to change bids after commitment.
**Mitigation:**
- Standard SHA-256 hash function (FIPS 180-4 compliant, collision-resistant)
- Commitment binding property: computationally infeasible to find two different amounts for same commitment
- Commitment hiding property: commitment reveals zero information about the bid amount
- Range proofs ensure bid is positive and within valid range without revealing exact value
- All commitment operations audited and logged on blockchain

---

## India-Specific Compliance Matrix

| Regulation | Implementation |
|---|---|
| GFR 2017 Rule 144 | Tender notice requirements validated in `compliance.go` |
| GFR 2017 Rule 149 | Open tender threshold (>₹25 lakh) enforced in chaincode |
| GFR 2017 Rule 153 | Bid security (2-5%) auto-calculated |
| GFR 2017 Rule 153A | MSME preference scoring built into evaluation |
| CVC Guidelines | Full audit trail + AI monitoring for corruption patterns |
| IT Act 2000 | DSC verification for all tender submissions |
| Aadhaar Act | eKYC verification for all participants (sandbox mode) |
| GST Act | GSTIN validation (15-char format) for all bidders |

---

## Port Mapping Reference

| Service | Port | Description |
|---|---|---|
| FastAPI Backend | 8000 | Main API Gateway |
| AI Engine | 8001 | Fraud Detection Microservice |
| Next.js Frontend | 3000 | Dashboard UI |
| Grafana | 3001 | Monitoring Dashboards |
| Prometheus | 9090 | Metrics Collection |
| PostgreSQL | 5432 | Off-chain Metadata |
| Redis | 6379 | Cache & Session Store |
| Kafka | 9092 | Event Streaming |
| IPFS Gateway | 5001 | Document Storage |
| Peer0 Ministry | 7051 | Fabric Peer |
| Peer1 Ministry | 7061 | Fabric Peer |
| Peer0 Bidder | 8051 | Fabric Peer |
| Peer1 Bidder | 8061 | Fabric Peer |
| Peer0 Auditor | 9051 | Fabric Peer |
| Peer1 Auditor | 9061 | Fabric Peer |
| Peer0 NIC | 10051 | Fabric Peer |
| Peer1 NIC | 10061 | Fabric Peer |
| Orderer0 | 7050 | Raft Orderer |
| Orderer1 | 8050 | Raft Orderer |
| Orderer2 | 9050 | Raft Orderer |
| CA Ministry | 7054 | Certificate Authority |
| CA Bidder | 8054 | Certificate Authority |
| CA Auditor | 9054 | Certificate Authority |
| CA NIC | 10054 | Certificate Authority |
| CouchDB Ministry | 5984 | State DB |
| CouchDB Bidder | 6984 | State DB |
| CouchDB Auditor | 7984 | State DB |
| CouchDB NIC | 8984 | State DB |
