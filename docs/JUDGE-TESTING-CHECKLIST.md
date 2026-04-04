# 🔥 TenderShield — Judge Break-It Checklist

> Use this document for dry-run testing. Have someone pretend to be a judge and try to break every feature.

---

## Pre-Test Setup

```bash
# Start the application
npm run dev  # Frontend on :3000

# Optional: Start backend services
cd backend && uvicorn main:app --reload --port 8000
cd ai_engine && uvicorn main:app --reload --port 8001
```

---

## Test 1: Authentication & Authorization

| # | Attack Vector | Expected Behavior | ✅/❌ |
|---|-------------|-------------------|-------|
| 1.1 | Access `/dashboard` without login | Redirect to `/` login page | |
| 1.2 | Try SQL injection in email field: `' OR 1=1 --` | Validation error, no bypass | |
| 1.3 | Use Officer login, try to access `/dashboard/auditor` | Redirect to correct role dashboard | |
| 1.4 | Modify JWT token in localStorage | Token invalid on next API call | |
| 1.5 | Login as Bidder, try to create a tender | 403 Forbidden | |
| 1.6 | Rapidly click demo login 10x | Handles gracefully, no duplicate sessions | |

---

## Test 2: Tender Creation

| # | Attack Vector | Expected Behavior | ✅/❌ |
|---|-------------|-------------------|-------|
| 2.1 | Submit tender with negative estimated value | Validation error | |
| 2.2 | Submit tender with past deadline | Validation error | |
| 2.3 | Submit empty form | All required fields shown | |
| 2.4 | Submit with XSS in title: `<script>alert(1)</script>` | Sanitized, no execution | |
| 2.5 | Submit tender with extremely long title (10,000 chars) | Truncated or rejected | |
| 2.6 | Submit tender in demo mode | Created in demo data, not real DB | |
| 2.7 | Submit tender in real mode | Created in Supabase + blockchain TX | |

---

## Test 3: AI Fraud Detection

| # | Attack Vector | Expected Behavior | ✅/❌ |
|---|-------------|-------------------|-------|
| 3.1 | Analyze a clean tender | Low risk score (0-25) | |
| 3.2 | Analyze the AIIMS Delhi tender | High risk (90+), auto-freeze recommended | |
| 3.3 | What if the AI API key is invalid? | Falls back to deterministic engine | |
| 3.4 | What if AI returns garbage JSON? | Graceful error, shows deterministic results | |
| 3.5 | Rapidly trigger 20 analyses | Rate limited, not crashed | |
| 3.6 | Check if AI results are consistent | Same tender = consistent score ± 5% | |

---

## Test 4: Sealed Bid Commitments

| # | Attack Vector | Expected Behavior | ✅/❌ |
|---|-------------|-------------------|-------|
| 4.1 | Submit a bid with SHA-256 commitment | Commitment hash generated | |
| 4.2 | Reveal the bid | Amount matches, proof verifies | |
| 4.3 | Try to submit bid with amount = 0 | Rejected (range proof) | |
| 4.4 | Try to reveal with wrong blinding factor | Verification fails | |
| 4.5 | Check that bid amount is hidden before reveal | Only commitment hash visible | |

---

## Test 5: Blockchain Explorer

| # | Attack Vector | Expected Behavior | ✅/❌ |
|---|-------------|-------------------|-------|
| 5.1 | View blockchain page | Shows blocks with transactions | |
| 5.2 | Click on a block | Shows transaction details | |
| 5.3 | Check block timestamps | In IST timezone | |
| 5.4 | Verify TX hash format | Proper SHA256 format | |
| 5.5 | If Fabric is down | Shows Supabase audit trail data | |

---

## Test 6: CAG Auditor Dashboard

| # | Attack Vector | Expected Behavior | ✅/❌ |
|---|-------------|-------------------|-------|
| 6.1 | Flag a tender | Flagged status + audit trail entry | |
| 6.2 | Generate compliance report | PDF-like report generated | |
| 6.3 | View all audit events | Complete trail shown | |
| 6.4 | Filter by date/ministry/severity | Filters work correctly | |

---

## Test 7: Mobile Responsiveness

| # | Test | Expected Behavior | ✅/❌ |
|---|------|-------------------|-------|
| 7.1 | Open on iPhone (390px) | Stacked layout, no horizontal scroll | |
| 7.2 | Open on iPad (768px) | Tablet layout, narrower sidebar | |
| 7.3 | Bottom navigation visible on phone | 5 icons visible and clickable | |
| 7.4 | All buttons are thumb-reachable | Min 44px touch targets | |
| 7.5 | Forms usable without zoom | 16px minimum font on inputs | |
| 7.6 | Hamburger menu opens/closes | Slide-out drawer works | |

---

## Test 8: Network Resilience

| # | Test | Expected Behavior | ✅/❌ |
|---|------|-------------------|-------|
| 8.1 | Turn off Wi-Fi, refresh page | Loading state, error after timeout | |
| 8.2 | Refresh page after network returns | Full recovery, no stale state | |
| 8.3 | Open app with backend down | Demo data loads, no crash | |
| 8.4 | Submit form during network flap | Error toast, form data preserved | |
| 8.5 | Check error boundary | Shows retry button + dashboard link | |

---

## Test 9: Performance

| # | Test | Expected Behavior | ✅/❌ |
|---|------|-------------------|-------|
| 9.1 | Lighthouse score (desktop) | > 80 performance | |
| 9.2 | First Contentful Paint | < 2 seconds | |
| 9.3 | Dashboard load time | < 3 seconds | |
| 9.4 | No memory leaks (check DevTools) | Memory stable over 5 minutes | |
| 9.5 | Animations smooth at 60fps | No jank on card hover / transitions | |

---

## Test 10: Dual Mode Integrity

| # | Test | Expected Behavior | ✅/❌ |
|---|------|-------------------|-------|
| 10.1 | Demo mode badge shows "MVP Sandbox" | Green banner visible | |
| 10.2 | Demo data stays in demo | Not written to Supabase | |
| 10.3 | Real mode shows "Production" badge | Orange banner visible | |
| 10.4 | Real data saves to Supabase | Verify in Supabase dashboard | |
| 10.5 | Switch modes and verify isolation | Data doesn't leak between modes | |

---

## Common Judge Questions & Answers

| Question | Answer |
|----------|--------|
| "Is this real blockchain?" | "Yes — Hyperledger Fabric 2.5 with Go chaincode. We have a local Docker network with 8 peers, 4 orgs, and Raft consensus." |
| "How do you prevent bid rigging?" | "5 independent AI detectors analyse every tender. Shell company detection uses PAN/CIN cross-referencing. Cartel rotation tracks win patterns. All scores are logged on-chain." |
| "What if the AI makes a mistake?" | "TenderShield has a constitutional AI safety layer. Every AI decision is auditable. Human auditors (CAG) make final decisions. Auto-freeze is a safety measure, not punishment." |
| "Is this GFR 2017 compliant?" | "Yes — we validate Rules 144, 149, 153, 153A, 154, and 166. Compliance is checked both in chaincode (Go) and at the API layer." |
| "How do ZKPs work here?" | "SHA-256 hash commitments. C = SHA-256(amount || randomness). The bid amount is hidden in a cryptographic hash. When revealed, the verifier recomputes the hash and checks it matches. Fiat-Shamir challenge-response binds the proof to the session." |
| "Can this scale?" | "Docker containerized. Kafka for event streaming. Redis for caching. The architecture supports horizontal scaling of peers and services." |
| "What about Aadhaar privacy?" | "We follow Section 29 — only store verification hashes, never raw biometric or demographic data." |

---

## After Testing: Fix Priority

1. **P0 (Fix immediately):** Any security bypass, data exposure, or crash
2. **P1 (Fix today):** Broken features, wrong data, UI glitches
3. **P2 (Fix if time):** Cosmetic issues, slow animations, minor text errors
4. **P3 (Document):** Known limitations to mention in presentation
