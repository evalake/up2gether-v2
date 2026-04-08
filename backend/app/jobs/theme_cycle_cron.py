"""Cron pra abrir ciclo de tema automaticamente.

Roda 1x por dia. Se faltam <=5 dias pro fim do mes e nao existe ciclo
nem tema definido pro mes corrente, abre o ciclo direto em VOTING.
"""
from __future__ import annotations

import calendar
from datetime import UTC, datetime

import structlog
from sqlalchemy import select

from app.core.database import SessionLocal
from app.domain.enums import ThemeCyclePhase
from app.models.group import Group
from app.models.theme import MonthlyTheme, ThemeCycle

log = structlog.get_logger()


async def auto_open_theme_cycles() -> None:
    now = datetime.now(UTC)
    last_day = calendar.monthrange(now.year, now.month)[1]
    days_left = last_day - now.day
    if days_left > 5:
        return
    month = now.strftime("%Y-%m")
    async with SessionLocal() as db:
        groups = (await db.execute(select(Group))).scalars().all()
        opened = 0
        for g in groups:
            theme = (
                await db.execute(
                    select(MonthlyTheme).where(
                        MonthlyTheme.group_id == g.id, MonthlyTheme.month_year == month
                    )
                )
            ).scalar_one_or_none()
            if theme:
                continue
            cycle = (
                await db.execute(
                    select(ThemeCycle).where(
                        ThemeCycle.group_id == g.id, ThemeCycle.month_year == month
                    )
                )
            ).scalar_one_or_none()
            if cycle and cycle.phase != ThemeCyclePhase.CANCELLED:
                continue
            db.add(
                ThemeCycle(
                    group_id=g.id,
                    month_year=month,
                    phase=ThemeCyclePhase.VOTING,
                    opened_by=None,
                )
            )
            opened += 1
        if opened:
            await db.commit()
            log.info("theme_cycle_cron.opened", count=opened, month=month)
