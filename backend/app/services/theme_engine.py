"""Logica pura do theme cycle: tally + repeat-block K=3.

Extraido de theme_service.close_cycle pra testar sem banco.
Retorna lista de winners:
- [id] quando tem vencedor claro
- [id, id, ...] quando ha empate (caller resolve com cara-coroa/roleta)
- [] quando nao tem voto
"""

from __future__ import annotations

import uuid
from typing import Protocol


class _Suggestion(Protocol):
    id: uuid.UUID
    name: str


def pick_theme_winners(
    suggestions: list[_Suggestion],
    votes: list[uuid.UUID],
    recent_names: list[str],
) -> list[uuid.UUID]:
    """Tally votos e aplica repeat-block (nome igual aos K temas anteriores deprioriza).

    Se top winners todos estao bloqueados, desce pro proximo nivel com voto.
    Se todos os niveis com voto estao bloqueados, retorna top original.
    """
    if not suggestions:
        return []
    counts: dict[uuid.UUID, int] = {s.id: 0 for s in suggestions}
    for sug_id in votes:
        if sug_id in counts:
            counts[sug_id] += 1
    max_votes = max(counts.values())
    if max_votes == 0:
        return []

    winners = [sid for sid, c in counts.items() if c == max_votes]
    blocked = {n.strip().lower() for n in recent_names}
    if not blocked:
        return winners

    sug_by_id = {s.id: s for s in suggestions}
    non_blocked = [sid for sid in winners if sug_by_id[sid].name.strip().lower() not in blocked]
    if non_blocked:
        return non_blocked

    # todos top blocked -> tenta proximo nivel com voto
    ranked = sorted(counts.items(), key=lambda x: -x[1])
    for _, c in ranked:
        if c == 0 or c == max_votes:
            continue
        level = [sid for sid, cc in counts.items() if cc == c]
        level_nb = [sid for sid in level if sug_by_id[sid].name.strip().lower() not in blocked]
        if level_nb:
            return level_nb

    # tudo blocked, volta pro top original
    return winners
