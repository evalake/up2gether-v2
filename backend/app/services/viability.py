"""Calculo de viabilidade de jogo. Logica pura, sem I/O.

Formula (3 fatores):
- Interesse (50%): want*2 + ok - pass*0.5, sempre dividido pelo total de membros
  do grupo (quem nao votou conta como neutro, nao infla o score)
- Preco (35%): gratis/barato melhor
- Hardware (15%): % de membros que rodam. Peso baixo de proposito: as vezes
  um jogo roda em 1 PC mas nao em 3, e ai nem da pra jogar junto, entao
  hardware sozinho nao decide viabilidade. Serve mais como filtro que como score.
"""

from __future__ import annotations

from dataclasses import dataclass

from app.domain.enums import HardwareTier

_TIER_LEVEL = {
    HardwareTier.UNKNOWN: 0,
    HardwareTier.LOW: 1,
    HardwareTier.MID: 2,
    HardwareTier.HIGH: 3,
}


@dataclass(frozen=True)
class ViabilityInput:
    is_free: bool
    price_current: float | None
    min_hardware_tier: HardwareTier
    member_tiers: tuple[HardwareTier, ...]
    want_count: int
    ok_count: int
    pass_count: int
    member_count: int


@dataclass(frozen=True)
class ViabilityScore:
    price_score: float
    hardware_fit_percent: float
    interest_score: float
    viability_score: float


def calculate_price_score(is_free: bool, price_current: float | None) -> float:
    # interpolacao linear: gratis = 100, R$30 = 85, R$80 = 60, R$150 = 35, R$250+ = 10
    if is_free or price_current == 0:
        return 100.0
    if price_current is None:
        return 50.0
    p = float(price_current)
    if p <= 30:
        return 100 - (p / 30) * 15  # 100 -> 85
    if p <= 80:
        return 85 - ((p - 30) / 50) * 25  # 85 -> 60
    if p <= 150:
        return 60 - ((p - 80) / 70) * 25  # 60 -> 35
    if p <= 250:
        return 35 - ((p - 150) / 100) * 25  # 35 -> 10
    return 10.0


def calculate_hardware_compatibility(
    game_tier: HardwareTier, member_tiers: tuple[HardwareTier, ...]
) -> float:
    if not member_tiers:
        return 100.0
    if game_tier == HardwareTier.UNKNOWN:
        return 100.0

    game_level = _TIER_LEVEL[game_tier]
    can_run = 0.0
    total = 0
    for tier in member_tiers:
        total += 1
        if tier == HardwareTier.UNKNOWN:
            can_run += 0.5
        elif _TIER_LEVEL[tier] >= game_level:
            can_run += 1
    return (can_run / total) * 100 if total else 100.0


def calculate_interest_score(want: int, ok: int, pass_: int, member_count: int) -> float:
    if member_count <= 0:
        return 50.0
    raw = want * 2 + ok - pass_ * 0.5
    max_possible = member_count * 2
    return max(0.0, min(100.0, (raw / max_possible) * 100))


def calculate_viability(data: ViabilityInput) -> ViabilityScore:
    price = calculate_price_score(data.is_free, data.price_current)
    hw = calculate_hardware_compatibility(data.min_hardware_tier, data.member_tiers)
    interest = calculate_interest_score(
        data.want_count, data.ok_count, data.pass_count, data.member_count
    )
    score = interest * 0.50 + price * 0.35 + hw * 0.15
    score = max(0.0, min(100.0, score))
    return ViabilityScore(
        price_score=price,
        hardware_fit_percent=hw,
        interest_score=interest,
        viability_score=score,
    )
