from __future__ import annotations

import time

from app.core.rate_limit import TokenBucket


def test_bucket_allows_burst_up_to_capacity():
    b = TokenBucket(capacity=5, refill_per_sec=1.0)
    for _ in range(5):
        assert b.allow("ip1") is True
    assert b.allow("ip1") is False


def test_bucket_isolates_keys():
    b = TokenBucket(capacity=2, refill_per_sec=1.0)
    assert b.allow("a") is True
    assert b.allow("a") is True
    assert b.allow("a") is False
    # outro IP nao deve ser afetado
    assert b.allow("b") is True


def test_bucket_refills_over_time(monkeypatch):
    now = [1000.0]

    def fake_time() -> float:
        return now[0]

    monkeypatch.setattr(time, "monotonic", fake_time)
    b = TokenBucket(capacity=2, refill_per_sec=1.0)
    assert b.allow("x") is True
    assert b.allow("x") is True
    assert b.allow("x") is False
    # 1s depois refilla 1 token
    now[0] += 1.1
    assert b.allow("x") is True
    assert b.allow("x") is False
