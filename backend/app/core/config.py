from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


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
    app_env: str = "development"

    @property
    def is_prod(self) -> bool:
        return self.app_env.lower() in ("production", "prod")

    # discord
    discord_client_id: str = ""
    discord_client_secret: str = ""
    discord_redirect_uri: str = ""
    discord_bot_token: str = ""

    # steam
    steam_api_key: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
