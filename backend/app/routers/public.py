from __future__ import annotations

import html
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.domain.enums import SessionRsvp
from app.models.game import Game
from app.models.group import Group
from app.models.session import PlaySession, SessionRsvpRow

router = APIRouter(tags=["public"])

# user-agents de crawlers que precisam de OG tags
_BOT_UA = (
    "bot",
    "crawler",
    "spider",
    "preview",
    "embed",
    "slack",
    "discord",
    "telegram",
    "whatsapp",
    "facebook",
    "twitter",
)


class PublicSessionCard(BaseModel):
    id: uuid.UUID
    group_id: uuid.UUID
    title: str
    start_at: str
    duration_minutes: int
    game_name: str | None
    game_cover_url: str | None = None
    group_name: str
    group_icon_url: str | None = None
    group_splash_url: str | None = None
    rsvp_yes: int
    rsvp_maybe: int


@router.get("/public/sessions/{session_id}", response_model=PublicSessionCard)
async def public_session(
    session_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> PublicSessionCard:
    s = await db.get(PlaySession, session_id)
    if s is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "session not found")
    g = await db.get(Group, s.group_id)
    game = await db.get(Game, s.game_id) if s.game_id else None
    rows = (
        (await db.execute(select(SessionRsvpRow).where(SessionRsvpRow.session_id == s.id)))
        .scalars()
        .all()
    )
    yes = sum(1 for r in rows if r.status == SessionRsvp.YES)
    maybe = sum(1 for r in rows if r.status == SessionRsvp.MAYBE)
    return PublicSessionCard(
        id=s.id,
        group_id=s.group_id,
        title=s.title,
        start_at=s.start_at.isoformat(),
        duration_minutes=s.duration_minutes,
        game_name=game.name if game else None,
        game_cover_url=game.cover_url if game else None,
        group_name=g.name if g else "",
        group_icon_url=g.icon_url if g else None,
        group_splash_url=g.splash_url if g else None,
        rsvp_yes=yes,
        rsvp_maybe=maybe,
    )


def _is_bot(request: Request) -> bool:
    ua = (request.headers.get("user-agent") or "").lower()
    return any(b in ua for b in _BOT_UA)


@router.get("/share/sessions/{session_id}")
async def share_session_page(
    session_id: uuid.UUID,
    request: Request,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> HTMLResponse:
    """Serve OG meta tags pra crawlers (Discord/WhatsApp/etc).

    Browsers reais recebem redirect pro SPA.
    """
    s = await db.get(PlaySession, session_id)
    if s is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "session not found")

    frontend = "https://up2gether.vercel.app"
    spa_url = f"{frontend}/share/sessions/{session_id}"

    if not _is_bot(request):
        return HTMLResponse(
            f'<html><head><meta http-equiv="refresh" content="0;url={spa_url}"></head></html>',
            status_code=302,
            headers={"Location": spa_url},
        )

    g = await db.get(Group, s.group_id)
    game = await db.get(Game, s.game_id) if s.game_id else None
    rows = (
        (await db.execute(select(SessionRsvpRow).where(SessionRsvpRow.session_id == s.id)))
        .scalars()
        .all()
    )
    yes_count = sum(1 for r in rows if r.status == SessionRsvp.YES)

    title = html.escape(s.title)
    group_name = html.escape(g.name if g else "")
    game_name = html.escape(game.name if game else "")

    start = s.start_at
    when = start.strftime("%d/%m %H:%M") if start else ""
    desc_parts = []
    if game_name and game_name != title:
        desc_parts.append(game_name)
    if when:
        desc_parts.append(when)
    if yes_count:
        desc_parts.append(f"{yes_count} confirmado{'s' if yes_count > 1 else ''}")
    description = html.escape(" // ".join(desc_parts)) if desc_parts else group_name

    # og:image: splash > game cover > group icon
    og_image = ""
    img_url = (
        (g.splash_url if g else None)
        or (game.cover_url if game else None)
        or (g.icon_url if g else None)
    )
    if img_url:
        og_image = f'<meta property="og:image" content="{html.escape(img_url)}" />'

    return HTMLResponse(f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta property="og:type" content="website" />
<meta property="og:title" content="{title} - {group_name}" />
<meta property="og:description" content="{description}" />
<meta property="og:url" content="{spa_url}" />
{og_image}
<meta name="theme-color" content="#ff6600" />
<meta http-equiv="refresh" content="0;url={spa_url}" />
<title>{title}</title>
</head>
<body></body>
</html>""")
