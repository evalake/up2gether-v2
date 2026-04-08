"""Unit tests pro modulo security (jwt issue/decode). Sem DB, sem HTTP."""

import uuid

from app.core.security import decode_access_token, issue_access_token


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
