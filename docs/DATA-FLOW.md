# 🔄 TenderShield — Data Flow Documentation

> Complete data flow for all major operations

---

## 1. Tender Creation Flow

```mermaid
sequenceDiagram
    participant O as Ministry Officer
    participant F as Frontend (Next.js)
    participant API as API Gateway
    participant GFR as GFR Validator
    participant BC as Hyperledger Fabric
    participant AI as AI Engine
    participant DB as Supabase

    O->>F: Fill tender form
    F->>F: Client-side validation
    F->>API: POST /api/tenders
    API->>GFR: Validate GFR 2017 rules
    GFR-->>API: ✅ Compliance check passed

    par Blockchain + Database
        API->>BC: InvokeChaincode("CreateTender")
        BC-->>API: TX hash + block number
    and
        API->>DB: INSERT into tenders table
        DB-->>API: Record created
    end

    API->>AI: Async: Analyze new tender
    AI-->>DB: Store initial risk score

    API-->>F: 201 Created + tender_id
    F-->>O: Success notification
```

---

## 2. Bid Submission Flow (Sealed Commitment)

```mermaid
sequenceDiagram
    participant B as Bidder
    participant F as Frontend
    participant ZKP as Commitment Module
    participant BC as Blockchain
    participant DB as Supabase

    B->>F: Enter bid amount
    F->>ZKP: Generate SHA-256 Commitment
    Note over ZKP: C = SHA-256(amount || randomness)
    ZKP-->>F: Commitment + blinding factor

    F->>BC: SubmitBid(tender_id, commitment_hash)
    BC-->>F: TX hash (amount is HIDDEN)
    F->>DB: Store commitment metadata

    Note over B: Later, after deadline...
    B->>F: Reveal bid
    F->>ZKP: Generate Schnorr proof
    F->>BC: RevealBid(amount, blinding_factor, proof)
    BC->>ZKP: Verify: recompute SHA-256(amount || randomness) == C
    ZKP-->>BC: ✅ Proof valid
    BC-->>F: Bid revealed and verified
```

---

## 3. AI Fraud Detection Flow

```mermaid
sequenceDiagram
    participant BC as Blockchain Event
    participant AI as AI Engine
    participant D1 as Shell Company
    participant D2 as Bid Rigging
    participant D3 as Cartel Rotation
    participant D4 as Front-Running
    participant D5 as Timing Collusion
    participant Alert as Alert Service
    participant CAG as CAG Auditor

    BC->>AI: New tender/bid event
    
    par 5 Parallel Detectors
        AI->>D1: Analyze (PAN/CIN cross-ref)
        AI->>D2: Analyze (CV calculation)
        AI->>D3: Analyze (Win pattern)
        AI->>D4: Analyze (Estimate clustering)
        AI->>D5: Analyze (Timestamp analysis)
    end

    D1-->>AI: Score: 98 (evidence: shared PAN)
    D2-->>AI: Score: 87 (CV: 2.1%)
    D3-->>AI: Score: 92 (4/5 wins)
    D4-->>AI: Score: 45
    D5-->>AI: Score: 78

    AI->>AI: Composite = 98×0.3 + 87×0.25 + 92×0.2 + 45×0.15 + 78×0.1
    Note over AI: Score: 85.65 → ESCALATE_CAG

    AI->>Alert: Generate alert
    Alert->>BC: FreezeTender(tender_id)
    Alert->>CAG: 🚨 Notification + evidence
```

---

## 4. CAG Audit Flow

```mermaid
sequenceDiagram
    participant CAG as CAG Auditor
    participant F as Frontend
    participant DB as Supabase
    participant BC as Blockchain

    CAG->>F: Open Auditor Dashboard
    F->>DB: GET /api/auditor/audit-trail
    DB-->>F: All audit events

    CAG->>F: Click "Flag Tender"
    F->>DB: POST /api/auditor/flag-tender
    F->>BC: RecordAuditEvent("TENDER_FLAGGED")
    BC-->>F: TX hash (immutable record)

    CAG->>F: Generate Report
    F->>DB: POST /api/auditor/generate-report
    DB-->>F: Compiled report data
    F-->>CAG: 📄 Downloadable report
```

---

## 5. Error Handling & Failover Flow

```
Normal Flow:
  Request → API → Fabric + Supabase → Response

Fabric Down:
  Request → API → Fabric ❌ → Supabase (fallback) → Response
  (Data saved to Supabase, marked for Fabric sync later)

AI Engine Down:
  Request → AI Engine ❌ → Deterministic Engine → Response
  (Rule-based analysis used, flagged as "deterministic")

Network Timeout:
  Request → Timeout after 15s → Retry (2x with backoff) → Error UI
  (ErrorBoundary shows recovery options)

Supabase Down:
  Request → Supabase ❌ → Demo Data (in-memory) → Response
  (Demo mode activated automatically)
```

---

## 6. Authentication Flow

```
Login (Demo Mode):
  Click Demo Button → Set local token → Redirect to Dashboard

Login (Real Mode):
  Email + Password → Supabase Auth → JWT issued
  → Check user_verifications table
  → Route based on verification status:
    - Not verified → /register
    - Pending → /verify-pending
    - Rejected → /registration-rejected
    - Approved → /dashboard

Session Management:
  - JWT stored in Zustand (memory) + sessionStorage
  - Validated on each API call
  - Middleware checks token on protected routes
```
