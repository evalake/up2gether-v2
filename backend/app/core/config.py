from functools import lru_cache
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

AppEnv = Literal["development", "staging", "production"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # core — sem defaults pros secrets, boot falha se faltar
    jwt_secret: str = Field(min_length=16)
    database_url: str

    # chave Fernet pra criptografar tokens OAuth em integration_accounts.
    # se nao setada deriva do jwt_secret (dev/test). em prod SETAR explicita
    # pra rotacionar jwt_secret sem invalidar tokens de integracao.
    token_encryption_key: str = ""

    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24 * 7

    cors_origins: list[str] = ["http://localhost:5173"]

    # base url do frontend — usado em links de notif discord
    frontend_base_url: str = "http://localhost:5173"

    # discord ids que tem acesso god-mode (bypass de owner/admin/mod em tudo)
    # setar via env SYS_ADMIN_DISCORD_IDS='["123","456"]'
    sys_admin_discord_ids: list[str] = []

    # dev only — habilita POST /api/auth/dev-login pra E2E. NUNCA ligar em prod.
    dev_login_enabled: bool = False

    # app_env controla features prod-only (esconder /docs, headers, etc).
    # setar APP_ENV=production em prod (Fly).
    app_env: AppEnv = "development"

    @property
    def is_prod(self) -> bool:
        return self.app_env == "production"

    # discord
    discord_client_id: str = ""
    discord_client_secret: str = ""
    discord_redirect_uri: str = ""
    discord_bot_token: str = ""

    # steam
    steam_api_key: str = ""

    @model_validator(mode="after")
    def _guard_production(self) -> "Settings":
        # boot guard: se app_env=production, exige config completa e bloqueia
        # qualquer flag perigosa. melhor crashar no startup do que servir requests
        # com dev-login aberto ou Discord oauth quebrado.
        if self.app_env != "production":
            return self
        problems: list[str] = []
        if self.dev_login_enabled:
            problems.append(
                "DEV_LOGIN_ENABLED=true em production (endpoint /auth/dev-login fica aberto)"
            )
        if not self.discord_client_id or not self.discord_client_secret:
            problems.append("DISCORD_CLIENT_ID/SECRET nao setados (oauth quebra)")
        if not self.discord_redirect_uri:
            problems.append("DISCORD_REDIRECT_URI nao setado")
        if not self.discord_redirect_uri.startswith("https://"):
            problems.append("DISCORD_REDIRECT_URI precisa ser https em prod")
        if not self.frontend_base_url.startswith("https://"):
            problems.append("FRONTEND_BASE_URL precisa ser https em prod")
        bad_origins = [o for o in self.cors_origins if "localhost" in o or "127.0.0.1" in o]
        if bad_origins:
            problems.append(f"CORS_ORIGINS contem localhost em prod: {bad_origins}")
        if not self.token_encryption_key:
            problems.append(
                "TOKEN_ENCRYPTION_KEY nao setado em prod (rotacao de JWT_SECRET vai zerar integracoes)"
            )
        if problems:
            raise ValueError("Boot guard production falhou:\n  - " + "\n  - ".join(problems))
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
