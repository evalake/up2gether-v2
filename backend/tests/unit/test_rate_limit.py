from __future__ import annotations

import time
from types import SimpleNamespace

from app.core.rate_limit import TokenBucket, _client_key


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


def _fake_req(headers: dict[str, str], peer: str = "10.0.0.1"):
    h = {k.lower(): v for k, v in headers.items()}

    class H:
        def get(self, k, default=None):
            return h.get(k.lower(), default)

    return SimpleNamespace(headers=H(), client=SimpleNamespace(host=peer))


def test_client_key_ignores_spoofed_headers_outside_fly(monkeypatch):
    # sem FLY_APP_NAME -> ignora tudo, usa peer
    monkeypatch.delenv("FLY_APP_NAME", raising=False)
    req = _fake_req(
        {
            "Fly-Client-IP": "9.9.9.9",
            "CF-Connecting-IP": "8.8.8.8",
            "X-Forwarded-For": "7.7.7.7",
        },
        peer="10.0.0.1",
    )
    assert _client_key(req) == "10.0.0.1"


def test_client_key_trusts_fly_header_only_on_fly(monkeypatch):
    monkeypatch.setenv("FLY_APP_NAME", "up2gether-api")
    # Fly-Client-IP e confiavel (Fly sobrescreve)
    req = _fake_req({"Fly-Client-IP": "1.2.3.4"}, peer="10.0.0.1")
    assert _client_key(req) == "1.2.3.4"
    # CF-Connecting-IP sozinho e ignorado (CF nao fica na frente da API)
    req2 = _fake_req({"CF-Connecting-IP": "8.8.8.8"}, peer="10.0.0.2")
    assert _client_key(req2) == "10.0.0.2"
    # XFF sozinho tb e ignorado
    req3 = _fake_req({"X-Forwarded-For": "7.7.7.7"}, peer="10.0.0.3")
    assert _client_key(req3) == "10.0.0.3"


def test_client_key_fallback_when_no_peer(monkeypatch):
    monkeypatch.delenv("FLY_APP_NAME", raising=False)
    req = SimpleNamespace(
        headers=SimpleNamespace(get=lambda k, d=None: None),
        client=None,
    )
    assert _client_key(req) == "unknown"
