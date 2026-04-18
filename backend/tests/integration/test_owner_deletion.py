"""Tests pro fluxo de delete account quando o user e owner de grupos.

Cobre 4 tiers de fallback:
1. tem admin -> promove o admin mais antigo
2. so tem mod -> promove o mod mais antigo a admin
3. so tem member -> promove o member mais antigo a admin
4. owner sozinho -> deleta o grupo (libera discord_guild_id)
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import select

from app.models.group import Group, GroupMembership

pytestmark = pytest.mark.asyncio


async def _make_group(client, owner, auth_headers, guild_id: str, name: str = "Squad") -> str:
    res = await client.post(
        "/api/groups",
        json={"discord_guild_id": guild_id, "name": name},
        headers=auth_headers(owner),
    )
    assert res.status_code == 200, res.text
    return res.json()["id"]


async def _join(client, user, auth_headers, guild_id: str, name: str = "Squad") -> None:
    res = await client.post(
        "/api/groups",
        json={"discord_guild_id": guild_id, "name": name},
        headers=auth_headers(user),
    )
    assert res.status_code == 200, res.text


async def _set_role(db_session, group_id: str, user_id, role: str) -> None:
    m = (
        await db_session.execute(
            select(GroupMembership).where(
                GroupMembership.group_id == group_id, GroupMembership.user_id == user_id
            )
        )
    ).scalar_one()
    m.role = role
    await db_session.commit()


async def _set_joined_at(db_session, group_id: str, user_id, when: datetime) -> None:
    m = (
        await db_session.execute(
            select(GroupMembership).where(
                GroupMembership.group_id == group_id, GroupMembership.user_id == user_id
            )
        )
    ).scalar_one()
    m.joined_at = when
    await db_session.commit()


async def test_owner_delete_promotes_oldest_admin(make_user, auth_headers, client, db_session):
    owner = await make_user(username="o")
    a_old = await make_user(username="a_old")
    a_new = await make_user(username="a_new")
    mod = await make_user(username="mod")

    gid = await _make_group(client, owner, auth_headers, "od-1")
    await _join(client, a_old, auth_headers, "od-1")
    await _join(client, a_new, auth_headers, "od-1")
    await _join(client, mod, auth_headers, "od-1")

    await _set_role(db_session, gid, a_old.id, "admin")
    await _set_role(db_session, gid, a_new.id, "admin")
    await _set_role(db_session, gid, mod.id, "mod")

    base = datetime.now(UTC) - timedelta(days=10)
    await _set_joined_at(db_session, gid, a_old.id, base)
    await _set_joined_at(db_session, gid, a_new.id, base + timedelta(days=2))
    await _set_joined_at(db_session, gid, mod.id, base + timedelta(days=1))

    res = await client.delete("/api/users/me", headers=auth_headers(owner))
    assert res.status_code == 204

    grp = await db_session.get(Group, gid)
    await db_session.refresh(grp)
    assert grp is not None
    assert grp.owner_user_id == a_old.id

    new_owner_m = (
        await db_session.execute(
            select(GroupMembership).where(
                GroupMembership.group_id == gid, GroupMembership.user_id == a_old.id
            )
        )
    ).scalar_one()
    assert new_owner_m.role == "admin"


async def test_owner_delete_promotes_oldest_mod_when_no_admin(
    make_user, auth_headers, client, db_session
):
    owner = await make_user(username="o")
    mod_old = await make_user(username="mod_old")
    mod_new = await make_user(username="mod_new")
    member = await make_user(username="m")

    gid = await _make_group(client, owner, auth_headers, "od-2")
    await _join(client, mod_old, auth_headers, "od-2")
    await _join(client, mod_new, auth_headers, "od-2")
    await _join(client, member, auth_headers, "od-2")

    await _set_role(db_session, gid, mod_old.id, "mod")
    await _set_role(db_session, gid, mod_new.id, "mod")

    base = datetime.now(UTC) - timedelta(days=5)
    await _set_joined_at(db_session, gid, mod_old.id, base)
    await _set_joined_at(db_session, gid, mod_new.id, base + timedelta(days=1))
    await _set_joined_at(db_session, gid, member.id, base - timedelta(days=2))

    res = await client.delete("/api/users/me", headers=auth_headers(owner))
    assert res.status_code == 204

    grp = await db_session.get(Group, gid)
    await db_session.refresh(grp)
    assert grp.owner_user_id == mod_old.id
    new_owner_m = (
        await db_session.execute(
            select(GroupMembership).where(
                GroupMembership.group_id == gid, GroupMembership.user_id == mod_old.id
            )
        )
    ).scalar_one()
    assert new_owner_m.role == "admin"


async def test_owner_delete_promotes_oldest_member_when_only_members(
    make_user, auth_headers, client, db_session
):
    owner = await make_user(username="o")
    m1 = await make_user(username="m1")
    m2 = await make_user(username="m2")

    gid = await _make_group(client, owner, auth_headers, "od-3")
    await _join(client, m1, auth_headers, "od-3")
    await _join(client, m2, auth_headers, "od-3")

    base = datetime.now(UTC) - timedelta(days=3)
    await _set_joined_at(db_session, gid, m1.id, base)
    await _set_joined_at(db_session, gid, m2.id, base + timedelta(hours=2))

    res = await client.delete("/api/users/me", headers=auth_headers(owner))
    assert res.status_code == 204

    grp = await db_session.get(Group, gid)
    await db_session.refresh(grp)
    assert grp.owner_user_id == m1.id
    new_owner_m = (
        await db_session.execute(
            select(GroupMembership).where(
                GroupMembership.group_id == gid, GroupMembership.user_id == m1.id
            )
        )
    ).scalar_one()
    assert new_owner_m.role == "admin"


async def test_owner_delete_alone_removes_group_and_frees_guild_id(
    make_user, auth_headers, client, db_session
):
    owner = await make_user(username="solo")
    gid = await _make_group(client, owner, auth_headers, "od-4")

    res = await client.delete("/api/users/me", headers=auth_headers(owner))
    assert res.status_code == 204

    grp = await db_session.get(Group, gid)
    assert grp is None

    # discord_guild_id volta a estar disponivel
    other = await make_user(username="other")
    res = await client.post(
        "/api/groups",
        json={"discord_guild_id": "od-4", "name": "Reborn"},
        headers=auth_headers(other),
    )
    assert res.status_code == 200, res.text
    assert res.json()["discord_guild_id"] == "od-4"


async def test_owner_delete_resolves_multiple_owned_groups(
    make_user, auth_headers, client, db_session
):
    """Owner de 2 grupos: um com sucessor, outro sozinho."""
    owner = await make_user(username="multi")
    helper = await make_user(username="helper")

    gid_with_member = await _make_group(client, owner, auth_headers, "od-5a")
    await _join(client, helper, auth_headers, "od-5a")

    gid_solo = await _make_group(client, owner, auth_headers, "od-5b")

    res = await client.delete("/api/users/me", headers=auth_headers(owner))
    assert res.status_code == 204

    g1 = await db_session.get(Group, gid_with_member)
    await db_session.refresh(g1)
    assert g1 is not None
    assert g1.owner_user_id == helper.id

    g2 = await db_session.get(Group, gid_solo)
    assert g2 is None


async def test_owner_delete_emits_owner_changed_notification(
    make_user, auth_headers, client, db_session, monkeypatch
):
    """Verifica que notify_group e chamado com event group.owner_changed."""
    owner = await make_user(username="o")
    heir = await make_user(username="h")
    gid = await _make_group(client, owner, auth_headers, "od-6")
    await _join(client, heir, auth_headers, "od-6")

    captured: list[dict] = []

    async def fake_notify(db, **kwargs):
        captured.append(kwargs)

    monkeypatch.setattr("app.services.notifications.notify_group", fake_notify)

    res = await client.delete("/api/users/me", headers=auth_headers(owner))
    assert res.status_code == 204

    assert len(captured) == 1
    assert captured[0]["event"] == "group.owner_changed"
    assert captured[0]["group_id"] == uuid.UUID(gid)
