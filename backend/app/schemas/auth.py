from pydantic import BaseModel, Field

from app.schemas.user import UserResponse


class DiscordCallbackRequest(BaseModel):
    code: str
    # state exigido pra fechar login-CSRF. frontend gera antes do redirect pro
    # discord, stasha em sessionStorage, valida na volta antes de mandar pra ca.
    # aqui so garante que veio algo de tamanho minimo (crypto.randomUUID = 36).
    state: str = Field(min_length=16, max_length=128)
    # attribution: string livre vindo de ?ref= na landing. max 64 chars pra
    # evitar abuso. so registra no event payload do signup inicial.
    ref: str | None = Field(None, max_length=64)


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
