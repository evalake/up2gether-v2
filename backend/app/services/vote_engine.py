"""Logica pura do motor de votacao. Sem I/O.

Votacao de jogos e multi-stage:
- Stage 1: N jogos, cada eleitor aprova ate K = max(1, floor(N/2))
- Stage 2: top M = floor(N/2) do stage anterior
- ... converge ate N=2
- Stage final (N=2): viabilidade desempata
- Stage intermediarios: desempate por seed persistido (determiniistico)
- Caso especial N=3: se 100% dos eleitores votaram todos no mesmo jogo,
  encerra antecipadamente
- Se N_inicial < 6: pula multi-stage, vira single stage (nao vale a pena
  pra grupo pequeno)
"""

from __future__ import annotations

import math
import uuid
from collections.abc import Iterable
from dataclasses import dataclass

MULTISTAGE_MIN_CANDIDATES = 6


def calculate_max_selections(candidate_count: int) -> int:
    if candidate_count <= 1:
        return 1
    return max(1, candidate_count // 2)


def calculate_quorum(eligible_count: int, percent: int = 40) -> int:
    if eligible_count <= 0:
        return 1
    return max(1, math.ceil(eligible_count * percent / 100))


def has_absolute_majority(counts: dict[uuid.UUID, int], eligible_count: int) -> bool:
    """True se algum candidato foi aprovado por mais da metade dos eleitores."""
    if eligible_count <= 0:
        return False
    threshold = eligible_count / 2
    return any(c > threshold for c in counts.values())


def get_stage_sizes(n: int) -> list[int]:
    """Sequencia de tamanhos de candidatos ate o final.

    - N < MULTISTAGE_MIN_CANDIDATES: single stage [N]
    - Senao: N -> floor(N/2) -> ... ate chegar em 2 (inclusive)

    Exemplos:
      1 -> [1]
      5 -> [5]   (single, abaixo do minimo)
      6 -> [6, 3, 2]
      10 -> [10, 5, 2]
      15 -> [15, 7, 3, 2]
      30 -> [30, 15, 7, 3, 2]
    """
    if n <= 1:
        return [max(n, 1)]
    if n < MULTISTAGE_MIN_CANDIDATES:
        return [n]
    sizes = [n]
    cur = n
    while cur > 2:
        nxt = cur // 2
        if nxt < 2:
            nxt = 2
        sizes.append(nxt)
        cur = nxt
    return sizes


def calculate_max_selections_for_stage(candidate_count: int) -> int:
    """K = max(1, floor(N/2)) do stage atual. Pra N=2, K=1."""
    if candidate_count <= 2:
        return 1
    return max(1, candidate_count // 2)


@dataclass(frozen=True)
class StageAdvanceResult:
    """Resultado de fechar um stage.

    Exatamente um de winner_id ou advance_ids eh nao-None.
    """

    winner_id: uuid.UUID | None
    advance_ids: list[uuid.UUID] | None
    counts: dict[uuid.UUID, int]
    early_consensus: bool = False


def _intermediate_tiebreak_key(cid: uuid.UUID, seed: int) -> int:
    """Chave deterministica pra desempate intermediario baseada em seed."""
    return hash((seed, str(cid))) & 0xFFFFFFFF


def advance_stage(
    candidate_ids: list[uuid.UUID],
    ballots: Iterable[Iterable[uuid.UUID]],
    eligible_count: int,
    viability_by_id: dict[uuid.UUID, float],
    seed: int,
    is_final: bool,
) -> StageAdvanceResult:
    """Fecha um stage e decide: avancar ou finalizar.

    - is_final: desempate por viabilidade (so aqui!)
    - else: avanca floor(N/2), desempate por seed persistido
    - N=3 com 100% consensus: vencedor antecipado
    """
    counts: dict[uuid.UUID, int] = {cid: 0 for cid in candidate_ids}
    ballots_list = [list(b) for b in ballots]
    for ballot in ballots_list:
        for cid in ballot:
            if cid in counts:
                counts[cid] += 1

    if not candidate_ids:
        return StageAdvanceResult(None, None, {})

    n = len(candidate_ids)

    # caso especial N=3: 100% consensus -> vencedor antecipado
    if n == 3 and eligible_count > 0:
        total_voters = len(ballots_list)
        if total_voters == eligible_count:
            top_count = max(counts.values())
            tops = [cid for cid, c in counts.items() if c == top_count]
            if len(tops) == 1 and top_count == eligible_count:
                return StageAdvanceResult(
                    winner_id=tops[0],
                    advance_ids=None,
                    counts=counts,
                    early_consensus=True,
                )

    # stage final: tiebreak por viabilidade
    if is_final:
        max_votes = max(counts.values()) if counts else 0
        if max_votes == 0:
            return StageAdvanceResult(winner_id=candidate_ids[0], advance_ids=None, counts=counts)
        tied = [cid for cid in candidate_ids if counts[cid] == max_votes]
        if len(tied) == 1:
            return StageAdvanceResult(winner_id=tied[0], advance_ids=None, counts=counts)
        tied.sort(
            key=lambda cid: (
                -viability_by_id.get(cid, 0.0),
                candidate_ids.index(cid),
            )
        )
        return StageAdvanceResult(winner_id=tied[0], advance_ids=None, counts=counts)

    # stage intermediario: avanca top M = floor(N/2) (minimo 2),
    # desempate por seed determiniistico
    target_m = max(2, n // 2)
    ranked = sorted(
        candidate_ids,
        key=lambda cid: (-counts[cid], _intermediate_tiebreak_key(cid, seed)),
    )
    return StageAdvanceResult(winner_id=None, advance_ids=ranked[:target_m], counts=counts)


@dataclass(frozen=True)
class TallyResult:
    winner_id: uuid.UUID | None
    counts: dict[uuid.UUID, int]
    tied: list[uuid.UUID]


def tally(
    candidate_ids: list[uuid.UUID],
    ballots: Iterable[Iterable[uuid.UUID]],
    viability_by_id: dict[uuid.UUID, float],
) -> TallyResult:
    counts: dict[uuid.UUID, int] = {cid: 0 for cid in candidate_ids}
    for ballot in ballots:
        for cid in ballot:
            if cid in counts:
                counts[cid] += 1

    if not candidate_ids:
        return TallyResult(winner_id=None, counts={}, tied=[])

    max_votes = max(counts.values())
    if max_votes == 0:
        # Sem votos: primeiro candidato ganha
        return TallyResult(winner_id=candidate_ids[0], counts=counts, tied=[])

    tied = [cid for cid in candidate_ids if counts[cid] == max_votes]
    if len(tied) == 1:
        return TallyResult(winner_id=tied[0], counts=counts, tied=[])

    # Desempate por viability
    tied.sort(key=lambda cid: (-viability_by_id.get(cid, 0.0), candidate_ids.index(cid)))
    return TallyResult(winner_id=tied[0], counts=counts, tied=tied)
