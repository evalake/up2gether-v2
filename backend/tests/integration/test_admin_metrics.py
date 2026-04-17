"""Tests do endpoint de metrics (observability read side)."""

from __future__ import annotations

import pytest

from app.core.config import get_settings
from app.services.events import (
    EVENT_GROUP_CREATED,
    EVENT_LANDING_VISIT,
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


async def test_metrics_top_referrers(make_user, auth_headers, client, db_session, as_sys_admin):
    """top_referrers: agrega payload->>'ref' dos events member_activated.
    util pra saber qual streamer/canal trouxe signups.
    """
    admin = await make_user(discord_id="admin-ref", username="ref")
    as_sys_admin(admin.discord_id)

    u1 = await make_user()
    u2 = await make_user()
    u3 = await make_user()
    u4 = await make_user()

    await track_event(
        db_session, EVENT_MEMBER_ACTIVATED, user_id=u1.id, payload={"ref": "streamerA"}
    )
    await track_event(
        db_session, EVENT_MEMBER_ACTIVATED, user_id=u2.id, payload={"ref": "streamerA"}
    )
    await track_event(
        db_session, EVENT_MEMBER_ACTIVATED, user_id=u3.id, payload={"ref": "streamerB"}
    )
    # sem ref nao conta
    await track_event(db_session, EVENT_MEMBER_ACTIVATED, user_id=u4.id, payload={})
    await db_session.commit()

    res = await client.get("/api/admin/metrics/events", headers=auth_headers(admin))
    assert res.status_code == 200
    top = res.json()["top_referrers"]
    by_ref = {t["ref"]: t["count"] for t in top}
    assert by_ref["streamerA"] == 2
    assert by_ref["streamerB"] == 1
    assert len(top) == 2  # sem ref nao gera entry
    # refs nao-uuid vem com user_name null
    for t in top:
        assert t["user_name"] is None


async def test_metrics_top_referrers_resolves_uuid_to_user(
    make_user, auth_headers, client, db_session, as_sys_admin
):
    """Quando o ref e um uuid de user valido, top_referrers resolve pro display_name."""
    admin = await make_user(discord_id="admin-refu", username="refu")
    as_sys_admin(admin.discord_id)

    referrer = await make_user(username="the_host")
    u1 = await make_user()
    u2 = await make_user()

    await track_event(
        db_session,
        EVENT_MEMBER_ACTIVATED,
        user_id=u1.id,
        payload={"ref": str(referrer.id)},
    )
    await track_event(
        db_session,
        EVENT_MEMBER_ACTIVATED,
        user_id=u2.id,
        payload={"ref": str(referrer.id)},
    )
    await db_session.commit()

    res = await client.get("/api/admin/metrics/events", headers=auth_headers(admin))
    top = res.json()["top_referrers"]
    assert len(top) == 1
    assert top[0]["ref"] == str(referrer.id)
    assert top[0]["count"] == 2
    assert top[0]["user_name"] == referrer.discord_username


async def test_metrics_active_groups(make_user, auth_headers, client, db_session, as_sys_admin):
    """active_groups_1d / 7d / 28d: distinct groups com qualquer evento no periodo.
    metrica #1 do BUSINESS.md ("Servidores ativos" = DAU/WAU por server).
    """
    import uuid

    admin = await make_user(discord_id="admin-active", username="act")
    as_sys_admin(admin.discord_id)

    r1 = await client.post(
        "/api/groups",
        json={"discord_guild_id": "ag-1", "name": "a"},
        headers=auth_headers(admin),
    )
    r2 = await client.post(
        "/api/groups",
        json={"discord_guild_id": "ag-2", "name": "b"},
        headers=auth_headers(admin),
    )
    g1 = uuid.UUID(r1.json()["id"])
    g2 = uuid.UUID(r2.json()["id"])

    await track_event(db_session, EVENT_VOTE_CAST, user_id=admin.id, group_id=g1)
    await track_event(db_session, EVENT_VOTE_CAST, user_id=admin.id, group_id=g1)
    await track_event(db_session, EVENT_SESSION_CREATED, user_id=admin.id, group_id=g2)
    await db_session.commit()

    res = await client.get("/api/admin/metrics/events", headers=auth_headers(admin))
    assert res.status_code == 200
    body = res.json()
    assert body["active_groups_1d"] == 2
    assert body["active_groups_7d"] == 2
    assert body["active_groups_28d"] == 2
    assert body["active_users_7d"] == 1
    assert body["dormant_groups"] == 0


async def test_metrics_dormant_groups(make_user, auth_headers, client, db_session, as_sys_admin):
    """dormant: grupos que tinham atividade em 28-56d mas silenciaram nos ultimos 28d.
    Serve pra reengagement (email, DM). Se dormant_groups >> active_groups_28d, churn.
    """
    import uuid
    from datetime import UTC, datetime, timedelta

    from app.models.event import Event

    admin = await make_user(discord_id="admin-dormant", username="dorm")
    as_sys_admin(admin.discord_id)

    r1 = await client.post(
        "/api/groups",
        json={"discord_guild_id": "dg-1", "name": "churned"},
        headers=auth_headers(admin),
    )
    r2 = await client.post(
        "/api/groups",
        json={"discord_guild_id": "dg-2", "name": "retained"},
        headers=auth_headers(admin),
    )
    g1 = uuid.UUID(r1.json()["id"])
    g2 = uuid.UUID(r2.json()["id"])

    # backdate os events de criacao (auto gerados pelo POST) pra 40d atras,
    # se nao g1 tb conta como ativo em 28d
    old = datetime.now(UTC) - timedelta(days=40)
    from sqlalchemy import update as sa_update

    await db_session.execute(
        sa_update(Event).where(Event.group_id.in_([g1, g2])).values(occurred_at=old)
    )
    # g1: atividade 40d atras, nada recente -> dormant
    db_session.add(
        Event(event_type=EVENT_VOTE_CAST, user_id=admin.id, group_id=g1, occurred_at=old)
    )
    # g2: atividade 40d atras + agora -> retained
    await track_event(db_session, EVENT_VOTE_CAST, user_id=admin.id, group_id=g2)
    await db_session.commit()

    res = await client.get("/api/admin/metrics/events", headers=auth_headers(admin))
    assert res.status_code == 200
    body = res.json()
    assert body["dormant_groups"] == 1


async def test_metrics_tier_breakdown(make_user, auth_headers, client, db_session, as_sys_admin):
    """Valida que o dashboard mostra distribuicao de grupos por tier projetado
    + MRR potencial se todos pagassem (ignorando legacy_free). Util pra decidir
    subir/descer limite do Free antes de ligar cobranca.
    """
    import uuid

    from app.models.group import GroupMembership

    admin = await make_user(discord_id="admin-tier", username="tier")
    as_sys_admin(admin.discord_id)

    # 3 grupos, bucketizados por seat count (activated_at not null):
    # - g1: 5 seats -> free
    # - g2: 20 seats -> pro
    # - g3: 50 seats -> community
    r1 = await client.post(
        "/api/groups",
        json={"discord_guild_id": "tg-free", "name": "panela"},
        headers=auth_headers(admin),
    )
    r2 = await client.post(
        "/api/groups",
        json={"discord_guild_id": "tg-pro", "name": "crew"},
        headers=auth_headers(admin),
    )
    r3 = await client.post(
        "/api/groups",
        json={"discord_guild_id": "tg-community", "name": "streamer"},
        headers=auth_headers(admin),
    )
    g1 = uuid.UUID(r1.json()["id"])
    g2 = uuid.UUID(r2.json()["id"])
    g3 = uuid.UUID(r3.json()["id"])

    # criador ja conta 1 seat em cada (activated_at populado). adicionar o resto
    # com activated_at explicito (simula members que logaram via Discord).
    from app.models.base import utcnow

    async def seat(group_id, n):
        for _ in range(n):
            u = await make_user()
            db_session.add(
                GroupMembership(
                    group_id=group_id,
                    user_id=u.id,
                    role="member",
                    activated_at=utcnow(),
                )
            )
        await db_session.commit()

    await seat(g1, 4)  # 1 criador + 4 = 5 seats
    await seat(g2, 19)  # 1 + 19 = 20 seats
    await seat(g3, 49)  # 1 + 49 = 50 seats

    # marca 2 dos 3 como legacy (como se fossem pre-cutoff)
    from sqlalchemy import update

    from app.models.group import Group as GroupModel

    await db_session.execute(
        update(GroupModel).where(GroupModel.id.in_([g1, g2])).values(legacy_free=True)
    )
    await db_session.commit()

    res = await client.get("/api/admin/metrics/events", headers=auth_headers(admin))
    assert res.status_code == 200
    body = res.json()

    tiers = body["groups_by_tier"]
    assert tiers["free"] == 1
    assert tiers["pro"] == 1
    assert tiers["community"] == 1
    assert tiers["creator"] == 0
    assert tiers["over"] == 0

    # MRR se todos pagassem (ignora legacy_free): 29 + 89 = 118
    # free gera 0, over gera 0 (sem tier publico)
    assert body["mrr_if_all_paid_brl"] == 118

    # 2 dos 3 marcados como legacy
    assert body["legacy_groups"] == 2

    # billable MRR: so g3 (community, nao legacy). g1 free nao conta, g2 pro e legacy.
    # projecao realista se cobrar hoje = 89
    assert body["mrr_billable_brl"] == 89
    assert body["groups_billable"] == 1


async def test_metrics_tier_breakdown_empty(
    make_user, auth_headers, client, db_session, as_sys_admin
):
    admin = await make_user(discord_id="admin-tier-empty", username="te")
    as_sys_admin(admin.discord_id)

    res = await client.get("/api/admin/metrics/events", headers=auth_headers(admin))
    assert res.status_code == 200
    body = res.json()
    assert body["groups_by_tier"] == {
        "free": 0,
        "pro": 0,
        "community": 0,
        "creator": 0,
        "over": 0,
    }
    assert body["mrr_if_all_paid_brl"] == 0
    assert body["mrr_billable_brl"] == 0
    assert body["groups_billable"] == 0
    assert body["legacy_groups"] == 0


async def test_metrics_landing_conversion(
    make_user, auth_headers, client, db_session, as_sys_admin
):
    """landing_conversion_rate_28d: signups / landing visits. Topo do funil."""
    admin = await make_user(discord_id="admin-conv", username="conv")
    as_sys_admin(admin.discord_id)

    # 10 visitas, 2 signups -> 20% conversao
    for _ in range(10):
        await track_event(db_session, EVENT_LANDING_VISIT)
    u1 = await make_user()
    u2 = await make_user()
    await track_event(db_session, EVENT_MEMBER_ACTIVATED, user_id=u1.id)
    await track_event(db_session, EVENT_MEMBER_ACTIVATED, user_id=u2.id)
    await db_session.commit()

    res = await client.get("/api/admin/metrics/events", headers=auth_headers(admin))
    assert res.status_code == 200
    body = res.json()
    assert body["landing_visits_28d"] == 10
    # signups inclui o admin + os 2 -> 3 member_activated (admin tambem)
    assert body["signups_28d"] >= 2
    assert body["landing_conversion_rate_28d"] > 0


async def test_metrics_retention_w4(make_user, auth_headers, client, db_session, as_sys_admin):
    """W4 retention: grupos criados 28-56d atras com atividade nos ultimos 14d.
    Metrica #2 BUSINESS.md. Backdate created_at pra entrar no cohort.
    """
    import uuid
    from datetime import UTC, datetime, timedelta

    from sqlalchemy import update as sa_update

    from app.models.event import Event
    from app.models.group import Group as GroupModel

    admin = await make_user(discord_id="admin-ret", username="ret")
    as_sys_admin(admin.discord_id)

    r1 = await client.post(
        "/api/groups",
        json={"discord_guild_id": "rt-1", "name": "retido"},
        headers=auth_headers(admin),
    )
    r2 = await client.post(
        "/api/groups",
        json={"discord_guild_id": "rt-2", "name": "churn"},
        headers=auth_headers(admin),
    )
    g1 = uuid.UUID(r1.json()["id"])
    g2 = uuid.UUID(r2.json()["id"])

    # ambos criados 40d atras (entra no cohort 28-56d)
    old = datetime.now(UTC) - timedelta(days=40)
    await db_session.execute(
        sa_update(GroupModel).where(GroupModel.id.in_([g1, g2])).values(created_at=old)
    )
    # events do POST backdated pra nao poluir janelas recentes
    await db_session.execute(
        sa_update(Event).where(Event.group_id.in_([g1, g2])).values(occurred_at=old)
    )
    # g1 tem atividade agora -> retido. g2 nao tem -> churn.
    await track_event(db_session, EVENT_VOTE_CAST, user_id=admin.id, group_id=g1)
    await db_session.commit()

    res = await client.get("/api/admin/metrics/events", headers=auth_headers(admin))
    assert res.status_code == 200
    body = res.json()
    assert body["cohort_w4_size"] == 2
    assert body["retained_w4"] == 1
    assert body["retention_w4"] == 0.5


async def test_metrics_retention_w4_empty_cohort_safe(
    make_user, auth_headers, client, as_sys_admin
):
    admin = await make_user(discord_id="admin-ret-empty", username="rempty")
    as_sys_admin(admin.discord_id)
    res = await client.get("/api/admin/metrics/events", headers=auth_headers(admin))
    assert res.status_code == 200
    body = res.json()
    assert body["cohort_w4_size"] == 0
    assert body["retention_w4"] == 0


async def test_metrics_landing_conversion_zero_visits_safe(
    make_user, auth_headers, client, as_sys_admin
):
    admin = await make_user(discord_id="admin-conv-empty", username="cempty")
    as_sys_admin(admin.discord_id)
    res = await client.get("/api/admin/metrics/events", headers=auth_headers(admin))
    assert res.status_code == 200
    body = res.json()
    assert body["landing_visits_28d"] == 0
    assert body["landing_conversion_rate_28d"] == 0


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
