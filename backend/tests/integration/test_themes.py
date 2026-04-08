"""Integration tests do slice Themes."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.asyncio


async def _create_group(client, headers, guild="g-theme-1"):
    return (
        await client.post(
            "/api/groups",
            json={"discord_guild_id": guild, "name": "Squad"},
            headers=headers,
        )
    ).json()


async def test_set_theme_admin_only(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    member = await make_user(username="m")
    g = await _create_group(client, auth_headers(owner))
    await client.post(
        "/api/groups",
        json={"discord_guild_id": "g-theme-1", "name": "Squad"},
        headers=auth_headers(member),
    )

    res = await client.post(
        f"/api/groups/{g['id']}/themes",
        json={"theme_name": "Souls-like", "month_year": "2026-04"},
        headers=auth_headers(member),
    )
    assert res.status_code == 403

    res = await client.post(
        f"/api/groups/{g['id']}/themes",
        json={"theme_name": "Souls-like", "month_year": "2026-04"},
        headers=auth_headers(owner),
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["theme_name"] == "Souls-like"
    assert body["month_year"] == "2026-04"
    assert body["decided_by"] == "manual"


async def test_set_theme_dedup_per_month(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    g = await _create_group(client, auth_headers(owner), guild="g-theme-2")
    await client.post(
        f"/api/groups/{g['id']}/themes",
        json={"theme_name": "Indie", "month_year": "2026-05"},
        headers=auth_headers(owner),
    )
    res = await client.post(
        f"/api/groups/{g['id']}/themes",
        json={"theme_name": "Outro", "month_year": "2026-05"},
        headers=auth_headers(owner),
    )
    assert res.status_code == 400


async def test_get_current_returns_null_when_no_theme(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    g = await _create_group(client, auth_headers(owner), guild="g-theme-3")
    res = await client.get(f"/api/groups/{g['id']}/themes/current", headers=auth_headers(owner))
    assert res.status_code == 200
    assert res.json() is None


async def test_list_history_sorted_desc(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    g = await _create_group(client, auth_headers(owner), guild="g-theme-4")
    for m in ("2026-01", "2026-03", "2026-02"):
        await client.post(
            f"/api/groups/{g['id']}/themes",
            json={"theme_name": f"Theme {m}", "month_year": m},
            headers=auth_headers(owner),
        )
    res = await client.get(f"/api/groups/{g['id']}/themes", headers=auth_headers(owner))
    months = [t["month_year"] for t in res.json()]
    assert months == ["2026-03", "2026-02", "2026-01"]


async def test_delete_theme(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    g = await _create_group(client, auth_headers(owner), guild="g-theme-5")
    created = (
        await client.post(
            f"/api/groups/{g['id']}/themes",
            json={"theme_name": "X", "month_year": "2026-06"},
            headers=auth_headers(owner),
        )
    ).json()
    res = await client.delete(
        f"/api/groups/{g['id']}/themes/{created['id']}",
        headers=auth_headers(owner),
    )
    assert res.status_code == 204
    res = await client.get(f"/api/groups/{g['id']}/themes", headers=auth_headers(owner))
    assert res.json() == []


async def _join(client, headers, guild):
    return (
        await client.post(
            "/api/groups",
            json={"discord_guild_id": guild, "name": "Squad"},
            headers=headers,
        )
    ).json()


async def test_cycle_full_flow_single_winner(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    m1 = await make_user(username="m1")
    m2 = await make_user(username="m2")
    g = await _create_group(client, auth_headers(owner), guild="g-cycle-1")
    await _join(client, auth_headers(m1), "g-cycle-1")
    await _join(client, auth_headers(m2), "g-cycle-1")

    # qualquer membro pode abrir. ciclo ja comeca em VOTING (sugestao + voto juntos)
    res = await client.post(f"/api/groups/{g['id']}/themes/cycle", headers=auth_headers(owner))
    assert res.status_code == 200, res.text
    cycle = res.json()
    assert cycle["phase"] == "voting"
    cid = cycle["id"]

    # cada um sugere
    sug_ids: dict[str, str] = {}
    for u, name in ((owner, "Souls"), (m1, "Indies"), (m2, "Retro")):
        r = await client.put(
            f"/api/groups/{g['id']}/themes/cycle/{cid}/suggestion",
            json={"name": name},
            headers=auth_headers(u),
        )
        assert r.status_code == 200, r.text
        sug_ids = {s["name"]: s["id"] for s in r.json()["suggestions"]}
    indies_id = sug_ids["Indies"]
    souls_id = sug_ids["Souls"]

    # 2 votam em Indies, 1 em Souls -> Indies ganha.
    # m1 ja auto-votou em Indies ao sugerir (sua propria sugestao), so falta
    # owner votar em Indies e m2 em Souls.
    for u, sid in ((owner, indies_id), (m2, souls_id)):
        rr = await client.put(
            f"/api/groups/{g['id']}/themes/cycle/{cid}/vote",
            json={"suggestion_id": sid},
            headers=auth_headers(u),
        )
        assert rr.status_code == 200

    # fechar
    r = await client.post(
        f"/api/groups/{g['id']}/themes/cycle/{cid}/close",
        headers=auth_headers(owner),
    )
    assert r.status_code == 200
    body = r.json()
    assert body["phase"] == "decided"
    assert body["winner_suggestion_id"] == indies_id
    assert body["tiebreak_kind"] is None

    # MonthlyTheme criado
    r = await client.get(f"/api/groups/{g['id']}/themes/current", headers=auth_headers(owner))
    assert r.json()["theme_name"] == "Indies"
    assert r.json()["decided_by"] == "vote"


async def test_cycle_tiebreak_two_uses_coin(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    m1 = await make_user(username="m1")
    g = await _create_group(client, auth_headers(owner), guild="g-cycle-2")
    await _join(client, auth_headers(m1), "g-cycle-2")

    cycle = (
        await client.post(f"/api/groups/{g['id']}/themes/cycle", headers=auth_headers(owner))
    ).json()
    cid = cycle["id"]
    last = None
    for u, name in ((owner, "A"), (m1, "B")):
        last = await client.put(
            f"/api/groups/{g['id']}/themes/cycle/{cid}/suggestion",
            json={"name": name},
            headers=auth_headers(u),
        )
    sugs = last.json()["suggestions"]
    a = next(s["id"] for s in sugs if s["name"] == "A")
    b = next(s["id"] for s in sugs if s["name"] == "B")
    # cada um ja auto-votou na propria sugestao ao sugerir -> empate 1x1

    r = await client.post(
        f"/api/groups/{g['id']}/themes/cycle/{cid}/close", headers=auth_headers(owner)
    )
    body = r.json()
    assert body["phase"] == "decided"
    assert body["tiebreak_kind"] == "tiebreak_coin"
    assert body["winner_suggestion_id"] in (a, b)
    assert sorted(body["tied_suggestion_ids"]) == sorted([a, b])


async def test_cycle_tiebreak_three_uses_roulette(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    m1 = await make_user(username="m1")
    m2 = await make_user(username="m2")
    g = await _create_group(client, auth_headers(owner), guild="g-cycle-3")
    await _join(client, auth_headers(m1), "g-cycle-3")
    await _join(client, auth_headers(m2), "g-cycle-3")

    cycle = (
        await client.post(f"/api/groups/{g['id']}/themes/cycle", headers=auth_headers(owner))
    ).json()
    cid = cycle["id"]
    last = None
    for u, name in ((owner, "A"), (m1, "B"), (m2, "C")):
        last = await client.put(
            f"/api/groups/{g['id']}/themes/cycle/{cid}/suggestion",
            json={"name": name},
            headers=auth_headers(u),
        )
    assert last is not None
    # cada um ja auto-votou na propria sugestao ao sugerir -> empate triplo

    body = (
        await client.post(
            f"/api/groups/{g['id']}/themes/cycle/{cid}/close", headers=auth_headers(owner)
        )
    ).json()
    assert body["tiebreak_kind"] == "tiebreak_roulette"
    assert len(body["tied_suggestion_ids"]) == 3


async def test_cycle_single_suggestion_auto_decides(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    g = await _create_group(client, auth_headers(owner), guild="g-cycle-4")
    cycle = (
        await client.post(f"/api/groups/{g['id']}/themes/cycle", headers=auth_headers(owner))
    ).json()
    cid = cycle["id"]
    await client.put(
        f"/api/groups/{g['id']}/themes/cycle/{cid}/suggestion",
        json={"name": "Solo"},
        headers=auth_headers(owner),
    )
    # com 1 sugestao, close finaliza sem tiebreak
    r = await client.post(
        f"/api/groups/{g['id']}/themes/cycle/{cid}/close", headers=auth_headers(owner)
    )
    body = r.json()
    assert r.status_code == 200, body
    assert body["phase"] == "decided"
    assert body["tiebreak_kind"] is None


async def test_suggestion_editable_anytime_while_open(make_user, auth_headers, client):
    # no fluxo atual, sugestoes sao sempre editaveis enquanto o ciclo ta aberto
    owner = await make_user(username="owner")
    m1 = await make_user(username="m1")
    g = await _create_group(client, auth_headers(owner), guild="g-cycle-5")
    await _join(client, auth_headers(m1), "g-cycle-5")
    cid = (
        await client.post(f"/api/groups/{g['id']}/themes/cycle", headers=auth_headers(owner))
    ).json()["id"]
    await client.put(
        f"/api/groups/{g['id']}/themes/cycle/{cid}/suggestion",
        json={"name": "X"},
        headers=auth_headers(owner),
    )
    await client.put(
        f"/api/groups/{g['id']}/themes/cycle/{cid}/suggestion",
        json={"name": "Y"},
        headers=auth_headers(m1),
    )
    # owner edita dnv: ok (substitui X -> Z)
    r = await client.put(
        f"/api/groups/{g['id']}/themes/cycle/{cid}/suggestion",
        json={"name": "Z"},
        headers=auth_headers(owner),
    )
    assert r.status_code == 200
    names = {s["name"] for s in r.json()["suggestions"]}
    assert names == {"Z", "Y"}


async def test_force_decide_skips_flow(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    m1 = await make_user(username="m1")
    g = await _create_group(client, auth_headers(owner), guild="g-cycle-6")
    await _join(client, auth_headers(m1), "g-cycle-6")
    cid = (
        await client.post(f"/api/groups/{g['id']}/themes/cycle", headers=auth_headers(owner))
    ).json()["id"]
    body = (
        await client.put(
            f"/api/groups/{g['id']}/themes/cycle/{cid}/suggestion",
            json={"name": "Forced"},
            headers=auth_headers(m1),
        )
    ).json()
    sid = body["suggestions"][0]["id"]
    r = await client.post(
        f"/api/groups/{g['id']}/themes/cycle/{cid}/force/{sid}", headers=auth_headers(owner)
    )
    assert r.status_code == 200
    body = r.json()
    assert body["phase"] == "decided"
    assert body["winner_suggestion_id"] == sid
    cur = (
        await client.get(f"/api/groups/{g['id']}/themes/current", headers=auth_headers(owner))
    ).json()
    assert cur["decided_by"] == "admin"


async def test_themes_403_for_non_member(make_user, auth_headers, client):
    owner = await make_user(username="owner")
    intruder = await make_user(username="x")
    g = await _create_group(client, auth_headers(owner), guild="g-theme-6")
    res = await client.get(f"/api/groups/{g['id']}/themes/current", headers=auth_headers(intruder))
    assert res.status_code == 403
