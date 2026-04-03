# TenderShield Deployment Status

## Current State (as of audit — 3 Apr 2026 IST)

| Component | Status | Notes |
|-----------|--------|-------|
| Next.js Frontend | ✅ Builds locally | `.next/` directory present |
| FastAPI Backend | ✅ Imports clean | Tested via CI |
| Go Chaincode | ✅ Compiles | `go build` succeeds |
| Fabric Network | ❌ Not running | No crypto material generated |
| Supabase | ⚠️ Configured | `.env.local` has keys (need rotation) |
| Vercel Deploy | ❓ Unknown | URL configured but not verified |
| Docker Compose | ✅ Config valid | `docker compose config` passes |

## To Deploy

### Local Development

```bash
# Frontend
npm run dev

# Backend
cd backend && uvicorn main:app --reload --port 8000

# Full stack (Docker)
docker compose up -d
```

### Production

See `deploy-vps.sh` and `docker-compose.production.yml`

## Blockchain Modes

| Mode | Trigger | Description |
|------|---------|-------------|
| `FABRIC_LIVE` | `FABRIC_LIVE=true` + running peer | Real Hyperledger Fabric via gRPC |
| `LEDGER_SIMULATION` | Default / Fabric unavailable | SQLite-backed persistent ledger |

## Key Environment Variables

See `.env.local.example` for the full template. Critical variables:

- `NEXT_PUBLIC_DEMO_MODE` — enables demo data fallback
- `FABRIC_LIVE` — enables Fabric peer connection attempts
- `ANTHROPIC_API_KEY` — enables real Claude AI analysis

## Security Notes

- All API keys in `.env.local` must be rotated if previously committed to git
- `.env.local` is in `.gitignore` — should never be committed
- Demo mode still requires authentication via login page
