from __future__ import annotations

import uuid
from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.domain.enums import GameSource, GameStage, HardwareTier, InterestSignal

# tag/genero individual: 50 char ja cobre os mais longos da Steam
_TagStr = Annotated[str, Field(max_length=50)]

# limites humanos: acima disso tratamos como "infinito"/null
PLAYER_CAP = 32


def _round_price(v: float | None) -> float | None:
    if v is None:
        return None
    return round(float(v), 2)


def _cap_players(v: int | None) -> int | None:
    # > 32 vira None (sem limite)
    if v is None:
        return None
    if v > PLAYER_CAP:
        return None
    return v


class GameCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    steam_appid: int | None = None
    cover_url: str | None = Field(None, max_length=500)
    description: str | None = Field(None, max_length=2000)
    is_free: bool = False
    price_current: float | None = Field(None, ge=0, le=100000)
    genres: list[_TagStr] = Field(default=[], max_length=20)
    tags: list[_TagStr] = Field(default=[], max_length=30)
    player_min: int = Field(1, ge=1, le=PLAYER_CAP)
    player_max: int | None = Field(None, ge=1)
    min_hardware_tier: HardwareTier = HardwareTier.UNKNOWN
    developer: str | None = Field(None, max_length=200)
    publisher: str | None = Field(None, max_length=200)
    release_date: str | None = Field(None, max_length=40)
    metacritic_score: int | None = Field(None, ge=0, le=100)
    price_original: float | None = Field(None, ge=0, le=100000)
    discount_percent: int | None = Field(None, ge=0, le=100)
    source: GameSource = GameSource.STEAM

    @field_validator("price_current", "price_original")
    @classmethod
    def _round_prices(cls, v: float | None) -> float | None:
        return _round_price(v)

    @field_validator("player_max")
    @classmethod
    def _cap_player_max(cls, v: int | None) -> int | None:
        return _cap_players(v)


class GameUpdate(BaseModel):
    name: str | None = Field(None, min_length=2, max_length=120)
    stage: GameStage | None = None
    cover_url: str | None = Field(None, max_length=500)
    description: str | None = Field(None, max_length=2000)
    player_min: int | None = Field(None, ge=1, le=PLAYER_CAP)
    player_max: int | None = Field(None, ge=1)
    min_hardware_tier: HardwareTier | None = None
    steam_appid: int | None = None
    is_free: bool | None = None
    price_current: float | None = Field(None, ge=0, le=100000)
    genres: list[_TagStr] | None = Field(None, max_length=20)
    tags: list[_TagStr] | None = Field(None, max_length=30)
    developer: str | None = Field(None, max_length=200)
    publisher: str | None = Field(None, max_length=200)
    release_date: str | None = Field(None, max_length=40)
    metacritic_score: int | None = Field(None, ge=0, le=100)
    price_original: float | None = Field(None, ge=0, le=100000)
    discount_percent: int | None = Field(None, ge=0, le=100)

    @field_validator("price_current", "price_original")
    @classmethod
    def _round_prices(cls, v: float | None) -> float | None:
        return _round_price(v)

    @field_validator("player_max")
    @classmethod
    def _cap_player_max(cls, v: int | None) -> int | None:
        return _cap_players(v)


class GameViability(BaseModel):
    price_score: float
    hardware_fit_percent: float
    interest_score: float
    viability_score: float
    interest_want_count: int
    interest_ok_count: int
    interest_pass_count: int
    ownership_count: int


class GameResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    group_id: uuid.UUID
    name: str
    steam_appid: int | None = None
    cover_url: str | None = None
    description: str | None = None
    is_free: bool
    price_current: float | None = None
    genres: list[str] = []
    tags: list[str] = []
    player_min: int
    player_max: int | None = None
    min_hardware_tier: HardwareTier
    stage: GameStage
    stage_updated_at: datetime
    created_by: uuid.UUID | None
    created_at: datetime
    archived_at: datetime | None = None
    developer: str | None = None
    publisher: str | None = None
    release_date: str | None = None
    metacritic_score: int | None = None
    price_original: float | None = None
    discount_percent: int | None = None
    review_score_desc: str | None = None
    source: GameSource = GameSource.STEAM


class GameWithViability(GameResponse):
    viability: GameViability
    user_interest: InterestSignal | None = None
    user_in_roster: bool = False
    user_owns_game: bool = False


class InterestSignalUpdate(BaseModel):
    signal: InterestSignal


class OwnershipToggle(BaseModel):
    owns: bool
