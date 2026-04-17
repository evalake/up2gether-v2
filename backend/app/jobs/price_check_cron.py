"""Cron que checa precos na Steam e notifica grupos quando muda.

Roda a cada 6h. Pega todos os jogos com steam_appid, agrupa por appid
pra nao bater na API repetido, compara preco, e dispara notify_group
quando tem mudanca relevante.
"""

from __future__ import annotations

import asyncio

import structlog
from sqlalchemy import select

from app.core.database import SessionLocal
from app.integrations.steam import HttpSteamClient
from app.models.game import Game
from app.services.notifications import notify_group

log = structlog.get_logger()

# rate limit: 1 req/seg pra nao tomar ban da steam
_DELAY_BETWEEN_REQUESTS = 1.2


async def check_game_prices() -> None:
    client = HttpSteamClient()
    async with SessionLocal() as db:
        games = (
            (
                await db.execute(
                    select(Game).where(
                        Game.steam_appid.isnot(None),
                        Game.archived_at.is_(None),
                    )
                )
            )
            .scalars()
            .all()
        )

        if not games:
            return

        by_appid: dict[int, list[Game]] = {}
        for g in games:
            by_appid.setdefault(g.steam_appid, []).append(g)

        updated = 0
        notified = 0

        for appid, group_games in by_appid.items():
            try:
                details = await client.get_details(appid)
            except Exception:
                log.warning("price_check.fetch_failed", appid=appid)
                await asyncio.sleep(_DELAY_BETWEEN_REQUESTS)
                continue

            raw_price = details.get("price")
            raw_initial = details.get("price_initial")
            discount = details.get("discount_percent") or 0

            new_price = round(raw_price / 100, 2) if raw_price else None
            new_original = round(raw_initial / 100, 2) if raw_initial else None

            for game in group_games:
                old_price = game.price_current
                old_discount = game.discount_percent or 0

                price_changed = (
                    old_price is not None and new_price is not None and old_price != new_price
                )
                promo_started = old_discount == 0 and discount > 0
                promo_ended = old_discount > 0 and discount == 0

                if new_price is not None:
                    game.price_current = new_price
                if new_original is not None:
                    game.price_original = new_original
                game.discount_percent = discount

                if not (price_changed or promo_started or promo_ended):
                    continue

                updated += 1

                if promo_started and new_price is not None:
                    title = f"{game.name} em promoção! -{discount}%"
                    body = f"De R$ {new_original:.2f} por R$ {new_price:.2f}"
                    webhook_fields = [
                        {
                            "name": "Preço",
                            "value": f"~~R$ {new_original:.2f}~~ **R$ {new_price:.2f}**",
                            "inline": True,
                        },
                        {"name": "Desconto", "value": f"-{discount}%", "inline": True},
                    ]
                elif promo_ended and new_price is not None:
                    title = f"Promoção de {game.name} encerrou"
                    body = f"Preço voltou para R$ {new_price:.2f}"
                    webhook_fields = [
                        {"name": "Preço atual", "value": f"R$ {new_price:.2f}", "inline": True},
                    ]
                elif price_changed and new_price is not None:
                    direction = "baixou" if new_price < old_price else "subiu"
                    title = f"Preço de {game.name} {direction}"
                    body = f"R$ {old_price:.2f} → R$ {new_price:.2f}"
                    webhook_fields = [
                        {"name": "Antes", "value": f"R$ {old_price:.2f}", "inline": True},
                        {"name": "Agora", "value": f"R$ {new_price:.2f}", "inline": True},
                    ]
                else:
                    continue

                await notify_group(
                    db,
                    group_id=game.group_id,
                    event="game.price_changed",
                    title=title,
                    body=body,
                    link=f"/groups/{game.group_id}/games/{game.id}",
                    data={"game_id": str(game.id), "discount_percent": discount},
                    webhook_description=body,
                    webhook_fields=webhook_fields,
                    webhook_thumbnail_url=game.cover_url,
                )
                notified += 1

            await asyncio.sleep(_DELAY_BETWEEN_REQUESTS)

        if updated:
            await db.commit()
            log.info("price_check.done", updated=updated, notified=notified)
