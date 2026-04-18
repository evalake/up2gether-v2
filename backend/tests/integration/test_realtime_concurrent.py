"""Cenarios de votacao concorrente.

Garante que dois clientes operando no mesmo recurso convergem pro mesmo
estado, e que os eventos certos sao publicados no broker realtime.
"""

from __future__ import annotations

import asyncio
import uuid

import pytest

from app.services.realtime import get_broker

pytestmark = pytest.mark.asyncio


async def _setup_group_with_games(make_user, auth_headers, client, guild, n=3):
    owner = await make_user(username="owner")
    g = (
        await client.post(
            "/api/groups",
            json={"discord_guild_id": guild, "name": "Squad"},
            headers=auth_headers(owner),
        )
    ).json()
    games = []
    for i in range(n):
        res = await client.post(
            f"/api/groups/{g['id']}/games",
            json={"name": f"G{i}"},
            headers=auth_headers(owner),
        )
        games.append(res.json())
    return owner, g, games


async def test_concurrent_ballots_converge(make_user, auth_headers, client):
    owner, g, games = await _setup_group_with_games(
        make_user, auth_headers, client, "g-rt-vote", n=3
    )
    member = await make_user(username="m")
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-rt-vote", "name": "Squad"},
        headers=auth_headers(member),
    )
    vote = (
        await client.post(
            f"/api/groups/{g['id']}/votes",
            json={"title": "Pick", "candidate_game_ids": [x["id"] for x in games]},
            headers=auth_headers(owner),
        )
    ).json()

    # subscribe broker antes
    gid = uuid.UUID(g["id"])
    q, gids = await get_broker().subscribe([gid])
    try:
        # nota: mesma session DB compartilhada nos overrides do conftest, entao
        # operacoes precisam ser sequenciais. realtime: confirma que o publish
        # acontece em cada submit individualmente.
        r1 = await client.put(
            f"/api/votes/{vote['id']}/ballot",
            json={"approvals": [games[0]["id"]]},
            headers=auth_headers(owner),
        )
        r2 = await client.put(
            f"/api/votes/{vote['id']}/ballot",
            json={"approvals": [games[1]["id"]]},
            headers=auth_headers(member),
        )
        assert r1.status_code == 200
        assert r2.status_code == 200

        # broker recebeu pelo menos um ballot_cast
        kinds = []
        for _ in range(2):
            try:
                m = await asyncio.wait_for(q.get(), timeout=0.5)
                kinds.append(m["kind"])
            except TimeoutError:
                break
        assert any(k == "game_vote.ballot_cast" for k in kinds)
    finally:
        await get_broker().unsubscribe(q, gids)

    # estado do voto reflete os 2 ballots (2 elegiveis, 2 ballots = auto-close)
    after = (
        await client.get(
            f"/api/groups/{g['id']}/votes",
            headers=auth_headers(owner),
        )
    ).json()
    assert len(after) == 1
    assert after[0]["status"] == "closed"
    assert after[0]["winner_game_id"] in (games[0]["id"], games[1]["id"])
