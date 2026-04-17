from __future__ import annotations

import time
from threading import Lock
from typing import Annotated

from fastapi import Depends, HTTPException, Request, status


class TokenBucket:
    """Token bucket in-memory por key (geralmente IP).

    Capacity = burst permitido. refill_per_sec = throughput sustentado.
    Nao compartilha estado cross-machine, mas cobre o caso comum (abuse de 1 IP
    martelando uma instancia). Abuse distribuido passa, aceitavel como L1.
    """

    def __init__(self, capacity: int, refill_per_sec: float) -> None:
        self.capacity = capacity
        self.refill = refill_per_sec
        self._state: dict[str, tuple[float, float]] = {}
        self._lock = Lock()

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        with self._lock:
            tokens, last = self._state.get(key, (float(self.capacity), now))
            tokens = min(self.capacity, tokens + (now - last) * self.refill)
            if tokens < 1.0:
                self._state[key] = (tokens, now)
                return False
            self._state[key] = (tokens - 1.0, now)
            return True

    def reset(self) -> None:
        with self._lock:
            self._state.clear()


# 10 req / 60s sustentado, burst ate 10. calibrado pra usuario real de oauth
# (nao chega perto desse limit no uso normal).
_auth_bucket = TokenBucket(capacity=10, refill_per_sec=10 / 60)

# telemetry e 1x por sessao (flag em sessionStorage). bucket estreito pra detectar
# scanner martelando /telemetry/visit. 3 req burst, 3/min sustentado por IP.
_telemetry_bucket = TokenBucket(capacity=3, refill_per_sec=3 / 60)


def _client_key(request: Request) -> str:
    # Fly injeta Fly-Client-IP, Cloudflare injeta CF-Connecting-IP.
    # cair pra X-Forwarded-For first hop, depois request.client.host.
    h = request.headers
    for name in ("fly-client-ip", "cf-connecting-ip"):
        v = h.get(name)
        if v:
            return v
    xff = h.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def rate_limit_auth(request: Request) -> None:
    if not _auth_bucket.allow(_client_key(request)):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="muitas tentativas, espera um pouco",
        )


def rate_limit_telemetry(request: Request) -> None:
    if not _telemetry_bucket.allow(_client_key(request)):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="too many requests",
        )


RateLimitAuth = Annotated[None, Depends(rate_limit_auth)]
RateLimitTelemetry = Annotated[None, Depends(rate_limit_telemetry)]
