"""Tests do endpoint de metrics (observability read side)."""

from __future__ import annotations

import pytest

from app.core.config import get_settings
from app.services.events import (
    EVENT_GROUP_CREATED,
    EVENT_MEMBER_ACTIVATED,
    EVENT_SESSION_COMPLETED,
    EVENT_SESSION_CREATED,
    EVENT_VOTE_CAST,
    track_event,
)

pytestmark = pytest.mark.asyncio


@pytest.fixture
def as_sys_admin(monkeypatch):
    """Injeta discord_id do user como sys admin no settings cached."""

    def _setup(discord_id: str) -> None:
        settings = get_settings()
        current = list(settings.sys_admin_discord_ids)
        if discord_id not in current:
            monkeypatch.setattr(
                settings, "sys_admin_discord_ids", [*current, discord_id], raising=False
            )

    return _setup


async def test_metrics_endpoint_requires_sys_admin(make_user, auth_headers, client):
    user = await make_user(username="regular")
    res = await client.get("/api/admin/metrics/events", headers=auth_headers(user))
    assert res.status_code == 403


async def test_metrics_endpoint_returns_counts(
    make_user, auth_headers, client, db_session, as_sys_admin
):
    admin = await make_user(discord_id="admin-1", username="boss")
    as_sys_admin(admin.discord_id)

    # semeia events: 2 session_created, 3 vote_cast, 1 member_activated
    for _ in range(2):
        await track_event(db_session, EVENT_SESSION_CREATED, user_id=admin.id)
    for _ in range(3):
        await track_event(db_session, EVENT_VOTE_CAST, user_id=admin.id)
    await track_event(db_session, EVENT_MEMBER_ACTIVATED, user_id=admin.id)
    await db_session.commit()

    res = await client.get("/api/admin/metrics/events", headers=auth_headers(admin))
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["totals"][EVENT_SESSION_CREATED] == 2
    assert body["totals"][EVENT_VOTE_CAST] == 3
    assert body["totals"][EVENT_MEMBER_ACTIVATED] == 1
    assert body["last_7d"][EVENT_VOTE_CAST] == 3
    assert body["seats_activated"] == 1


async def test_metrics_seats_counts_distinct_users(
    make_user, auth_headers, client, db_session, as_sys_admin
):
    admin = await make_user(discord_id="admin-2", username="boss2")
    as_sys_admin(admin.discord_id)

    u1 = await make_user(discord_id="u1", username="u1")
    u2 = await make_user(discord_id="u2", username="u2")

    # u1 ativa uma vez, u2 ativa duas (nao devia, mas so pra testar distinct)
    await track_event(db_session, EVENT_MEMBER_ACTIVATED, user_id=u1.id)
    await track_event(db_session, EVENT_MEMBER_ACTIVATED, user_id=u2.id)
    await track_event(db_session, EVENT_MEMBER_ACTIVATED, user_id=u2.id)
    await db_session.commit()

    res = await client.get("/api/admin/metrics/events", headers=auth_headers(admin))
    assert res.status_code == 200
    assert res.json()["seats_activated"] == 2


async def test_metrics_top_groups(make_user, auth_headers, client, db_session, as_sys_admin):
    import uuid

    admin = await make_user(discord_id="admin-3", username="boss3")
    as_sys_admin(admin.discord_id)

    r1 = await client.post(
        "/api/groups",
        json={"discord_guild_id": "tg-1", "name": "ativo"},
        headers=auth_headers(admin),
    )
    r2 = await client.post(
        "/api/groups",
        json={"discord_guild_id": "tg-2", "name": "parado"},
        headers=auth_headers(admin),
    )
    g1_id = uuid.UUID(r1.json()["id"])
    g2_id = uuid.UUID(r2.json()["id"])

    # g1 recebe 3 events adicionais, g2 recebe 1 adicional
    for _ in range(3):
        await track_event(db_session, EVENT_VOTE_CAST, user_id=admin.id, group_id=g1_id)
    await track_event(db_session, EVENT_SESSION_CREATED, user_id=admin.id, group_id=g2_id)
    await db_session.commit()

    res = await client.get("/api/admin/metrics/events", headers=auth_headers(admin))
    assert res.status_code == 200
    top = res.json()["top_groups"]
    # achar as entradas por id (group_created tambem conta)
    by_id = {t["group_id"]: t for t in top}
    assert str(g1_id) in by_id
    assert str(g2_id) in by_id
    assert by_id[str(g1_id)]["events_28d"] > by_id[str(g2_id)]["events_28d"]
    assert by_id[str(g1_id)]["name"] == "ativo"


async def test_metrics_health_kpis(make_user, auth_headers, client, db_session, as_sys_admin):
    import uuid

    admin = await make_user(discord_id="admin-health", username="health")
    as_sys_admin(admin.discord_id)

    # 3 grupos criados, 2 deles receberam sessao (activated)
    r1 = await client.post(
        "/api/groups",
        json={"discord_guild_id": "hg-1", "name": "g1"},
        headers=auth_headers(admin),
    )
    r2 = await client.post(
        "/api/groups",
        json={"discord_guild_id": "hg-2", "name": "g2"},
        headers=auth_headers(admin),
    )
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "hg-3", "name": "g3"},
        headers=auth_headers(admin),
    )
    g1 = uuid.UUID(r1.json()["id"])
    g2 = uuid.UUID(r2.json()["id"])

    # g1 teve 2 sessoes criadas, 1 concluida. g2 teve 1 criada, 0 concluida
    await track_event(db_session, EVENT_SESSION_CREATED, user_id=admin.id, group_id=g1)
    await track_event(db_session, EVENT_SESSION_CREATED, user_id=admin.id, group_id=g1)
    await track_event(db_session, EVENT_SESSION_COMPLETED, user_id=admin.id, group_id=g1)
    await track_event(db_session, EVENT_SESSION_CREATED, user_id=admin.id, group_id=g2)
    await db_session.commit()

    res = await client.get("/api/admin/metrics/events", headers=auth_headers(admin))
    assert res.status_code == 200
    body = res.json()
    # activation = grupos com >= 1 session_created / total de grupos criados
    assert body["groups_created_total"] >= 3
    assert body["groups_with_session"] == 2
    # 2/3 grupos tiveram pelo menos 1 sessao
    assert 0.66 <= body["activation_rate"] <= 0.67
    # sessoes criadas = 3, concluidas = 1 -> completion rate = 0.33
    assert body["sessions_created_28d"] == 3
    assert body["sessions_completed_28d"] == 1
    assert 0.33 <= body["session_completion_rate_28d"] <= 0.34


async def test_metrics_health_kpis_empty_safe(
    make_user, auth_headers, client, db_session, as_sys_admin
):
    admin = await make_user(discord_id="admin-empty", username="empty")
    as_sys_admin(admin.discord_id)

    res = await client.get("/api/admin/metrics/events", headers=auth_headers(admin))
    assert res.status_code == 200
    body = res.json()
    # sem grupos nenhum, rates viram 0 (nunca dividir por zero)
    assert body["groups_created_total"] == 0
    assert body["groups_with_session"] == 0
    assert body["activation_rate"] == 0
    assert body["session_completion_rate_28d"] == 0
    # precisa aceitar mesmo sem dado, nao e erro
    assert (
        EVENT_GROUP_CREATED not in body.get("totals", {})
        or body["totals"][EVENT_GROUP_CREATED] >= 0
    )


async def test_metrics_daily_series(make_user, auth_headers, client, db_session, as_sys_admin):
    admin = await make_user(discord_id="admin-4", username="boss4")
    as_sys_admin(admin.discord_id)

    # 2 events hoje, deveriam aparecer no ultimo bucket
    await track_event(db_session, EVENT_VOTE_CAST, user_id=admin.id)
    await track_event(db_session, EVENT_SESSION_CREATED, user_id=admin.id)
    await db_session.commit()

    res = await client.get("/api/admin/metrics/events", headers=auth_headers(admin))
    assert res.status_code == 200
    series = res.json()["daily_28d"]
    assert len(series) == 28
    # cada entry tem date + count
    assert "date" in series[0] and "count" in series[0]
    # total na serie bate com soma dos events
    total = sum(p["count"] for p in series)
    assert total >= 2
