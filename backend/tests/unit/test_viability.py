"""Golden tests da formula de viability. Logica pura, sem DB."""

from __future__ import annotations

import pytest

from app.domain.enums import HardwareTier
from app.services.viability import (
    ViabilityInput,
    calculate_hardware_compatibility,
    calculate_interest_score,
    calculate_price_score,
    calculate_viability,
)

# ---------- price ----------


@pytest.mark.parametrize(
    "is_free,price,expected",
    [
        (True, None, 100.0),
        (False, 0, 100.0),
        (False, None, 50.0),
        (False, 30, 85.0),
        (False, 80, 60.0),
        (False, 150, 35.0),
        (False, 250, 10.0),
        (False, 999, 10.0),
    ],
)
def test_price_score(is_free, price, expected):
    assert calculate_price_score(is_free, price) == pytest.approx(expected)


# ---------- hardware ----------


def test_hardware_no_members():
    assert calculate_hardware_compatibility(HardwareTier.HIGH, ()) == 100.0


def test_hardware_unknown_game_tier():
    assert (
        calculate_hardware_compatibility(HardwareTier.UNKNOWN, (HardwareTier.LOW, HardwareTier.LOW))
        == 100.0
    )


def test_hardware_all_above_required():
    tiers = (HardwareTier.MID, HardwareTier.HIGH)
    assert calculate_hardware_compatibility(HardwareTier.MID, tiers) == 100.0


def test_hardware_partial_fit():
    # game requer mid, 1 low + 1 high = 50%
    tiers = (HardwareTier.LOW, HardwareTier.HIGH)
    assert calculate_hardware_compatibility(HardwareTier.MID, tiers) == 50.0


def test_hardware_unknown_member_counts_half():
    # game requer high, 1 unknown (0.5) + 1 high (1) = 1.5/2 = 75%
    tiers = (HardwareTier.UNKNOWN, HardwareTier.HIGH)
    assert calculate_hardware_compatibility(HardwareTier.HIGH, tiers) == 75.0


# ---------- interest ----------


def test_interest_zero_members():
    assert calculate_interest_score(0, 0, 0, 0) == 50.0


def test_interest_all_want():
    # 4 wants, 4 members -> raw=8, max=8 -> 100
    assert calculate_interest_score(4, 0, 0, 4) == 100.0


def test_interest_mixed():
    # 1 want (2) + 1 ok (1) - 1 pass (0.5) = 2.5; max=8 -> 31.25
    assert calculate_interest_score(1, 1, 1, 4) == pytest.approx(31.25)


def test_interest_clamped_negative():
    # 4 pass = -2 raw -> clamp 0
    assert calculate_interest_score(0, 0, 4, 4) == 0.0


# ---------- end-to-end ----------


def test_viability_perfect_game():
    data = ViabilityInput(
        is_free=True,
        price_current=None,
        min_hardware_tier=HardwareTier.LOW,
        member_tiers=(HardwareTier.HIGH, HardwareTier.HIGH),
        want_count=2,
        ok_count=0,
        pass_count=0,
        member_count=2,
    )
    out = calculate_viability(data)
    assert out.price_score == 100.0
    assert out.hardware_fit_percent == 100.0
    assert out.interest_score == 100.0
    assert out.viability_score == 100.0


def test_viability_meh_game():
    # caro, hardware nao fecha, interesse fraco
    data = ViabilityInput(
        is_free=False,
        price_current=200,
        min_hardware_tier=HardwareTier.HIGH,
        member_tiers=(HardwareTier.LOW, HardwareTier.LOW),
        want_count=0,
        ok_count=1,
        pass_count=1,
        member_count=2,
    )
    out = calculate_viability(data)
    # 200 cai entre 150 e 250 -> 35 - (50/100)*25 = 22.5
    assert out.price_score == pytest.approx(22.5)
    assert out.hardware_fit_percent == 0.0
    # raw = 0 + 1 - 0.5 = 0.5; max=4 -> 12.5
    assert out.interest_score == pytest.approx(12.5)
    # 12.5*0.50 + 22.5*0.35 + 0*0.15 = 6.25 + 7.875 + 0 = 14.125
    assert out.viability_score == pytest.approx(14.125)
