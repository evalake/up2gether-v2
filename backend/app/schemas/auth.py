from pydantic import BaseModel

from app.schemas.user import UserResponse


class DiscordCallbackRequest(BaseModel):
    code: str
    # attribution: string livre vindo de ?ref= na landing. max 64 chars pra
    # evitar abuso. so registra no event payload do signup inicial.
    ref: str | None = None


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
