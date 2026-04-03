"""
============================================================================
TenderShield — Database Engine (SQLAlchemy Async)
============================================================================
Configures the async SQLAlchemy engine and session factory.

Supports two modes:
  • PRODUCTION: PostgreSQL via asyncpg
  • DEVELOPMENT: SQLite via aiosqlite (zero-config)

USAGE:
  from backend.db.engine import get_session, init_db

  async with get_session() as session:
      result = await session.execute(select(TenderORM))

CONFIG:
  Set DATABASE_URL in .env:
    - PostgreSQL: postgresql+asyncpg://user:pass@host:5432/tendershield_db
    - SQLite:     sqlite+aiosqlite:///./tendershield.db
============================================================================
"""

import os
import logging
from typing import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
    AsyncEngine,
)
from sqlalchemy.orm import DeclarativeBase

logger = logging.getLogger("tendershield.db")


# ============================================================================
# Base class for all ORM models
# ============================================================================

class Base(DeclarativeBase):
    """
    SQLAlchemy declarative base.
    All ORM models inherit from this class.
    """
    pass


# ============================================================================
# Engine Configuration
# ============================================================================

def _build_url() -> str:
    """
    Build database URL from environment.
    Converts sync URLs to async driver URLs.
    """
    raw = os.getenv(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./tendershield_dev.db"
    )
    # Convert sync PostgreSQL URL to asyncpg
    if raw.startswith("postgresql://"):
        return raw.replace("postgresql://", "postgresql+asyncpg://", 1)
    if raw.startswith("postgres://"):
        return raw.replace("postgres://", "postgresql+asyncpg://", 1)
    # Convert sync SQLite to aiosqlite
    if raw.startswith("sqlite:///"):
        return raw.replace("sqlite:///", "sqlite+aiosqlite:///", 1)
    return raw


DATABASE_URL = _build_url()

# Determine if using SQLite (for connect_args compatibility)
_is_sqlite = "sqlite" in DATABASE_URL

engine: AsyncEngine = create_async_engine(
    DATABASE_URL,
    echo=os.getenv("DB_ECHO", "false").lower() == "true",
    pool_pre_ping=True,
    **({
        "connect_args": {"check_same_thread": False}
    } if _is_sqlite else {
        "pool_size": 10,
        "max_overflow": 20,
        "pool_recycle": 300,
    }),
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


# ============================================================================
# Session Management
# ============================================================================

@asynccontextmanager
async def get_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Async context manager for database sessions.

    Usage:
        async with get_session() as session:
            result = await session.execute(select(TenderORM))
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def get_session_dep() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency for database sessions.

    Usage:
        @router.get("/tenders")
        async def list_tenders(session: AsyncSession = Depends(get_session_dep)):
            ...
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


# ============================================================================
# Initialization
# ============================================================================

async def init_db():
    """
    Create all database tables.
    Called during application startup.
    """
    async with engine.begin() as conn:
        # Import models so they register with Base.metadata
        from backend.db import orm_models  # noqa: F401
        await conn.run_sync(Base.metadata.create_all)

    db_type = "PostgreSQL" if "postgresql" in DATABASE_URL else "SQLite"
    logger.info(f"[Database] ✅ {db_type} initialized — tables created")
    logger.info(f"[Database]    URL: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")


async def dispose_db():
    """Dispose async engine on shutdown."""
    await engine.dispose()
    logger.info("[Database] 🛑 Connection pool disposed")
