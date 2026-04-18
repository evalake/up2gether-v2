"""Boot guard de produção: Settings refusa bootar se config ta perigosa.

Garante que erros de config viram crash imediato no startup, nao runtime.
"""

from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.core.config import Settings

BASE_PROD: dict = {
    "jwt_secret": "x" * 32,
    "database_url": "postgresql+asyncpg://u:p@host/db",
    "app_env": "production",
    "discord_client_id": "cid",
    "discord_client_secret": "csec",
    "discord_redirect_uri": "https://up2gether.com.br/auth/callback",
    "frontend_base_url": "https://up2gether.com.br",
    "cors_origins": ["https://up2gether.com.br"],
    "token_encryption_key": "k" * 44,
    "dev_login_enabled": False,
}


def test_dev_default_boots_clean():
    s = Settings(jwt_secret="x" * 32, database_url="sqlite:///:memory:")  # type: ignore[call-arg]
    assert s.app_env == "development"
    assert s.is_prod is False


def test_prod_minimal_boots_clean():
    s = Settings(**BASE_PROD)  # type: ignore[call-arg]
    assert s.is_prod is True


def test_prod_rejects_dev_login_enabled():
    cfg = BASE_PROD | {"dev_login_enabled": True}
    with pytest.raises(ValidationError, match="DEV_LOGIN_ENABLED"):
        Settings(**cfg)  # type: ignore[call-arg]


def test_prod_rejects_missing_discord():
    cfg = BASE_PROD | {"discord_client_secret": ""}
    with pytest.raises(ValidationError, match="DISCORD_CLIENT_ID/SECRET"):
        Settings(**cfg)  # type: ignore[call-arg]


def test_prod_rejects_http_redirect():
    cfg = BASE_PROD | {"discord_redirect_uri": "http://example.com/cb"}
    with pytest.raises(ValidationError, match="https em prod"):
        Settings(**cfg)  # type: ignore[call-arg]


def test_prod_rejects_localhost_in_cors():
    cfg = BASE_PROD | {"cors_origins": ["https://up2gether.com.br", "http://localhost:5173"]}
    with pytest.raises(ValidationError, match="localhost em prod"):
        Settings(**cfg)  # type: ignore[call-arg]


def test_prod_rejects_missing_token_encryption_key():
    cfg = BASE_PROD | {"token_encryption_key": ""}
    with pytest.raises(ValidationError, match="TOKEN_ENCRYPTION_KEY"):
        Settings(**cfg)  # type: ignore[call-arg]


def test_invalid_app_env_rejected():
    cfg = BASE_PROD | {"app_env": "prod"}  # tem que ser literal "production"
    with pytest.raises(ValidationError):
        Settings(**cfg)  # type: ignore[call-arg]
