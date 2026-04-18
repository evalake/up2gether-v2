"""Unit tests pro modulo security (jwt issue/decode). Sem DB, sem HTTP."""

import uuid

from app.core.security import (
    decode_access_token,
    decode_scoped_token,
    issue_access_token,
    issue_scoped_token,
)


def test_issue_and_decode_roundtrip():
    user_id = uuid.uuid4()
    token = issue_access_token(user_id, discord_id="999")
    payload = decode_access_token(token)

    assert payload is not None
    assert payload["sub"] == str(user_id)
    assert payload["discord_id"] == "999"
    assert "exp" in payload
    assert "iat" in payload


def test_decode_invalid_token_returns_none():
    assert decode_access_token("not-a-jwt") is None


def test_decode_tampered_token_returns_none():
    user_id = uuid.uuid4()
    token = issue_access_token(user_id, discord_id="1")
    tampered = token[:-4] + "abcd"
    assert decode_access_token(tampered) is None


def test_scoped_token_roundtrip():
    uid = uuid.uuid4()
    tok = issue_scoped_token(uid, "steam-link", ttl_seconds=60)
    payload = decode_scoped_token(tok, "steam-link")
    assert payload is not None
    assert payload["sub"] == str(uid)
    assert payload["scope"] == "steam-link"


def test_scoped_token_rejects_wrong_scope():
    uid = uuid.uuid4()
    tok = issue_scoped_token(uid, "steam-link", ttl_seconds=60)
    # passar um access_token em vez de scoped tb deve rejeitar
    access = issue_access_token(uid, discord_id="x")
    assert decode_scoped_token(tok, "sse-stream") is None
    assert decode_scoped_token(access, "steam-link") is None


def test_scoped_token_rejects_garbage():
    assert decode_scoped_token("not-a-jwt", "steam-link") is None
