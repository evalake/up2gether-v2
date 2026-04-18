"""Fernet pra criptografar tokens OAuth at-rest (integration_accounts).

Motivacao: access/refresh do Steam ficavam plaintext no banco. Se backup vaza
ou snapshot Neon escapa, atacante reusa o token direto.

Legado: tokens plaintext existentes sao detectados no decrypt (fernet falha) e
retornados as-is. Ciclam pra encrypted no proximo refresh OAuth.
"""

from __future__ import annotations

import base64
import hashlib
from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import String, TypeDecorator

from app.core.config import get_settings


@lru_cache
def _get_fernet() -> Fernet:
    s = get_settings()
    key = s.token_encryption_key
    if not key:
        # fallback: deriva do jwt_secret (32 bytes SHA-256 -> base64 urlsafe)
        digest = hashlib.sha256(s.jwt_secret.encode("utf-8")).digest()
        key = base64.urlsafe_b64encode(digest).decode("ascii")
    return Fernet(key.encode("ascii") if isinstance(key, str) else key)


def encrypt_token(plaintext: str) -> str:
    return _get_fernet().encrypt(plaintext.encode("utf-8")).decode("ascii")


def decrypt_token(ciphertext: str) -> str:
    try:
        return _get_fernet().decrypt(ciphertext.encode("ascii")).decode("utf-8")
    except (InvalidToken, ValueError):
        # legado plaintext pre-encryption, devolve como veio
        return ciphertext


class EncryptedString(TypeDecorator):
    """Criptografa strings transparente no ORM. Nullable: None passa direto."""

    impl = String
    cache_ok = True

    def process_bind_param(self, value, dialect):  # type: ignore[override]
        if value is None:
            return None
        return encrypt_token(value)

    def process_result_value(self, value, dialect):  # type: ignore[override]
        if value is None:
            return None
        return decrypt_token(value)
