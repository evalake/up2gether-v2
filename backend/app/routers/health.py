from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(db: Annotated[AsyncSession, Depends(get_db)]) -> dict[str, str]:
    # Fly tira a maquina do load balancer se isso falhar. select 1 confirma
    # que pool ta vivo, conexao foi feita e DB respondeu. sem checagem o LB
    # roteava pra maquina com DB morto e usuario via 500 em tudo.
    # OSError pega DNS/connection refused que asyncpg nao wrappa.
    try:
        await db.execute(text("SELECT 1"))
    except (SQLAlchemyError, OSError) as e:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "db unreachable") from e
    return {"status": "ok"}
