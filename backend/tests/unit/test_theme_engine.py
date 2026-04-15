"""Unit tests do theme engine. Logica pura: tally + repeat-block K=3."""

from __future__ import annotations

import uuid

from app.services.theme_engine import pick_theme_winners


def _ids(n):
    return [uuid.uuid4() for _ in range(n)]


def _sug(sug_id: uuid.UUID, name: str):
    return type("S", (), {"id": sug_id, "name": name})()


def test_single_winner_returns_one():
    a, b = _ids(2)
    suggestions = [_sug(a, "Horror"), _sug(b, "Coop")]
    votes = [a, a, b]
    winners = pick_theme_winners(suggestions, votes, recent_names=[])
    assert winners == [a]


def test_tie_returns_all_tied():
    a, b, c = _ids(3)
    suggestions = [_sug(a, "X"), _sug(b, "Y"), _sug(c, "Z")]
    votes = [a, b]
    winners = pick_theme_winners(suggestions, votes, recent_names=[])
    assert set(winners) == {a, b}


def test_no_votes_returns_empty():
    a = uuid.uuid4()
    suggestions = [_sug(a, "X")]
    winners = pick_theme_winners(suggestions, [], recent_names=[])
    assert winners == []


def test_repeat_block_demotes_recent_name():
    """Vencedor com nome igual a um dos 3 ultimos temas e depriorizado."""
    a, b = _ids(2)
    suggestions = [_sug(a, "Horror"), _sug(b, "Coop")]
    votes = [a, a, b]  # a vence com 2 votos
    winners = pick_theme_winners(suggestions, votes, recent_names=["Horror"])
    assert winners == [b]


def test_repeat_block_case_insensitive():
    a, b = _ids(2)
    suggestions = [_sug(a, "HORROR"), _sug(b, "Coop")]
    votes = [a, a, b]
    winners = pick_theme_winners(suggestions, votes, recent_names=["horror"])
    assert winners == [b]


def test_repeat_block_all_blocked_falls_to_next_level():
    """Se todos os top winners estao bloqueados, cai pro proximo nivel com votos."""
    a, b, c = _ids(3)
    suggestions = [_sug(a, "Horror"), _sug(b, "Horror"), _sug(c, "Coop")]
    votes = [a, a, b, b, c]  # a=2, b=2, c=1; top tied a,b ambos blocked
    winners = pick_theme_winners(suggestions, votes, recent_names=["Horror"])
    assert winners == [c]


def test_repeat_block_only_one_top_winner_blocked_others_promoted():
    a, b = _ids(2)
    suggestions = [_sug(a, "Horror"), _sug(b, "Coop")]
    votes = [a, a, b, b]  # empate 2x2, um e blocked
    winners = pick_theme_winners(suggestions, votes, recent_names=["Horror"])
    assert winners == [b]


def test_repeat_block_empty_recent_no_effect():
    a, b = _ids(2)
    suggestions = [_sug(a, "Horror"), _sug(b, "Coop")]
    votes = [a, a, b]
    winners = pick_theme_winners(suggestions, votes, recent_names=[])
    assert winners == [a]


def test_repeat_block_all_levels_blocked_returns_top():
    """Se todos os niveis com votos estao bloqueados, fica com o top mesmo."""
    a, b = _ids(2)
    suggestions = [_sug(a, "Horror"), _sug(b, "Roguelike")]
    votes = [a, a, b]  # a=2, b=1; ambos blocked
    winners = pick_theme_winners(suggestions, votes, recent_names=["Horror", "Roguelike"])
    assert winners == [a]  # top blocked, proximo tambem blocked, volta pro top


def test_repeat_block_ignores_zero_vote_levels():
    a, b, c = _ids(3)
    suggestions = [_sug(a, "Horror"), _sug(b, "Coop"), _sug(c, "Puzzle")]
    votes = [a, a]  # so a tem voto
    winners = pick_theme_winners(suggestions, votes, recent_names=["Horror"])
    assert winners == [a]  # nao tem proximo nivel com voto, fica com top blocked
