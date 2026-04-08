"""
============================================================================
TenderShield — Application Configuration
============================================================================
Centralized configuration management using pydantic-settings.
Loads from .env file with IST timezone defaults.
============================================================================
"""

import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # --- Application ---
    APP_NAME: str = "TenderShield"
    APP_VERSION: str = "1.0.0"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000

    # --- JWT Authentication ---
    JWT_SECRET_KEY: str = "your-256-bit-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- Hyperledger Fabric ---
    FABRIC_LIVE: bool = False  # Set True when real Fabric network is running
    FABRIC_CHANNEL_NAME: str = "tenderchannel"
    FABRIC_AUDIT_CHANNEL_NAME: str = "auditchannel"
    FABRIC_CHAINCODE_NAME: str = "tendershield"
    FABRIC_GATEWAY_PEER: str = "peer0.ministry.tendershield.gov.in"
    FABRIC_GATEWAY_PEER_ENDPOINT: str = "localhost:7051"
    FABRIC_GATEWAY_PORT: int = 7051
    FABRIC_WALLET_PATH: str = "./wallet"

    # --- PostgreSQL ---
    DATABASE_URL: str = "postgresql://tendershield_admin:change-this@localhost:5432/tendershield_db"

    # --- Redis ---
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""
    REDIS_CACHE_TTL_SECONDS: int = 300

    # --- Kafka ---
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:9092"
    KAFKA_TENDER_EVENTS_TOPIC: str = "tender-events"
    KAFKA_BID_EVENTS_TOPIC: str = "bid-events"
    KAFKA_AI_ALERTS_TOPIC: str = "ai-alerts"
    KAFKA_AUDIT_EVENTS_TOPIC: str = "audit-events"

    # --- CORS ---
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,https://tendershield.vercel.app"

    # --- AI Engine ---
    AI_ENGINE_URL: str = "http://localhost:8001"
    AI_RISK_THRESHOLD_HIGH: int = 75
    AI_AUTO_FREEZE_ENABLED: bool = True

    # --- Indian Government APIs ---
    GEM_API_BASE_URL: str = "https://api.gem.gov.in/v1"
    GEM_API_KEY: str = ""
    GEM_SANDBOX_MODE: bool = True
    AADHAAR_SANDBOX_MODE: bool = True

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
