from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings


class Base(DeclarativeBase):
    pass


_settings = get_settings()
# Neon (e outros managed PG) exigem TLS. asyncpg nao aceita ?sslmode= na URL,
# entao passamos via connect_args quando o host nao eh local.
_connect_args: dict = {}
if "localhost" not in _settings.database_url and "127.0.0.1" not in _settings.database_url:
    _connect_args["ssl"] = True
engine = create_async_engine(
    _settings.database_url,
    echo=False,
    pool_pre_ping=True,
    connect_args=_connect_args,
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
