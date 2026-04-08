from pydantic import BaseModel

from app.schemas.user import UserResponse


class DiscordCallbackRequest(BaseModel):
    code: str


class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
