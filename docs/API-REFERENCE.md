# 📡 TenderShield — API Reference

> Complete API documentation for all endpoints  
> Base URL: `http://localhost:3000/api` or `https://tendershield.vercel.app/api`

---

## Authentication

All API routes use JWT Bearer token authentication.

```
Authorization: Bearer <jwt_token>
```

Tokens are issued on login and expire after 15 minutes. Refresh via `/api/auth/refresh`.

---

## 1. Tender Endpoints

### POST `/api/tenders`
Create a new tender.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✅ | Tender title |
| `description` | string | ✅ | Detailed description |
| `ministry_code` | string | ✅ | Ministry code (MoH, MoRTH, etc.) |
| `estimated_value` | number | ✅ | Estimated value in INR |
| `category` | string | ✅ | GOODS / SERVICES / WORKS |
| `deadline` | string | ✅ | ISO 8601 deadline |

**Response:** `201 Created`
```json
{
  "tender_id": "TDR-MoH-2025-000003",
  "status": "BIDDING_OPEN",
  "blockchain_tx": "0xabc123...",
  "gfr_compliance": { "valid": true, "rules_checked": 4 }
}
```

### GET `/api/tenders`
List all tenders with optional filters.

| Param | Type | Description |
|-------|------|-------------|
| `status` | string | Filter by status |
| `ministry` | string | Filter by ministry |

### GET `/api/tenders/[id]`
Get tender details by ID.

### PATCH `/api/tenders/[id]/status`
Update tender status (Officer/Admin only).

---

## 2. AI Analysis Endpoints

### POST `/api/ai-analyze`
Run AI fraud detection on a tender.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tender_id` | string | ✅ | Tender to analyze |
| `bids` | array | ❌ | Optional bid data for analysis |

**Response:** `200 OK`
```json
{
  "risk_score": 94,
  "risk_level": "CRITICAL",
  "detectors": {
    "shell_company": { "score": 98, "evidence": ["Shared PAN: ABCDE1234F"] },
    "bid_rigging": { "score": 87, "evidence": ["CV: 2.1% (normal: 8-15%)"] },
    "cartel_rotation": { "score": 92, "evidence": ["BioMed Corp won 4/5"] },
    "front_running": { "score": 45, "evidence": [] },
    "timing_collusion": { "score": 78, "evidence": ["3 bids within 2 seconds"] }
  },
  "recommendation": "AUTO_FREEZE",
  "cag_case_id": "CAG-AI-2025-4521"
}
```

### GET `/api/ai/model-stats`
Get ML model performance metrics.

---

## 3. Blockchain Endpoints

### GET `/api/blockchain`
Get live blockchain events.

### GET `/api/blockchain/blocks`
Get recent blocks with transaction data.

### POST `/api/chaincode-invoke`
Invoke Hyperledger Fabric chaincode directly.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `function` | string | ✅ | Chaincode function name |
| `args` | array | ✅ | Function arguments |

---

## 4. ZKP Endpoints

### POST `/api/zkp/commit`
Create a Pedersen commitment for a bid.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tender_id` | string | ✅ | Target tender |
| `amount` | number | ✅ | Bid amount (hidden in commitment) |

**Response:**
```json
{
  "commitment": "0x1a2b3c...",
  "blinding_factor": "0x4d5e6f...",
  "proof": { "A": "...", "z_v": "...", "z_r": "..." },
  "blockchain_tx": "0xdef789..."
}
```

### POST `/api/zkp/reveal`
Reveal a committed bid after deadline.

### POST `/api/zkp/verify`
Verify a ZKP proof.

---

## 5. Auditor Endpoints

### GET `/api/auditor/audit-trail`
Get complete audit trail for CAG auditors.

### POST `/api/auditor/flag-tender`
Flag a tender for investigation.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tender_id` | string | ✅ | Tender to flag |
| `reason` | string | ✅ | Reason for flagging |
| `severity` | string | ✅ | LOW / MEDIUM / HIGH / CRITICAL |

### POST `/api/auditor/generate-report`
Generate a compliance report.

---

## 6. Dashboard Endpoints

### GET `/api/dashboard/stats`
Get dashboard statistics.

**Response:**
```json
{
  "total_tenders": 47,
  "active_bids": 6,
  "ai_alerts": 13,
  "blockchain_txs": 1847,
  "total_tender_value_crore": 3973,
  "fraud_prevented_value_crore": 238.5,
  "tps": 127,
  "last_block": 1421,
  "ministry_breakdown": [...],
  "risk_distribution": [...]
}
```

---

## 7. Auth Endpoints

### POST `/api/auth/login`
Authenticate user.

### POST `/api/auth/register`
Register new user.

### POST `/api/auth/logout`
Invalidate session.

---

## Error Codes

| Code | Meaning | Example |
|------|---------|---------|
| `400` | Bad Request | Missing required fields |
| `401` | Unauthorized | Invalid or expired JWT |
| `403` | Forbidden | Role doesn't have permission |
| `404` | Not Found | Tender ID doesn't exist |
| `409` | Conflict | Tender already frozen |
| `429` | Rate Limited | Too many requests |
| `500` | Server Error | Fabric connection failed |
| `503` | Service Unavailable | AI engine down (failover to deterministic) |

---

## Rate Limits

| Role | Limit | Window |
|------|-------|--------|
| Officer | 100 requests | 1 minute |
| Bidder | 50 requests | 1 minute |
| Auditor | 200 requests | 1 minute |
| Public | 20 requests | 1 minute |
