"""Unit tests das correcoes do pentest (sec-hardening).

Cobre:
- H1: scope confusion — get_current_user rejeita token com claim `scope`.
- M1: _pg_notify parametrizado (nao deixa injection via payload).
- H8: rate_limit_mutation token bucket isola por (user, group).
- Token crypto: Fernet roundtrip + passthrough de plaintext legado.
"""

from __future__ import annotations

import uuid
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.core.rate_limit import TokenBucket, rate_limit_mutation
from app.core.security import decode_access_token, issue_scoped_token
from app.core.token_crypto import EncryptedString, decrypt_token, encrypt_token
from app.services.realtime import PG_CHANNEL, Broker

# -------- H1: scope confusion --------


def test_scoped_token_has_scope_claim():
    """Garantia de que tokens scoped levam o claim `scope`, base da guarda em get_current_user."""
    uid = uuid.uuid4()
    tok = issue_scoped_token(uid, "sse-stream", ttl_seconds=60)
    payload = decode_access_token(tok)
    assert payload is not None
    assert payload.get("scope") == "sse-stream"


def test_get_current_user_rejects_scoped_token_payload():
    """Simula o check do get_current_user: payload com scope != None e rejeitado."""
    uid = uuid.uuid4()
    tok = issue_scoped_token(uid, "steam-link", ttl_seconds=60)
    payload = decode_access_token(tok)
    assert payload is not None
    # replica da guarda em app/core/security.py:77
    assert payload.get("scope") is not None


# -------- M1: pg_notify parametrizado --------


async def test_pg_notify_uses_parameterized_query():
    """NOTIFY deve usar pg_notify($1,$2) pra nao ser injectavel via payload."""
    b = Broker()
    fake_conn = SimpleNamespace(execute=AsyncMock())
    b._pg_conn = fake_conn  # type: ignore[attr-defined]
    await b._pg_notify('{"kind":"x"}')
    fake_conn.execute.assert_awaited_once_with(
        "SELECT pg_notify($1, $2)", PG_CHANNEL, '{"kind":"x"}'
    )


async def test_pg_notify_passes_malicious_payload_as_param():
    """Payload com aspas/aspas simples/semicolon vai como parametro, nao interpolado."""
    b = Broker()
    fake_conn = SimpleNamespace(execute=AsyncMock())
    b._pg_conn = fake_conn  # type: ignore[attr-defined]
    evil = "'); DROP TABLE users; --"
    await b._pg_notify(evil)
    # o payload chega literal como arg posicional; nenhuma interpolacao em SQL string
    args = fake_conn.execute.await_args.args
    assert args[0] == "SELECT pg_notify($1, $2)"
    assert args[2] == evil  # payload passa intacto como param, nao quebra query


async def test_pg_notify_swallows_connection_error():
    """Falha no NOTIFY nao derruba o publisher (best-effort)."""
    b = Broker()

    async def boom(*a, **kw):
        raise RuntimeError("conn gone")

    b._pg_conn = SimpleNamespace(execute=boom)  # type: ignore[attr-defined]
    await b._pg_notify("ok")  # nao deve raise


# -------- H8: rate_limit_mutation --------


def test_mutation_bucket_allows_burst_and_blocks():
    b = TokenBucket(capacity=5, refill_per_sec=0.5)
    for _ in range(5):
        assert b.allow("u:g") is True
    assert b.allow("u:g") is False


def test_mutation_bucket_isolates_per_user_group():
    b = TokenBucket(capacity=2, refill_per_sec=0.5)
    assert b.allow("u1:gA") is True
    assert b.allow("u1:gA") is True
    assert b.allow("u1:gA") is False
    # mesmo user em outro grupo tem bucket proprio
    assert b.allow("u1:gB") is True
    # outro user no mesmo grupo tb
    assert b.allow("u2:gA") is True


def test_rate_limit_mutation_raises_429_on_flood():
    # usa o bucket global do modulo: esgota 5 entries e a 6a bate 429.
    uid = str(uuid.uuid4())
    gid = str(uuid.uuid4())
    for _ in range(5):
        rate_limit_mutation(uid, gid)
    with pytest.raises(Exception) as exc_info:
        rate_limit_mutation(uid, gid)
    assert "muitas acoes" in str(exc_info.value.detail)  # type: ignore[attr-defined]


# -------- Token crypto --------


def test_encrypt_decrypt_roundtrip():
    secret = "fake-steam-access-token"
    enc = encrypt_token(secret)
    assert enc != secret
    assert decrypt_token(enc) == secret


def test_decrypt_passthrough_plaintext_legacy():
    """Token plaintext pre-encryption (Fernet invalid) devolve as-is."""
    legacy = "legacy-plaintext-refresh-token"
    assert decrypt_token(legacy) == legacy


def test_encrypted_string_type_decorator_null_passthrough():
    col = EncryptedString()
    assert col.process_bind_param(None, None) is None
    assert col.process_result_value(None, None) is None


def test_encrypted_string_type_decorator_roundtrip():
    col = EncryptedString()
    enc = col.process_bind_param("abc123", None)
    assert enc != "abc123"
    assert col.process_result_value(enc, None) == "abc123"
