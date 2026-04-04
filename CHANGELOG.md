# Changelog

All notable changes to TenderShield will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [1.1.0] — 2026-03-19

### Added
- **Testing Suite**: Comprehensive pytest tests for all 5 AI detectors and risk scorer (50+ test cases)
- **CI/CD Pipeline**: GitHub Actions workflow with linting, testing, security scanning, and Docker build validation
- **Security Middleware**: Rate limiting, security headers (HSTS, CSP, XSS), input sanitization, correlation IDs
- **API Standardization**: Consistent response envelope `{ success, data, error, meta }` with pagination support
- **Error Boundary**: React error boundary component with retry and fallback support
- **Loading Skeletons**: Premium shimmer loading states for stat cards, tables, event feeds, and charts
- **Data Export**: CSV and JSON export for tenders, bids, and AI alerts
- **Contributing Guide**: `CONTRIBUTING.md` with development workflow and coding standards
- **Deep Health Checks**: Expanded health endpoint with Redis, Kafka, Fabric connectivity checks
- **AI Explainability**: Dashboard component showing why tenders were flagged (detector breakdown)
- **Blockchain Explorer**: Transaction explorer component with block details and org participation

### Changed
- **CORS policy**: Hardened from wildcard `*` to specific allowed methods and headers
- **Error handling**: Structured JSON error responses with correlation IDs across services

### Security
- Added `Strict-Transport-Security`, `Content-Security-Policy`, `X-Frame-Options` headers
- Implemented per-endpoint rate limiting (auth: 10/min, AI: 20/min, general: 100/min)
- Added SQL injection, XSS, and path traversal protection middleware

## [1.0.0] — 2025-12-01

### Added
- Initial release for Blockchain India Competition 2025
- Hyperledger Fabric 2.5 network with 4 organizations
- 5 AI fraud detectors (bid rigging, collusion, shell company, cartel rotation, timing anomaly)
- Zero-Knowledge Proof (SHA-256 Hash Commitments) for bid confidentiality
- FastAPI backend with JWT authentication
- Next.js 14 dashboard with real-time blockchain feed
- GFR 2017 compliance engine
- Docker Compose production deployment
- Prometheus + Grafana monitoring setup
