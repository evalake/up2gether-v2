from __future__ import annotations

from app.domain.tiers import (
    TIER_PRICE_BRL,
    seat_limit_for_tier,
    tier_for_seats,
)


def test_tier_for_seats_buckets():
    assert tier_for_seats(0) == "free"
    assert tier_for_seats(10) == "free"
    assert tier_for_seats(11) == "pro"
    assert tier_for_seats(30) == "pro"
    assert tier_for_seats(31) == "community"
    assert tier_for_seats(100) == "community"
    assert tier_for_seats(101) == "creator"
    assert tier_for_seats(500) == "creator"
    assert tier_for_seats(501) == "over"


def test_seat_limit_for_tier():
    assert seat_limit_for_tier("free") == 10
    assert seat_limit_for_tier("pro") == 30
    assert seat_limit_for_tier("community") == 100
    assert seat_limit_for_tier("creator") == 500
    assert seat_limit_for_tier("over") is None


def test_tier_prices_match_business():
    assert TIER_PRICE_BRL["free"] == 0
    assert TIER_PRICE_BRL["pro"] == 29
    assert TIER_PRICE_BRL["community"] == 89
    assert TIER_PRICE_BRL["creator"] == 249
    assert TIER_PRICE_BRL["over"] == 0
