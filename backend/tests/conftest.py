"""Test infra Akita-style: Postgres real via testcontainers, HTTP real via ASGI.

Nada de mock de banco. Cada teste roda contra um Postgres em container efemero,
com schema recriado por funcao. Requer Docker Desktop rodando.
"""

from __future__ import annotations

import os
from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncEngine, async_sessionmaker, create_async_engine
from testcontainers.postgres import PostgresContainer

# forca variaveis minimas antes de importar app.core.config
os.environ.setdefault("JWT_SECRET", "test-secret-that-is-long-enough-for-validation")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://placeholder/placeholder")

from app.core.database import Base, get_db
from app.main import create_app


@pytest.fixture(scope="session")
def postgres_url() -> AsyncGenerator[str, None]:
    with PostgresContainer("postgres:16-alpine", driver="asyncpg") as pg:
        yield pg.get_connection_url()


@pytest_asyncio.fixture
async def engine(postgres_url: str) -> AsyncGenerator[AsyncEngine, None]:
    eng = create_async_engine(postgres_url, echo=False, future=True)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    try:
        yield eng
    finally:
        async with eng.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
        await eng.dispose()


@pytest_asyncio.fixture
async def db_session(engine: AsyncEngine):
    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session


@pytest_asyncio.fixture
async def app_client() -> AsyncGenerator[AsyncClient, None]:
    """HTTP client leve, sem banco. Pra smoke tests que nao tocam DB."""
    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def app(db_session):
    """FastAPI app com get_db sobrescrito pra apontar pra session do testcontainer."""
    application = create_app()

    async def _override_db():
        yield db_session

    application.dependency_overrides[get_db] = _override_db
    return application


@pytest_asyncio.fixture
async def client(app) -> AsyncGenerator[AsyncClient, None]:
    """HTTP client com Postgres real via testcontainers. Requer Docker."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def make_user(db_session):
    """Factory pra criar User no banco do teste."""
    from app.models.user import User

    counter = {"n": 0}

    async def _make(discord_id: str | None = None, username: str = "user"):
        counter["n"] += 1
        user = User(
            discord_id=discord_id or f"discord-{counter['n']}",
            discord_username=f"{username}{counter['n']}",
            settings={},
        )
        # init colecoes pra evitar lazy load em instancia fresh
        user.integrations = []
        user.hardware_profile = None
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)
        return user

    return _make


@pytest.fixture
def auth_headers():
    """Helper que constroi headers Authorization a partir de um User."""
    from app.core.security import issue_access_token

    def _headers(user) -> dict[str, str]:
        token = issue_access_token(user.id, user.discord_id)
        return {"Authorization": f"Bearer {token}"}

    return _headers
