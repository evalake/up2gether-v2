from __future__ import annotations

import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import CurrentUser, decode_access_token, issue_access_token
from app.domain.enums import AuthProvider
from app.integrations.google_calendar import GoogleCalendarClient, get_google_calendar_client
from app.models.user import IntegrationAccount

router = APIRouter(tags=["google"], prefix="/google")


@router.get("/connect")
async def google_connect(
    actor: CurrentUser,
    client: Annotated[GoogleCalendarClient, Depends(get_google_calendar_client)],
) -> dict:
    # state carrega jwt do actor pra o callback saber quem e
    state = issue_access_token(actor.id, actor.discord_id)
    return {"url": client.auth_url(state)}


@router.get("/callback")
async def google_callback(
    code: Annotated[str, Query()],
    state: Annotated[str, Query()],
    db: Annotated[AsyncSession, Depends(get_db)],
    client: Annotated[GoogleCalendarClient, Depends(get_google_calendar_client)],
) -> RedirectResponse:
    try:
        payload = decode_access_token(state)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "state invalido")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "state sem user")

    tokens = await client.exchange_code(code)
    access = tokens.get("access_token")
    refresh = tokens.get("refresh_token")
    expires_in = int(tokens.get("expires_in", 3600))
    if not access:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "google nao retornou token")

    import uuid as _u

    uid = _u.UUID(user_id)
    existing = (
        await db.execute(
            select(IntegrationAccount).where(
                IntegrationAccount.user_id == uid,
                IntegrationAccount.provider == AuthProvider.GOOGLE,
            )
        )
    ).scalar_one_or_none()
    expires_at = datetime.now(UTC) + timedelta(seconds=expires_in)
    if existing:
        existing.access_token = access
        if refresh:
            existing.refresh_token = refresh
        existing.token_expires_at = expires_at
        existing.external_id = existing.external_id or "primary"
    else:
        db.add(
            IntegrationAccount(
                user_id=uid,
                provider=AuthProvider.GOOGLE,
                external_id="primary",
                access_token=access,
                refresh_token=refresh,
                token_expires_at=expires_at,
            )
        )
    await db.commit()
    return RedirectResponse(url="/settings?google=ok")


@router.get("/status")
async def google_status(actor: CurrentUser) -> dict:
    integ = next(
        (i for i in actor.integrations if i.provider == AuthProvider.GOOGLE),
        None,
    )
    return {"connected": integ is not None and bool(integ.access_token)}


@router.post("/disconnect")
async def google_disconnect(
    actor: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict:
    await db.execute(
        delete(IntegrationAccount).where(
            IntegrationAccount.user_id == actor.id,
            IntegrationAccount.provider == AuthProvider.GOOGLE,
        )
    )
    await db.commit()
    return {"ok": True}
