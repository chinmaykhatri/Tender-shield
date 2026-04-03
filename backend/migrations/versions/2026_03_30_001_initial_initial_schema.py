"""Initial schema — 5 core tables

Revision ID: 001_initial
Revises: None
Create Date: 2026-03-30

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === TENDERS ===
    op.create_table(
        'tenders',
        sa.Column('tender_id', sa.String(50), primary_key=True),
        sa.Column('ministry_code', sa.String(15), nullable=False, index=True),
        sa.Column('department', sa.String(200), server_default=''),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('description', sa.Text, server_default=''),
        sa.Column('estimated_value_paise', sa.BigInteger, nullable=False),
        sa.Column('category', sa.String(20), nullable=False, server_default='GOODS'),
        sa.Column('procurement_method', sa.String(20), nullable=False, server_default='OPEN'),
        sa.Column('gem_category_id', sa.String(50), nullable=True),
        sa.Column('documents_ipfs_hash', sa.String(100), nullable=True),
        sa.Column('deadline_ist', sa.DateTime(timezone=True), nullable=True),
        sa.Column('evaluation_criteria', sa.JSON, nullable=True),
        sa.Column('gfr_rule_reference', sa.String(30), server_default='GFR Rule 149'),
        sa.Column('status', sa.String(20), nullable=False, server_default='DRAFT', index=True),
        sa.Column('freeze_reason', sa.Text, nullable=True),
        sa.Column('winning_bid_id', sa.String(100), nullable=True),
        sa.Column('created_by_did', sa.String(100), nullable=False),
        sa.Column('created_at_ist', sa.DateTime(timezone=True)),
        sa.Column('updated_at_ist', sa.DateTime(timezone=True)),
        sa.Column('blockchain_tx_id', sa.String(128), nullable=True),
        sa.Column('blockchain_block', sa.Integer, nullable=True),
        sa.Column('blockchain_mode', sa.String(30), server_default='LEDGER_SIMULATION'),
        sa.Column('ai_risk_score', sa.Integer, nullable=True),
        sa.Column('ai_scoring_mode', sa.String(20), nullable=True),
        sa.Column('ai_recommended_action', sa.String(20), nullable=True),
    )
    op.create_index('ix_tenders_ministry_status', 'tenders', ['ministry_code', 'status'])
    op.create_index('ix_tenders_created_at', 'tenders', ['created_at_ist'])

    # === BIDS ===
    op.create_table(
        'bids',
        sa.Column('bid_id', sa.String(120), primary_key=True),
        sa.Column('tender_id', sa.String(50), sa.ForeignKey('tenders.tender_id'), nullable=False, index=True),
        sa.Column('bidder_did', sa.String(100), nullable=False, index=True),
        sa.Column('bidder_gstin', sa.String(15), nullable=True),
        sa.Column('bidder_pan', sa.String(10), nullable=True),
        sa.Column('msme_registered', sa.Boolean, server_default='0'),
        sa.Column('dpiit_number', sa.String(50), nullable=True),
        sa.Column('commitment_hash', sa.String(128), nullable=False),
        sa.Column('zkp_proof', sa.Text, nullable=False),
        sa.Column('revealed_amount_paise', sa.BigInteger, nullable=True),
        sa.Column('documents_ipfs_hash', sa.String(100), nullable=True),
        sa.Column('submitted_at_ist', sa.DateTime(timezone=True)),
        sa.Column('reveal_at_ist', sa.DateTime(timezone=True), nullable=True),
        sa.Column('status', sa.String(20), server_default='COMMITTED', index=True),
        sa.Column('ai_risk_score', sa.Float, nullable=True),
        sa.Column('blockchain_tx_id', sa.String(128), nullable=True),
        sa.Column('blockchain_mode', sa.String(30), server_default='LEDGER_SIMULATION'),
    )
    op.create_index('ix_bids_tender_status', 'bids', ['tender_id', 'status'])

    # === AUDIT EVENTS ===
    op.create_table(
        'audit_events',
        sa.Column('event_id', sa.String(50), primary_key=True),
        sa.Column('event_type', sa.String(30), nullable=False, index=True),
        sa.Column('actor_did', sa.String(100), nullable=False, index=True),
        sa.Column('actor_role', sa.String(20), nullable=False),
        sa.Column('tender_id', sa.String(50), sa.ForeignKey('tenders.tender_id'), nullable=False, index=True),
        sa.Column('payload_hash', sa.String(128), nullable=False),
        sa.Column('description', sa.Text, nullable=False),
        sa.Column('risk_level', sa.String(10), server_default='INFO'),
        sa.Column('timestamp_ist', sa.DateTime(timezone=True), index=True),
        sa.Column('blockchain_tx_id', sa.String(128), nullable=True),
    )

    # === AI ALERTS ===
    op.create_table(
        'ai_alerts',
        sa.Column('alert_id', sa.String(50), primary_key=True),
        sa.Column('tender_id', sa.String(50), sa.ForeignKey('tenders.tender_id'), nullable=False, index=True),
        sa.Column('alert_type', sa.String(30), nullable=False),
        sa.Column('confidence_score', sa.Float, nullable=False),
        sa.Column('risk_score', sa.Integer, nullable=False),
        sa.Column('flagged_entities', sa.JSON, nullable=True),
        sa.Column('evidence', sa.JSON, nullable=True),
        sa.Column('recommended_action', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), server_default='OPEN', index=True),
        sa.Column('scoring_mode', sa.String(20), server_default='RULE_BASED'),
        sa.Column('ml_fraud_probability', sa.Float, nullable=True),
        sa.Column('anomaly_score', sa.Float, nullable=True),
        sa.Column('model_agreement', sa.Boolean, nullable=True),
        sa.Column('created_at_ist', sa.DateTime(timezone=True)),
        sa.Column('reviewed_by_did', sa.String(100), nullable=True),
        sa.Column('reviewed_at_ist', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_ai_alerts_risk', 'ai_alerts', ['risk_score'])
    op.create_index('ix_ai_alerts_status', 'ai_alerts', ['status', 'created_at_ist'])

    # === OFFICER RISK ===
    op.create_table(
        'officer_risk',
        sa.Column('officer_did', sa.String(100), primary_key=True),
        sa.Column('officer_name', sa.String(200), nullable=False),
        sa.Column('ministry_code', sa.String(15), nullable=False, index=True),
        sa.Column('department', sa.String(200), server_default=''),
        sa.Column('cumulative_risk_score', sa.Float, server_default='0.0'),
        sa.Column('total_tenders_managed', sa.Integer, server_default='0'),
        sa.Column('flagged_tenders_count', sa.Integer, server_default='0'),
        sa.Column('frozen_tenders_count', sa.Integer, server_default='0'),
        sa.Column('escalated_count', sa.Integer, server_default='0'),
        sa.Column('trust_score', sa.Float, server_default='100.0'),
        sa.Column('last_activity_ist', sa.DateTime(timezone=True)),
        sa.Column('created_at_ist', sa.DateTime(timezone=True)),
    )
    op.create_index('ix_officer_risk_score', 'officer_risk', ['cumulative_risk_score'])


def downgrade() -> None:
    op.drop_table('officer_risk')
    op.drop_table('ai_alerts')
    op.drop_table('audit_events')
    op.drop_table('bids')
    op.drop_table('tenders')
