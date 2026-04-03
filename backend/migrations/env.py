"""
TenderShield — Alembic Migration Environment
Configures async SQLAlchemy engine for database schema migrations.
"""

import asyncio
import os
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Alembic Config object
config = context.config

# Setup logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Import our models so metadata is populated
from backend.db.engine import Base
from backend.db import orm_models  # noqa: F401

target_metadata = Base.metadata


def get_url() -> str:
    """Get database URL from environment or config."""
    raw = os.getenv("DATABASE_URL", config.get_main_option("sqlalchemy.url", ""))
    # Convert async URLs to sync for Alembic (it uses sync internally)
    if "aiosqlite" in raw:
        return raw.replace("+aiosqlite", "")
    if "asyncpg" in raw:
        return raw.replace("+asyncpg", "+psycopg2")
    return raw


def run_migrations_offline() -> None:
    """
    Run migrations in 'offline' mode — generates SQL without connecting.
    """
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Run migrations with async engine."""
    from backend.db.engine import engine
    async with engine.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await engine.dispose()


def run_migrations_online() -> None:
    """
    Run migrations in 'online' mode — connects to the database.
    Supports both sync and async engines.
    """
    try:
        # Try async first (for asyncpg/aiosqlite)
        asyncio.run(run_async_migrations())
    except Exception:
        # Fallback to sync
        from sqlalchemy import create_engine
        connectable = create_engine(get_url())
        with connectable.connect() as connection:
            do_run_migrations(connection)


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
