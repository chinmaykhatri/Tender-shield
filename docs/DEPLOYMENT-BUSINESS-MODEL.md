# TenderShield — Deployment & Business Model

## Revenue Models

### Model A: SaaS (Software-as-a-Service)

| Tier | Price | Features |
|------|-------|----------|
| **Pilot** | Free (3 months) | 1 department, 50 tenders, basic fraud detection |
| **Standard** | ₹2L/year | 5 departments, 500 tenders, ML + blockchain audit trail |
| **Enterprise** | ₹10L/year | Unlimited, dedicated Fabric network, CAG integration, SLA |

**Revenue projection:** 10 state govts × Standard = ₹20L/year (Year 1)

### Model B: Government Contract (GeM Empanelment)

- Register as software product on GeM (gem.gov.in)
- Price per-deployment: ₹5-25L depending on scale
- Annual maintenance contract (AMC): 18% of license fee
- Target: Central ministries + state procurement departments

### Model C: Managed Service

- Deploy and operate the full stack for the ministry
- Pricing: ₹1-5L/month depending on transaction volume
- Includes: Fabric network management, ML model retraining, 24/7 support

## Multi-Tenancy Architecture

```
┌─────────────────────────────────────────────┐
│  Shared Infrastructure                      │
│  ├── Next.js App (stateless, horizontal)    │
│  ├── Supabase (RLS per tenant)              │
│  └── ML Model (shared, per-tenant data)     │
├─────────────────────────────────────────────┤
│  Per-Tenant Isolation                       │
│  ├── Supabase RLS: tenant_id on all tables  │
│  ├── Fabric: per-org MSP certificates       │
│  └── API: tenant_id in JWT claims           │
├─────────────────────────────────────────────┤
│  Data Isolation Guarantee                   │
│  ├── Ministry A cannot see Ministry B data  │
│  ├── Auditors see all (cross-tenant read)   │
│  └── Blockchain provides cross-org truth    │
└─────────────────────────────────────────────┘
```

## Deployment Options

### 1. Cloud (Recommended for Pilot)

```yaml
# Infrastructure
- Frontend: Vercel / Cloud Run (Docker)
- Database: Supabase (managed Postgres)
- Blockchain: Docker Compose on VM (4 vCPU, 8GB RAM)
- ML: In-app (no GPU needed — Random Forest)

# Estimated Cost
- Supabase Pro: $25/month
- Cloud Run: $0-50/month (pay-per-request)
- VM for Fabric: $40/month (e2-standard-4)
# Total: ~$115/month (~₹9,500/month)
```

### 2. NIC Cloud (Government Deployment)

```yaml
# Infrastructure
- Host on NIC Cloud (meghraj.gov.in)
- STQC certified deployment
- VPN access for ministry users
- No external cloud dependency

# Requirements
- Docker support on NIC Cloud VM
- PostgreSQL 15+ (or Supabase self-hosted)
- 8 vCPU, 16GB RAM for Fabric + App
```

### 3. On-Premises

```yaml
# For maximum security
- Hardware: 2x Dell PowerEdge R640 (or equivalent)
- OS: Ubuntu 22.04 LTS
- Deploy via: docker compose -f docker-compose.yml up
- Backup: Automated PostgreSQL pg_dump + Fabric snapshot
```

## Go-to-Market Strategy

```
Phase 1 (Month 1-3):   Free pilot with 1 district collector's office
Phase 2 (Month 3-6):   Expand to 3 departments, gather testimonials
Phase 3 (Month 6-12):  GeM empanelment, pitch to state IT secretaries
Phase 4 (Month 12-18): Central govt ministry adoption, Series A
Phase 5 (Month 18-24): Multi-state deployment, CAG integration
```

## Competitive Advantage

| vs GeM | vs CPPP | vs Custom Development |
|--------|---------|----------------------|
| AI fraud detection (GeM has none) | Blockchain audit trail (CPPP has none) | 10x faster deployment |
| Real-time bid analysis | Multi-org trust model | Pre-built ML pipeline |
| Open-source (auditable) | Modern UI/UX | Fraction of the cost |
