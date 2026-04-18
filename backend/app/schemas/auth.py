from pydantic import BaseModel, Field

from app.schemas.user import UserResponse


class DiscordCallbackRequest(BaseModel):
    # OAuth codes do Discord ficam <100 chars; 512 e folga. min=1 so evita vazio
    code: str = Field(min_length=1, max_length=512)
    # state agora e JWT assinado pelo backend (scope oauth:discord, TTL 10min).
    # valida sig+exp no callback, nao precisa sessionStorage do lado cliente.
    state: str = Field(min_length=16, max_length=1024)
    # attribution: string livre vindo de ?ref= na landing. max 64 chars pra
    # evitar abuso. so registra no event payload do signup inicial.
    ref: str | None = Field(None, max_length=64)


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    # path relativo pra navegar pos-login, veio assinado dentro do state JWT.
    # None = rota default (/). Nunca confiar em sessionStorage do cliente pra isso.
    next: str | None = None


class DiscordLoginUrlResponse(BaseModel):
    url: str
