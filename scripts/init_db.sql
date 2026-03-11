-- ============================================================
-- TenderShield — PostgreSQL Database Initialization
-- ============================================================
-- This script runs automatically when the PostgreSQL container
-- starts for the first time.
-- ============================================================

-- Users table (replaces hardcoded demo users)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    did VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('OFFICER', 'BIDDER', 'AUDITOR', 'NIC_ADMIN')),
    org VARCHAR(50) NOT NULL,
    gstin VARCHAR(15),
    pan VARCHAR(10),
    organization_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenders table (replaces in-memory dict)
CREATE TABLE IF NOT EXISTS tenders (
    id SERIAL PRIMARY KEY,
    tender_id VARCHAR(50) UNIQUE NOT NULL,
    ministry_code VARCHAR(20) NOT NULL,
    department VARCHAR(255),
    title TEXT NOT NULL,
    description TEXT,
    estimated_value_paise BIGINT NOT NULL,
    category VARCHAR(20) DEFAULT 'GOODS',
    procurement_method VARCHAR(20) DEFAULT 'OPEN',
    status VARCHAR(30) DEFAULT 'DRAFT',
    gfr_rule_reference VARCHAR(50),
    blockchain_tx_id VARCHAR(100),
    created_by_did VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    deadline_at TIMESTAMP WITH TIME ZONE,
    frozen_at TIMESTAMP WITH TIME ZONE,
    frozen_reason TEXT,
    awarded_at TIMESTAMP WITH TIME ZONE,
    winning_bid_id VARCHAR(50)
);

-- Bids table (replaces in-memory dict)
CREATE TABLE IF NOT EXISTS bids (
    id SERIAL PRIMARY KEY,
    bid_id VARCHAR(50) UNIQUE NOT NULL,
    tender_id VARCHAR(50) NOT NULL REFERENCES tenders(tender_id),
    bidder_did VARCHAR(100) NOT NULL,
    commitment_hash VARCHAR(128) NOT NULL,
    zkp_proof TEXT,
    status VARCHAR(20) DEFAULT 'COMMITTED',
    revealed_amount_paise BIGINT,
    randomness VARCHAR(128),
    bidder_documents_ipfs_hash VARCHAR(128),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    revealed_at TIMESTAMP WITH TIME ZONE
);

-- AI Alerts table
CREATE TABLE IF NOT EXISTS ai_alerts (
    id SERIAL PRIMARY KEY,
    alert_id VARCHAR(50) UNIQUE NOT NULL,
    tender_id VARCHAR(50) REFERENCES tenders(tender_id),
    composite_risk_score INT NOT NULL,
    recommended_action VARCHAR(20) NOT NULL,
    detectors_run INT,
    convergence_bonus INT DEFAULT 0,
    flags JSONB DEFAULT '[]',
    detector_results JSONB DEFAULT '{}',
    analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit Events table (immutable log)
CREATE TABLE IF NOT EXISTS audit_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(50) UNIQUE NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    topic VARCHAR(50),
    actor_did VARCHAR(100),
    actor_org VARCHAR(50),
    tender_id VARCHAR(50),
    bid_id VARCHAR(50),
    data JSONB DEFAULT '{}',
    timestamp_ist TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tenders_status ON tenders(status);
CREATE INDEX IF NOT EXISTS idx_tenders_ministry ON tenders(ministry_code);
CREATE INDEX IF NOT EXISTS idx_bids_tender ON bids(tender_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder ON bids(bidder_did);
CREATE INDEX IF NOT EXISTS idx_alerts_tender ON ai_alerts(tender_id);
CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_tender ON audit_events(tender_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_events(timestamp_ist);

-- Insert demo users (same as hardcoded ones, with proper password hashes)
INSERT INTO users (did, email, name, password_hash, role, org, gstin, organization_name) VALUES
    ('did:fabric:MinistryOrgMSP:officer1', 'officer@morth.gov.in', 'Rajesh Kumar (MoRTH Officer)',
     'demo_hash_officer1', 'OFFICER', 'MinistryOrgMSP', NULL, 'Ministry of Road Transport & Highways'),
    ('did:fabric:MinistryOrgMSP:officer2', 'officer@moe.gov.in', 'Priya Sharma (MoE Officer)',
     'demo_hash_officer2', 'OFFICER', 'MinistryOrgMSP', NULL, 'Ministry of Education'),
    ('did:fabric:BidderOrgMSP:bidder1', 'medtech@medtechsolutions.com', 'MedTech Solutions Pvt Ltd',
     'demo_hash_bidder1', 'BIDDER', 'BidderOrgMSP', '27AABCM1234F1Z5', 'MedTech Solutions'),
    ('did:fabric:BidderOrgMSP:bidder2', 'admin@biomedicorp.com', 'BioMediCorp Ltd (Suspicious)',
     'demo_hash_bidder2', 'BIDDER', 'BidderOrgMSP', '07AABCB5678G1Z3', 'BioMediCorp'),
    ('did:fabric:BidderOrgMSP:bidder3', 'infra@roadbuildersltd.com', 'Road Builders Ltd',
     'demo_hash_bidder3', 'BIDDER', 'BidderOrgMSP', '33AABCR9012H1Z1', 'Road Builders'),
    ('did:fabric:AuditorOrgMSP:auditor1', 'auditor@cag.gov.in', 'CAG Auditor',
     'demo_hash_auditor', 'AUDITOR', 'AuditorOrgMSP', NULL, 'Comptroller and Auditor General'),
    ('did:fabric:NICOrgMSP:admin1', 'admin@nic.in', 'NIC System Admin',
     'demo_hash_admin', 'NIC_ADMIN', 'NICOrgMSP', NULL, 'National Informatics Centre')
ON CONFLICT (email) DO NOTHING;

-- Insert seed tenders
INSERT INTO tenders (tender_id, ministry_code, department, title, description, estimated_value_paise, category, procurement_method, status, gfr_rule_reference, blockchain_tx_id, created_by_did) VALUES
    ('TDR-MoRTH-2025-000001', 'MoRTH', 'National Highways', 'NH-48 Expansion — Delhi-Jaipur Corridor',
     'Six-laning of NH-48 (280 km). Includes smart highway features, toll plazas, and EV charging stations.',
     350_00_00_000 * 100, 'WORKS', 'OPEN', 'BIDDING_OPEN', 'GFR Rule 149',
     'tx_seed_001', 'did:fabric:MinistryOrgMSP:officer1'),
    ('TDR-MoH-2025-000001', 'MoH', 'Medical Procurement', 'Medical Equipment — AIIMS Network',
     'Supply of 500 ICU ventilators and monitoring systems for AIIMS hospitals.',
     120_00_00_000 * 100, 'GOODS', 'OPEN', 'FROZEN_BY_AI', 'GFR Rule 149',
     'tx_seed_002', 'did:fabric:MinistryOrgMSP:officer1'),
    ('TDR-MoE-2025-000001', 'MoE', 'Digital Education', 'Smart Classroom — PM eVidya Phase 3',
     'Deployment of AI-powered smart classroom in 10,000 government schools.',
     185_00_00_000 * 100, 'GOODS', 'LIMITED', 'PUBLISHED', 'GFR Rule 153',
     'tx_seed_003', 'did:fabric:MinistryOrgMSP:officer2')
ON CONFLICT (tender_id) DO NOTHING;

RAISE NOTICE 'TenderShield database initialized successfully!';
