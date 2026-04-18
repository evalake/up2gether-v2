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


async def test_winner_sets_group_current_game(make_user, auth_headers, client):
    """Vote fechado seta current_game_id no grupo com source='vote'."""
    owner, g, games = await _setup_group_with_games(
        make_user, auth_headers, client, "g-vote-6", n=3
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
        json={"approvals": [games[2]["id"]]},
        headers=auth_headers(owner),
    )

    grp = (await client.get(f"/api/groups/{g['id']}", headers=auth_headers(owner))).json()
    assert grp["current_game_id"] == games[2]["id"]
    assert grp["current_game_source"] == "vote"


async def test_multistage_advances_through_phases(make_user, auth_headers, client):
    """6 candidatos: stages [6, 3, 2]. Vota stage 1 -> avanca, vota stage 2 -> winner."""
    owner, g, games = await _setup_group_with_games(
        make_user, auth_headers, client, "g-vote-7", n=6
    )
    vote = (
        await client.post(
            f"/api/groups/{g['id']}/votes",
            json={
                "title": "Multi",
                "candidate_game_ids": [x["id"] for x in games],
            },
            headers=auth_headers(owner),
        )
    ).json()
    assert vote["total_stages"] == 3
    assert vote["current_stage_number"] == 1
    assert vote["max_selections"] == 3

    # vota nos 3 primeiros pra eles avancarem
    res = await client.put(
        f"/api/votes/{vote['id']}/ballot",
        json={"approvals": [games[0]["id"], games[1]["id"]]},
        headers=auth_headers(owner),
    )
    body = res.json()
    # owner sozinho (eligible=1) fechou stage 1, abriu stage 2
    assert body["status"] == "open"
    assert body["current_stage_number"] == 2

    # stage 2 tem 3 candidatos. vota num que avanca pra final (stage 3 = 2 candidatos)
    advance_after_s1 = sorted(body["stages"], key=lambda s: s["stage_number"])[1][
        "candidate_game_ids"
    ]
    res = await client.put(
        f"/api/votes/{vote['id']}/ballot",
        json={"approvals": [advance_after_s1[0]]},
        headers=auth_headers(owner),
    )
    body = res.json()
    # stage 2 com 3 candidatos: 100% consensus (1/1) gera early_consensus
    assert body["status"] == "closed"
    assert body["winner_game_id"] == advance_after_s1[0]


async def test_force_close_picks_winner_from_current_stage(make_user, auth_headers, client):
    """Admin pode forcar close: pega winner do stage atual mesmo sem todos votarem."""
    owner, g, games = await _setup_group_with_games(
        make_user, auth_headers, client, "g-vote-8", n=2
    )
    second = await make_user(username="second")
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-vote-8", "name": "Squad"},
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
    # so o owner vota, second nao
    await client.put(
        f"/api/votes/{vote['id']}/ballot",
        json={"approvals": [games[1]["id"]]},
        headers=auth_headers(owner),
    )
    # ainda aberto pq second nao votou
    chk = (
        await client.get(
            f"/api/groups/{g['id']}/votes/{vote['id']}",
            headers=auth_headers(owner),
        )
    ).json()
    assert chk["status"] == "open"

    # owner forca close -> games[1] vence (1 voto vs 0)
    res = await client.post(
        f"/api/groups/{g['id']}/votes/{vote['id']}/close",
        headers=auth_headers(owner),
    )
    body = res.json()
    assert body["status"] == "closed"
    assert body["winner_game_id"] == games[1]["id"]


async def test_ballot_outside_current_stage_rejected(make_user, auth_headers, client):
    """Apos avancar de stage, ballot com candidato eliminado -> 400."""
    owner, g, games = await _setup_group_with_games(
        make_user, auth_headers, client, "g-vote-9", n=6
    )
    vote = (
        await client.post(
            f"/api/groups/{g['id']}/votes",
            json={
                "title": "Multi",
                "candidate_game_ids": [x["id"] for x in games],
            },
            headers=auth_headers(owner),
        )
    ).json()
    res = await client.put(
        f"/api/votes/{vote['id']}/ballot",
        json={"approvals": [games[0]["id"], games[1]["id"]]},
        headers=auth_headers(owner),
    )
    body = res.json()
    assert body["current_stage_number"] == 2
    advanced = sorted(body["stages"], key=lambda s: s["stage_number"])[1]["candidate_game_ids"]
    eliminated = [x["id"] for x in games if x["id"] not in advanced]
    assert eliminated, "expected at least one eliminated game"

    res = await client.put(
        f"/api/votes/{vote['id']}/ballot",
        json={"approvals": [eliminated[0]]},
        headers=auth_headers(owner),
    )
    assert res.status_code == 400
