"""JWT issue/verify + current_user dependency.

JWT_SECRET vem do Settings (sem default, boot falha se faltar).
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jwt import PyJWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.database import get_db
from app.models.user import User
from app.repositories.user_repo import UserRepository

_bearer = HTTPBearer(auto_error=False)


def issue_access_token(user_id: uuid.UUID, discord_id: str, token_generation: int = 0) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "discord_id": discord_id,
        "gen": token_generation,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=settings.jwt_expiration_hours)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_access_token(token: str) -> dict | None:
    settings = get_settings()
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except PyJWTError:
        return None


def issue_scoped_token(user_id: uuid.UUID, scope: str, ttl_seconds: int) -> str:
    """Token efemero com scope isolado. Nunca reutilizar access token como state de OAuth."""
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "scope": scope,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=ttl_seconds)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_scoped_token(token: str, expected_scope: str) -> dict | None:
    payload = decode_access_token(token)
    if not payload or payload.get("scope") != expected_scope:
        return None
    return payload


# oauth state e stateless: JWT assinado com TTL curto. nao precisa sessionStorage
# no cliente, entao cross-browser funciona. a defesa contra login-CSRF vem do
# TTL + o `code` do discord ser single-use e ligado ao authorize inicial.
_OAUTH_STATE_SCOPE = "oauth:discord"
_OAUTH_STATE_TTL = 600  # 10min


def issue_oauth_state(next_path: str | None = None) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload: dict = {
        "scope": _OAUTH_STATE_SCOPE,
        "nonce": uuid.uuid4().hex,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(seconds=_OAUTH_STATE_TTL)).timestamp()),
    }
    if next_path:
        payload["next"] = next_path
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def verify_oauth_state(token: str) -> dict | None:
    payload = decode_access_token(token)
    if not payload or payload.get("scope") != _OAUTH_STATE_SCOPE:
        return None
    return payload


async def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    if not creds:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    payload = decode_access_token(creds.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    # scoped tokens (sse ticket, oauth-link state) nao podem virar access token.
    # se vazarem em referer/log, sem essa guarda viram sessao completa pelo TTL.
    if payload.get("scope") is not None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")
    try:
        user_id = uuid.UUID(payload["sub"])
    except ValueError as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token subject") from exc

    user = await UserRepository(db).get_by_id(user_id)
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    # logout/revoke incrementa user.token_generation. JWTs antigos nao batem mais.
    # token sem gen (legado pre-W1.2) trata como gen=0 pra nao invalidar todo mundo.
    token_gen = payload.get("gen", 0)
    if not isinstance(token_gen, int) or token_gen != user.token_generation:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token revoked")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
