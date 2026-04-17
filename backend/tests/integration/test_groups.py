"""Tests do slice Groups + RBAC."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.asyncio


async def test_create_group_makes_creator_admin_and_owner(make_user, auth_headers, client):
    user = await make_user(username="creator")
    res = await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-1", "name": "Squad"},
        headers=auth_headers(user),
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["name"] == "Squad"
    assert body["discord_guild_id"] == "g-1"
    assert body["owner_user_id"] == str(user.id)


async def test_create_existing_group_joins_as_member(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    joiner = await make_user(username="joiner")

    await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-2", "name": "Squad"},
        headers=auth_headers(owner),
    )
    res = await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-2", "name": "Squad"},
        headers=auth_headers(joiner),
    )
    assert res.status_code == 200

    # joiner ve o grupo na lista dele com role member
    res = await client.get("/api/groups", headers=auth_headers(joiner))
    assert res.status_code == 200
    groups = res.json()
    assert len(groups) == 1
    assert groups[0]["user_role"] == "member"
    assert groups[0]["member_count"] == 2


async def test_list_groups_returns_only_user_groups(make_user, auth_headers, client):
    a = await make_user(username="a")
    b = await make_user(username="b")
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-a", "name": "A"},
        headers=auth_headers(a),
    )
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-b", "name": "B"},
        headers=auth_headers(b),
    )

    res = await client.get("/api/groups", headers=auth_headers(a))
    names = [g["name"] for g in res.json()]
    assert names == ["A"]


async def test_get_group_403_for_non_member(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    intruder = await make_user(username="intruder")
    created = (
        await client.post(
            "/api/groups",
            json={"discord_guild_id": "g-3", "name": "X"},
            headers=auth_headers(owner),
        )
    ).json()

    res = await client.get(f"/api/groups/{created['id']}", headers=auth_headers(intruder))
    assert res.status_code == 403


async def test_get_group_404_when_missing(make_user, auth_headers, client):
    user = await make_user()
    res = await client.get(
        "/api/groups/00000000-0000-0000-0000-000000000000", headers=auth_headers(user)
    )
    assert res.status_code == 404


async def test_list_members_returns_all(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    other = await make_user(username="other")
    g = (
        await client.post(
            "/api/groups",
            json={"discord_guild_id": "g-4", "name": "X"},
            headers=auth_headers(owner),
        )
    ).json()
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-4", "name": "X"},
        headers=auth_headers(other),
    )

    res = await client.get(f"/api/groups/{g['id']}/members", headers=auth_headers(owner))
    assert res.status_code == 200
    roles = sorted(m["role"] for m in res.json())
    assert roles == ["admin", "member"]


async def test_update_webhook_only_owner(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    other = await make_user(username="other")
    g = (
        await client.post(
            "/api/groups",
            json={"discord_guild_id": "g-5", "name": "X"},
            headers=auth_headers(owner),
        )
    ).json()
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-5", "name": "X"},
        headers=auth_headers(other),
    )

    valid = "https://discord.com/api/webhooks/123456789012345678/abc-DEF_123xyz"
    # owner consegue
    res = await client.put(
        f"/api/groups/{g['id']}/webhook",
        json={"webhook_url": valid},
        headers=auth_headers(owner),
    )
    assert res.status_code == 204

    # outro nao
    res = await client.put(
        f"/api/groups/{g['id']}/webhook",
        json={"webhook_url": valid},
        headers=auth_headers(other),
    )
    assert res.status_code == 403

    # webhook de dominio estranho e bloqueado (SSRF)
    res = await client.put(
        f"/api/groups/{g['id']}/webhook",
        json={"webhook_url": "http://169.254.169.254/latest/meta-data/"},
        headers=auth_headers(owner),
    )
    assert res.status_code == 422


async def test_leave_group_normal_case(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    member = await make_user(username="member")
    g = (
        await client.post(
            "/api/groups",
            json={"discord_guild_id": "g-6", "name": "X"},
            headers=auth_headers(owner),
        )
    ).json()
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-6", "name": "X"},
        headers=auth_headers(member),
    )

    res = await client.delete(f"/api/groups/{g['id']}/leave", headers=auth_headers(member))
    assert res.status_code == 204

    res = await client.get("/api/groups", headers=auth_headers(member))
    assert res.json() == []


async def test_leave_blocked_when_only_admin(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    g = (
        await client.post(
            "/api/groups",
            json={"discord_guild_id": "g-7", "name": "X"},
            headers=auth_headers(owner),
        )
    ).json()

    res = await client.delete(f"/api/groups/{g['id']}/leave", headers=auth_headers(owner))
    assert res.status_code == 400
    assert "unico admin" in res.json()["detail"]


async def test_delete_group_only_owner(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    other = await make_user(username="other")
    g = (
        await client.post(
            "/api/groups",
            json={"discord_guild_id": "g-8", "name": "X"},
            headers=auth_headers(owner),
        )
    ).json()
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-8", "name": "X"},
        headers=auth_headers(other),
    )

    res = await client.delete(f"/api/groups/{g['id']}", headers=auth_headers(other))
    assert res.status_code == 403

    res = await client.delete(f"/api/groups/{g['id']}", headers=auth_headers(owner))
    assert res.status_code == 204

    # grupo nao existe mais
    res = await client.get(f"/api/groups/{g['id']}", headers=auth_headers(owner))
    assert res.status_code == 404


async def test_promote_to_admin_only_owner(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    target = await make_user(username="target")
    g = (
        await client.post(
            "/api/groups",
            json={"discord_guild_id": "g-9", "name": "X"},
            headers=auth_headers(owner),
        )
    ).json()
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-9", "name": "X"},
        headers=auth_headers(target),
    )

    res = await client.post(
        f"/api/groups/{g['id']}/members/{target.id}/promote",
        json={"new_role": "admin"},
        headers=auth_headers(owner),
    )
    assert res.status_code == 204

    res = await client.get(f"/api/groups/{g['id']}/members", headers=auth_headers(owner))
    target_m = next(m for m in res.json() if m["user_id"] == str(target.id))
    assert target_m["role"] == "admin"


async def test_promote_to_admin_blocked_for_non_owner(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    admin = await make_user(username="admin")
    target = await make_user(username="target")
    g = (
        await client.post(
            "/api/groups",
            json={"discord_guild_id": "g-10", "name": "X"},
            headers=auth_headers(owner),
        )
    ).json()
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-10", "name": "X"},
        headers=auth_headers(admin),
    )
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-10", "name": "X"},
        headers=auth_headers(target),
    )
    # promove admin a admin (so o owner consegue)
    await client.post(
        f"/api/groups/{g['id']}/members/{admin.id}/promote",
        json={"new_role": "admin"},
        headers=auth_headers(owner),
    )
    # admin tenta promover target a admin -> 403
    res = await client.post(
        f"/api/groups/{g['id']}/members/{target.id}/promote",
        json={"new_role": "admin"},
        headers=auth_headers(admin),
    )
    assert res.status_code == 403


async def test_promote_to_mod_owner_or_admin(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    target = await make_user(username="target")
    g = (
        await client.post(
            "/api/groups",
            json={"discord_guild_id": "g-11", "name": "X"},
            headers=auth_headers(owner),
        )
    ).json()
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-11", "name": "X"},
        headers=auth_headers(target),
    )

    res = await client.post(
        f"/api/groups/{g['id']}/members/{target.id}/promote",
        json={"new_role": "mod"},
        headers=auth_headers(owner),
    )
    assert res.status_code == 204


async def test_cannot_self_promote(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    g = (
        await client.post(
            "/api/groups",
            json={"discord_guild_id": "g-12", "name": "X"},
            headers=auth_headers(owner),
        )
    ).json()
    res = await client.post(
        f"/api/groups/{g['id']}/members/{owner.id}/promote",
        json={"new_role": "mod"},
        headers=auth_headers(owner),
    )
    assert res.status_code == 400


async def test_demote_cannot_demote_owner(make_user, auth_headers, client):
    """Owner nao pode ser rebaixado, mesmo que outro admin tente."""
    owner = await make_user(username="owner")
    other_admin = await make_user(username="other_admin")
    g = (
        await client.post(
            "/api/groups",
            json={"discord_guild_id": "g-13", "name": "X"},
            headers=auth_headers(owner),
        )
    ).json()
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-13", "name": "X"},
        headers=auth_headers(other_admin),
    )
    await client.post(
        f"/api/groups/{g['id']}/members/{other_admin.id}/promote",
        json={"new_role": "admin"},
        headers=auth_headers(owner),
    )

    res = await client.post(
        f"/api/groups/{g['id']}/members/{owner.id}/demote",
        headers=auth_headers(other_admin),
    )
    assert res.status_code == 400


async def test_demote_admin_only_by_owner(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    a1 = await make_user(username="a1")
    a2 = await make_user(username="a2")
    g = (
        await client.post(
            "/api/groups",
            json={"discord_guild_id": "g-14", "name": "X"},
            headers=auth_headers(owner),
        )
    ).json()
    for u in (a1, a2):
        await client.post(
            "/api/groups",
            json={"discord_guild_id": "g-14", "name": "X"},
            headers=auth_headers(u),
        )
        await client.post(
            f"/api/groups/{g['id']}/members/{u.id}/promote",
            json={"new_role": "admin"},
            headers=auth_headers(owner),
        )

    # a1 (admin) tenta rebaixar a2 (admin) -> 403
    res = await client.post(
        f"/api/groups/{g['id']}/members/{a2.id}/demote",
        headers=auth_headers(a1),
    )
    assert res.status_code == 403

    # owner rebaixa a2 -> ok
    res = await client.post(
        f"/api/groups/{g['id']}/members/{a2.id}/demote",
        headers=auth_headers(owner),
    )
    assert res.status_code == 204


async def test_get_group_exposes_seat_and_tier(make_user, auth_headers, client, db_session):
    """Dono ve seat_count, tier, seat_limit, legacy_free no /api/groups/{id}.
    Seat so conta quando user ativa (primeiro login via discord -> activated_at).
    """
    from datetime import UTC, datetime

    from sqlalchemy import update as sa_update

    from app.models.group import GroupMembership

    owner = await make_user(username="seats")
    res = await client.post(
        "/api/groups",
        json={"discord_guild_id": "seat-g", "name": "Squad"},
        headers=auth_headers(owner),
    )
    assert res.status_code == 200
    gid = res.json()["id"]

    # zera activated_at pra forcar seat = 0 (o membership do owner comeca ativado)
    await db_session.execute(
        sa_update(GroupMembership)
        .where(GroupMembership.user_id == owner.id)
        .values(activated_at=None)
    )
    await db_session.commit()

    r = await client.get(f"/api/groups/{gid}", headers=auth_headers(owner))
    assert r.status_code == 200
    body = r.json()
    assert body["seat_count"] == 0
    assert body["tier"] == "free"
    assert body["seat_limit"] == 10
    assert body["legacy_free"] is False

    # ativa owner -> seat vira 1, ainda free
    await db_session.execute(
        sa_update(GroupMembership)
        .where(GroupMembership.user_id == owner.id)
        .values(activated_at=datetime.now(UTC))
    )
    await db_session.commit()

    r = await client.get(f"/api/groups/{gid}", headers=auth_headers(owner))
    body = r.json()
    assert body["seat_count"] == 1
    assert body["tier"] == "free"
