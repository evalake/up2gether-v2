"""Testes do bot inline: voto, rsvp e interesse via Discord."""

from __future__ import annotations

import uuid

import pytest

from app.domain.enums import SessionRsvp
from app.services.discord_actions import (
    cast_vote,
    list_group_games,
    set_interest,
    set_rsvp,
)

pytestmark = pytest.mark.asyncio


async def _setup_group_with_guild(client, auth_headers, user, guild_id: str, games: list[str]):
    g = (
        await client.post(
            "/api/groups",
            json={"discord_guild_id": guild_id, "name": "G"},
            headers=auth_headers(user),
        )
    ).json()
    created = []
    for name in games:
        res = await client.post(
            f"/api/groups/{g['id']}/games",
            json={"name": name},
            headers=auth_headers(user),
        )
        assert res.status_code == 200, res.text
        created.append(res.json())
    return g, created


async def test_cast_vote_happy_path(make_user, auth_headers, client, db_session):
    u = await make_user(discord_id="d-owner", username="owner")
    g, games = await _setup_group_with_guild(
        client, auth_headers, u, "guild-vote", ["Alpha", "Beta", "Gamma"]
    )

    candidates = [games[0]["id"], games[1]["id"], games[2]["id"]]
    vote = (
        await client.post(
            f"/api/groups/{g['id']}/votes",
            json={
                "title": "proxima sessao",
                "candidate_game_ids": candidates,
                "stages": [{"stage_number": 1, "duration_minutes": 30, "max_selections": 1}],
            },
            headers=auth_headers(u),
        )
    ).json()

    res = await cast_vote(
        db_session,
        discord_user_id="d-owner",
        guild_id="guild-vote",
        vote_id=uuid.UUID(vote["id"]),
        approvals=[uuid.UUID(games[0]["id"])],
        base_url="https://up2gether.com.br",
    )
    assert res.ok
    assert "proxima sessao" in res.message


async def test_cast_vote_unknown_user_hints_signup(db_session):
    res = await cast_vote(
        db_session,
        discord_user_id="not-a-user",
        guild_id="any",
        vote_id=uuid.uuid4(),
        approvals=[],
        base_url="https://up2gether.com.br",
    )
    assert not res.ok
    assert "up2gether.com.br" in res.message


async def test_cast_vote_unknown_guild(make_user, db_session):
    await make_user(discord_id="d-x", username="x")
    res = await cast_vote(
        db_session,
        discord_user_id="d-x",
        guild_id="nao-cadastrado",
        vote_id=uuid.uuid4(),
        approvals=[],
        base_url="https://up2gether.com.br",
    )
    assert not res.ok
    assert "nao registrado" in res.message


async def test_set_rsvp_happy_path(make_user, auth_headers, client, db_session):
    u = await make_user(discord_id="d-rs", username="rs")
    g, games = await _setup_group_with_guild(client, auth_headers, u, "guild-rsvp", ["Hades"])
    sess = (
        await client.post(
            f"/api/groups/{g['id']}/sessions",
            json={
                "game_id": games[0]["id"],
                "title": "raid",
                "start_at": "2030-01-01T20:00:00Z",
                "duration_minutes": 120,
            },
            headers=auth_headers(u),
        )
    ).json()

    res = await set_rsvp(
        db_session,
        discord_user_id="d-rs",
        guild_id="guild-rsvp",
        session_id=uuid.UUID(sess["id"]),
        status=SessionRsvp.YES,
        base_url="https://up2gether.com.br",
    )
    assert res.ok
    assert "confirmado" in res.message


async def test_set_interest_happy_path(make_user, auth_headers, client, db_session):
    u = await make_user(discord_id="d-int", username="int")
    _g, games = await _setup_group_with_guild(client, auth_headers, u, "guild-int", ["Celeste"])
    res = await set_interest(
        db_session,
        discord_user_id="d-int",
        guild_id="guild-int",
        game_id=uuid.UUID(games[0]["id"]),
        signal="want",
        base_url="https://up2gether.com.br",
    )
    assert res.ok
    assert "quero jogar" in res.message


async def test_list_group_games_for_autocomplete(make_user, auth_headers, client, db_session):
    u = await make_user(discord_id="d-ac", username="ac")
    await _setup_group_with_guild(
        client, auth_headers, u, "guild-ac", ["Hades", "Hollow Knight", "Celeste"]
    )

    # sem query: todos
    all_games = await list_group_games(db_session, guild_id="guild-ac", query="")
    assert {g.name for g in all_games} == {"Hades", "Hollow Knight", "Celeste"}

    # query filtra case-insensitive
    hits = await list_group_games(db_session, guild_id="guild-ac", query="hol")
    assert [g.name for g in hits] == ["Hollow Knight"]

    # guild desconhecida: vazio
    none = await list_group_games(db_session, guild_id="xxxx", query="")
    assert none == []
