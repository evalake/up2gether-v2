"""Tier model do BUSINESS.md. Source of truth pra pricing + limites.

Seat = member com activated_at nao nulo (primeiro login via Discord). Esses
limites e precos batem com a tabela de pricing publica -- nao mudar aqui sem
alinhar com BUSINESS.md.
"""

from __future__ import annotations

TIER_FREE = "free"
TIER_PRO = "pro"
TIER_COMMUNITY = "community"
TIER_CREATOR = "creator"
TIER_OVER = "over"

# (limite superior inclusivo de seats, nome do tier)
TIER_LADDER: tuple[tuple[int, str], ...] = (
    (10, TIER_FREE),
    (30, TIER_PRO),
    (100, TIER_COMMUNITY),
    (500, TIER_CREATOR),
)

TIER_PRICE_BRL: dict[str, int] = {
    TIER_FREE: 0,
    TIER_PRO: 29,
    TIER_COMMUNITY: 89,
    TIER_CREATOR: 249,
    TIER_OVER: 0,
}


def tier_for_seats(seats: int) -> str:
    for limit, name in TIER_LADDER:
        if seats <= limit:
            return name
    return TIER_OVER


def seat_limit_for_tier(tier: str) -> int | None:
    """Teto inclusivo de seats do tier. None pra OVER (sem teto publico)."""
    for limit, name in TIER_LADDER:
        if name == tier:
            return limit
    return None
