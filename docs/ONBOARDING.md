# Developer Onboarding Guide

## Quick Start (< 10 minutes)

```bash
# 1. Clone and install
git clone <repo-url>
cd TenderShield
npm install

# 2. Set up environment
cp .env.example .env.local
# Add your Supabase URL + keys

# 3. Run
npm run dev
# → http://localhost:3000

# 4. Login with demo accounts
# Officer: officer@morth.gov.in
# Bidder:  medtech@medtechsolutions.com
# Auditor: auditor@cag.gov.in
```

## Architecture Overview

```
TenderShield/
├── app/                    # Next.js 14 App Router
│   ├── api/                # 40+ API routes
│   │   ├── auth/           # HMAC-signed session auth
│   │   ├── procurement-lifecycle/  # Full tender lifecycle (CORE)
│   │   ├── chaincode-invoke/       # Fabric chaincode gateway
│   │   ├── v1/bids/        # Sealed bid commitment
│   │   └── ai/             # ML + Claude analysis
│   ├── dashboard/          # Role-based dashboards
│   └── page.tsx            # Login page
├── lib/                    # Shared libraries (46 files)
│   ├── zkp.ts              # SHA-256 commitment scheme
│   ├── ml/                 # Random Forest model
│   ├── validation/         # Zod schemas
│   └── store.ts            # Auth state management
├── chaincode/              # Go Hyperledger Fabric chaincode
├── network/                # Fabric network scripts
├── __tests__/              # 107 tests (Vitest)
├── scripts/                # Training, seeding, testing
└── docs/                   # You are here
```

## Key Files Map

| File | What It Does | When You'd Edit It |
|------|-------------|-------------------|
| `app/api/procurement-lifecycle/route.ts` | Full tender lifecycle (create → bid → reveal → award) | Changing procurement flow |
| `lib/zkp.ts` | SHA-256 commitment scheme | Changing cryptography |
| `lib/ml/randomForest.ts` | ML model inference | Changing fraud detection |
| `lib/validation/schemas.ts` | Zod input schemas | Adding new API parameters |
| `middleware.ts` | Auth verification + CSP headers | Changing security policy |
| `chaincode/tendershield/main.go` | Blockchain smart contract | Changing on-chain logic |

## Testing

```bash
# Run all tests
npx vitest run

# Run specific test file
npx vitest run __tests__/auth-security.test.ts

# Run with verbose output
npx vitest run --reporter=verbose

# Type check
npx tsc --noEmit
```

## Common Gotchas

### 1. "Supabase not configured"
The app works without Supabase (falls back to in-memory). Add to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 2. "Fabric peer unavailable"
The blockchain integration gracefully degrades. Without a running Fabric network, all chaincode calls return `IN_MEMORY_DEMO` source.

### 3. "ML model not found"
Run the training script:
```bash
npx tsx scripts/train-model.ts
```

### 4. HMAC cookies in development
`SESSION_SIGNING_KEY` defaults to a dev key. Set a real 32-byte base64 key for production:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Contribution Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Write tests first (TDD)
3. Run `npx tsc --noEmit` — must pass
4. Run `npx vitest run` — must pass
5. Submit PR with description of changes
