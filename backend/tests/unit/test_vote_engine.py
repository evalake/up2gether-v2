"""Unit tests do vote engine. Logica pura."""

from __future__ import annotations

import uuid

import pytest

from app.services.vote_engine import (
    advance_stage,
    calculate_max_selections,
    calculate_max_selections_for_stage,
    calculate_quorum,
    get_stage_sizes,
    tally,
)


@pytest.mark.parametrize(
    "n,k",
    [(1, 1), (2, 1), (3, 1), (4, 2), (7, 3), (10, 5), (30, 15)],
)
def test_max_selections(n, k):
    assert calculate_max_selections(n) == k


@pytest.mark.parametrize(
    "eligible,expected",
    [(0, 1), (1, 1), (2, 1), (3, 2), (5, 2), (10, 4)],
)
def test_quorum_40pct(eligible, expected):
    assert calculate_quorum(eligible) == expected


def _ids(n):
    return [uuid.uuid4() for _ in range(n)]


def test_tally_no_ballots_returns_first_candidate():
    a, b = _ids(2)
    res = tally([a, b], [], {})
    assert res.winner_id == a


def test_tally_clear_winner():
    a, b, c = _ids(3)
    ballots = [[a, b], [a], [a, c]]
    res = tally([a, b, c], ballots, {})
    assert res.winner_id == a
    assert res.counts[a] == 3


def test_tally_tiebreak_by_viability():
    a, b = _ids(2)
    ballots = [[a], [b]]
    res = tally([a, b], ballots, {a: 50.0, b: 80.0})
    assert res.winner_id == b
    assert set(res.tied) == {a, b}


def test_tally_tie_persists_falls_to_first_in_list():
    a, b = _ids(2)
    ballots = [[a], [b]]
    res = tally([a, b], ballots, {a: 50.0, b: 50.0})
    assert res.winner_id == a


def test_tally_ignores_unknown_candidate_in_ballot():
    a, b = _ids(2)
    ghost = uuid.uuid4()
    ballots = [[a, ghost]]
    res = tally([a, b], ballots, {})
    assert res.counts.get(ghost, 0) == 0
    assert res.winner_id == a


# ---- multi-stage engine ----


@pytest.mark.parametrize(
    "n,expected",
    [
        (1, [1]),
        (2, [2]),
        (3, [3]),
        (5, [5]),
        (6, [6, 3, 2]),
        (10, [10, 5, 2]),
        (15, [15, 7, 3, 2]),
        (30, [30, 15, 7, 3, 2]),
    ],
)
def test_get_stage_sizes(n, expected):
    assert get_stage_sizes(n) == expected


@pytest.mark.parametrize(
    "n,k",
    [(2, 1), (3, 1), (4, 2), (6, 3), (10, 5), (15, 7)],
)
def test_max_selections_for_stage(n, k):
    assert calculate_max_selections_for_stage(n) == k


def test_advance_intermediate_takes_top_half():
    ids = _ids(6)
    # votos concentram em ids[0..2]
    ballots = [[ids[0], ids[1], ids[2]], [ids[0], ids[1]], [ids[0], ids[2]]]
    res = advance_stage(ids, ballots, eligible_count=3, viability_by_id={}, seed=42, is_final=False)
    assert res.winner_id is None
    assert res.advance_ids is not None
    assert len(res.advance_ids) == 3  # floor(6/2)
    assert ids[0] in res.advance_ids
    assert ids[1] in res.advance_ids
    assert ids[2] in res.advance_ids


def test_advance_intermediate_uses_seed_not_viability():
    a, b, c, d = _ids(4)
    # b e c empatam na 2a vaga
    ballots = [[a, b], [a, c]]
    res1 = advance_stage([a, b, c, d], ballots, 2, {b: 99.0, c: 10.0}, seed=1, is_final=False)
    res2 = advance_stage([a, b, c, d], ballots, 2, {b: 10.0, c: 99.0}, seed=1, is_final=False)
    # viability NAO deve afetar stage intermediario
    assert res1.advance_ids == res2.advance_ids
    # mesmo seed -> mesmo resultado
    assert a in res1.advance_ids


def test_advance_seed_determines_intermediate_tiebreak():
    a, b = _ids(2)
    ids = [a, b, *_ids(2)]
    ballots = [[a], [b]]  # a e b empatam
    r_s1 = advance_stage(ids, ballots, 2, {}, seed=1, is_final=False)
    r_s2 = advance_stage(ids, ballots, 2, {}, seed=999999, is_final=False)
    # seeds diferentes podem dar ordens diferentes mas resultado deterministic
    assert r_s1.advance_ids is not None
    assert r_s2.advance_ids is not None


def test_advance_final_uses_viability_for_tiebreak():
    a, b = _ids(2)
    ballots = [[a], [b]]  # empate 1x1
    res = advance_stage([a, b], ballots, 2, {a: 10.0, b: 80.0}, seed=1, is_final=True)
    assert res.winner_id == b
    assert res.advance_ids is None


def test_advance_n3_100pct_consensus_early_winner():
    a, b, c = _ids(3)
    ballots = [[a], [a], [a]]  # 3/3 todos em a
    res = advance_stage([a, b, c], ballots, 3, {}, seed=1, is_final=False)
    assert res.winner_id == a
    assert res.early_consensus is True


def test_advance_n3_not_full_consensus_goes_to_final():
    a, b, c = _ids(3)
    ballots = [[a], [a], [b]]  # 2 em a, 1 em b
    res = advance_stage([a, b, c], ballots, 3, {}, seed=1, is_final=False)
    # nao acabou, avanca pros top 2
    assert res.winner_id is None
    assert res.advance_ids is not None
    assert len(res.advance_ids) == 2
    assert a in res.advance_ids
    assert b in res.advance_ids


def test_advance_final_no_votes_returns_first():
    a, b = _ids(2)
    res = advance_stage([a, b], [], 2, {}, seed=1, is_final=True)
    assert res.winner_id == a


# ---- cenarios unanimes / single-voter / sequencia full ----


def test_advance_single_voter_on_n6_advances_top_3():
    ids = _ids(6)
    # 1 voter, aprova 3 (max_selections = floor(6/2) = 3)
    ballots = [[ids[0], ids[1], ids[2]]]
    res = advance_stage(ids, ballots, eligible_count=1, viability_by_id={}, seed=42, is_final=False)
    assert res.winner_id is None
    assert res.advance_ids is not None
    assert len(res.advance_ids) == 3
    assert set(res.advance_ids) == {ids[0], ids[1], ids[2]}


def test_advance_single_voter_n3_unanimous_via_auto_check():
    # quando eligible=1 e voter marca so 1 candidato no stage de N=3,
    # early consensus dispara (1/1 todos em a)
    a, b, c = _ids(3)
    ballots = [[a]]
    res = advance_stage(
        [a, b, c], ballots, eligible_count=1, viability_by_id={}, seed=1, is_final=False
    )
    assert res.winner_id == a
    assert res.early_consensus is True


def test_advance_final_n2_picks_highest_count():
    a, b = _ids(2)
    ballots = [[a]]
    res = advance_stage([a, b], ballots, 1, {}, seed=1, is_final=True)
    assert res.winner_id == a
    assert res.advance_ids is None


def test_advance_forced_final_with_multiple_candidates():
    # force_final (admin encerrou manual): viability desempata mesmo com 3+ cand
    a, b, c = _ids(3)
    ballots = [[a], [b]]  # 1x1 empate
    res = advance_stage([a, b, c], ballots, 2, {a: 10.0, b: 80.0}, seed=1, is_final=True)
    assert res.winner_id == b


def test_advance_intermediate_single_high_vote_advances_minimum_two():
    # caso extremo: so 1 candidato recebe voto, mas advance tem minimo 2
    ids = _ids(4)
    ballots = [[ids[0]]]  # so ids[0] tem voto
    res = advance_stage(ids, ballots, 1, {}, seed=1, is_final=False)
    assert res.winner_id is None
    assert res.advance_ids is not None
    assert len(res.advance_ids) == 2  # target_m = max(2, 4//2) = 2
    assert ids[0] == res.advance_ids[0]  # mais votado em 1o


def test_advance_unknown_candidates_in_ballot_are_ignored():
    ids = _ids(3)
    ghost = uuid.uuid4()
    ballots = [[ids[0], ghost]]
    res = advance_stage(ids, ballots, 1, {}, seed=1, is_final=False)
    # ghost nao conta, ids[0] tem 1 voto
    assert res.counts[ids[0]] == 1
    assert ghost not in res.counts


def test_advance_empty_candidates_returns_empty():
    res = advance_stage([], [], 0, {}, seed=1, is_final=True)
    assert res.winner_id is None
    assert res.advance_ids is None
    assert res.counts == {}


def test_advance_seed_deterministic_same_input():
    ids = _ids(4)
    ballots = [[ids[0]], [ids[1]]]  # empate 2a vaga
    r1 = advance_stage(ids, ballots, 2, {}, seed=42, is_final=False)
    r2 = advance_stage(ids, ballots, 2, {}, seed=42, is_final=False)
    assert r1.advance_ids == r2.advance_ids


def test_advance_full_sequence_n10_to_winner():
    # simula sequencia completa 10 -> 5 -> 2 com mesma rodada
    ids = _ids(10)
    # stage 1: todos votam nos 5 primeiros
    b1 = [list(ids[:5]) for _ in range(3)]
    r1 = advance_stage(ids, b1, 3, {}, seed=7, is_final=False)
    assert r1.advance_ids is not None
    assert len(r1.advance_ids) == 5
    top5 = r1.advance_ids

    # stage 2: 5 cand, todos votam nos 2 primeiros
    b2 = [list(top5[:2]) for _ in range(3)]
    r2 = advance_stage(top5, b2, 3, {}, seed=7, is_final=False)
    assert r2.advance_ids is not None
    assert len(r2.advance_ids) == 2
    top2 = r2.advance_ids

    # stage 3 final: viability desempata se preciso
    b3 = [[top2[0]], [top2[1]], [top2[0]]]
    r3 = advance_stage(top2, b3, 3, {top2[0]: 50.0, top2[1]: 90.0}, seed=7, is_final=True)
    # top2[0] tem 2 votos, top2[1] tem 1, top2[0] ganha mesmo com menor viability
    assert r3.winner_id == top2[0]
