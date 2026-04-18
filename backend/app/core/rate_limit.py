from __future__ import annotations

import os
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

# mutations que disparam notify_group (webhook Discord + SSE + push + row em
# notifications): current-game toggle, webhook update, etc.
# Burst 5, sustentado 1 req / 2s por (user, group). flood vector evitado.
_mutation_bucket = TokenBucket(capacity=5, refill_per_sec=0.5)


def _client_key(request: Request) -> str:
    # sempre que estamos no Fly (FLY_APP_NAME set pelo runtime), confiamos so no
    # Fly-Client-IP — o proxy sobrescreve headers enviados pelo cliente. Fora do
    # Fly, ignora headers externos e usa peer direto (evita spoof em dev ou se a
    # app for movida pra trás de outro proxy sem updating dessa logica).
    if os.environ.get("FLY_APP_NAME"):
        v = request.headers.get("fly-client-ip")
        if v:
            return v
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


def rate_limit_mutation(user_id: str, group_id: str) -> None:
    """Bucket por (user, group). Usar em mutations que disparam notify_group
    (webhook Discord + push + SSE): current-game toggle, webhook URL change, etc.
    """
    if not _mutation_bucket.allow(f"{user_id}:{group_id}"):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="muitas acoes seguidas, espera um pouco",
        )


RateLimitAuth = Annotated[None, Depends(rate_limit_auth)]
RateLimitTelemetry = Annotated[None, Depends(rate_limit_telemetry)]
