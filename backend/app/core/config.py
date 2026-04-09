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

    jwt_algorithm: str = "HS256"
    jwt_expiration_hours: int = 24 * 7

    cors_origins: list[str] = ["http://localhost:5173"]

    # base url do frontend — usado em links de notif discord
    frontend_base_url: str = "http://localhost:5173"

    # discord ids que tem acesso god-mode (bypass de owner/admin/mod em tudo)
    sys_admin_discord_ids: list[str] = ["220244848593076224"]

    # dev only — habilita POST /api/auth/dev-login pra E2E. NUNCA ligar em prod.
    dev_login_enabled: bool = False

    # discord
    discord_client_id: str = ""
    discord_client_secret: str = ""
    discord_redirect_uri: str = ""

    # steam
    steam_api_key: str = ""

    # google calendar
    google_client_id: str = ""
    google_client_secret: str = ""
    google_redirect_uri: str = ""

    # web push
    vapid_public_key: str = ""
    vapid_private_key: str = ""  # PEM direto como env (preferencia em prod)
    vapid_private_key_file: str = ""  # fallback: caminho de arquivo (dev)
    vapid_claims_email: str = "mailto:admin@up2gether.app"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
