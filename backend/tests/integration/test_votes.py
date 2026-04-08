"""Integration tests do slice Votes."""

from __future__ import annotations

import pytest

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
            json={"name": f"Game{i}", "is_free": i == 0},
            headers=auth_headers(owner),
        )
        games.append(res.json())
    return owner, g, games


async def test_create_vote_admin_only(make_user, auth_headers, client):
    owner, g, games = await _setup_group_with_games(make_user, auth_headers, client, "g-vote-1")
    member = await make_user(username="m")
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-vote-1", "name": "Squad"},
        headers=auth_headers(member),
    )

    res = await client.post(
        f"/api/groups/{g['id']}/votes",
        json={
            "title": "What next?",
            "candidate_game_ids": [games[0]["id"], games[1]["id"]],
        },
        headers=auth_headers(member),
    )
    assert res.status_code == 403

    res = await client.post(
        f"/api/groups/{g['id']}/votes",
        json={
            "title": "What next?",
            "candidate_game_ids": [games[0]["id"], games[1]["id"]],
        },
        headers=auth_headers(owner),
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["status"] == "open"
    assert body["max_selections"] == 1
    assert body["eligible_voter_count"] == 2


async def test_submit_ballot_validates_max_and_candidates(make_user, auth_headers, client):
    owner, g, games = await _setup_group_with_games(
        make_user, auth_headers, client, "g-vote-2", n=4
    )
    vote = (
        await client.post(
            f"/api/groups/{g['id']}/votes",
            json={
                "title": "Pick",
                "candidate_game_ids": [x["id"] for x in games],
            },
            headers=auth_headers(owner),
        )
    ).json()
    assert vote["max_selections"] == 2

    # Mais selecoes que o max -> 400
    res = await client.put(
        f"/api/votes/{vote['id']}/ballot",
        json={"approvals": [g["id"] for g in games]},
        headers=auth_headers(owner),
    )
    assert res.status_code == 400

    # Candidato fora do voto -> 400
    import uuid

    res = await client.put(
        f"/api/votes/{vote['id']}/ballot",
        json={"approvals": [str(uuid.uuid4())]},
        headers=auth_headers(owner),
    )
    assert res.status_code == 400

    # Valido
    res = await client.put(
        f"/api/votes/{vote['id']}/ballot",
        json={"approvals": [games[0]["id"], games[1]["id"]]},
        headers=auth_headers(owner),
    )
    assert res.status_code == 200


async def test_close_vote_picks_winner_and_blocks_non_admin(make_user, auth_headers, client):
    owner, g, games = await _setup_group_with_games(
        make_user, auth_headers, client, "g-vote-3", n=3
    )
    second = await make_user(username="second")
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-vote-3", "name": "Squad"},
        headers=auth_headers(second),
    )
    vote = (
        await client.post(
            f"/api/groups/{g['id']}/votes",
            json={
                "title": "Pick",
                "candidate_game_ids": [x["id"] for x in games],
            },
            headers=auth_headers(owner),
        )
    ).json()

    await client.put(
        f"/api/votes/{vote['id']}/ballot",
        json={"approvals": [games[1]["id"]]},
        headers=auth_headers(owner),
    )

    intruder = await make_user(username="x")
    res = await client.post(
        f"/api/groups/{g['id']}/votes/{vote['id']}/close",
        headers=auth_headers(intruder),
    )
    assert res.status_code == 403

    res = await client.post(
        f"/api/groups/{g['id']}/votes/{vote['id']}/close",
        headers=auth_headers(owner),
    )
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "closed"
    assert body["winner_game_id"] == games[1]["id"]


async def test_auto_close_when_all_voted(make_user, auth_headers, client):
    owner, g, games = await _setup_group_with_games(
        make_user, auth_headers, client, "g-vote-4", n=2
    )
    # owner sozinho, eligible=1
    vote = (
        await client.post(
            f"/api/groups/{g['id']}/votes",
            json={
                "title": "Solo",
                "candidate_game_ids": [x["id"] for x in games],
            },
            headers=auth_headers(owner),
        )
    ).json()
    await client.put(
        f"/api/votes/{vote['id']}/ballot",
        json={"approvals": [games[0]["id"]]},
        headers=auth_headers(owner),
    )

    res = await client.get(
        f"/api/groups/{g['id']}/votes/{vote['id']}",
        headers=auth_headers(owner),
    )
    body = res.json()
    assert body["status"] == "closed"
    assert body["winner_game_id"] == games[0]["id"]


async def test_get_vote_403_for_non_member(make_user, auth_headers, client):
    owner, g, games = await _setup_group_with_games(
        make_user, auth_headers, client, "g-vote-5", n=2
    )
    vote = (
        await client.post(
            f"/api/groups/{g['id']}/votes",
            json={
                "title": "vote test",
                "candidate_game_ids": [x["id"] for x in games],
            },
            headers=auth_headers(owner),
        )
    ).json()
    intruder = await make_user(username="x")
    res = await client.get(
        f"/api/groups/{g['id']}/votes/{vote['id']}",
        headers=auth_headers(intruder),
    )
    assert res.status_code == 403
