"""Unica fonte de verdade pros enums de dominio.

Tudo que antes estava duplicado entre models.py (SQLAlchemy) e schemas.py (Pydantic)
vive aqui. Importar daqui em ambos os lados.
"""

from enum import StrEnum


class GameStage(StrEnum):
    EXPLORING = "exploring"
    CAMPAIGN = "campaign"
    ENDGAME = "endgame"
    PAUSED = "paused"
    ABANDONED = "abandoned"


class InterestSignal(StrEnum):
    WANT = "want"
    OK = "ok"
    PASS = "pass"


class GroupRole(StrEnum):
    """Role dentro de um grupo. Owner nao e role: e o user_id em group.owner_user_id."""

    ADMIN = "admin"
    MOD = "mod"
    MEMBER = "member"


class VoteStatus(StrEnum):
    OPEN = "open"
    CLOSED = "closed"
    ARCHIVED = "archived"


class VoteKind(StrEnum):
    GAME = "game"
    THEME = "theme"


class SessionRsvp(StrEnum):
    YES = "yes"
    NO = "no"
    MAYBE = "maybe"


class AuthProvider(StrEnum):
    DISCORD = "discord"
    STEAM = "steam"
    GOOGLE = "google"


class ThemeCyclePhase(StrEnum):
    SUGGESTING = "suggesting"
    VOTING = "voting"
    DECIDED = "decided"
    CANCELLED = "cancelled"


class HardwareTier(StrEnum):
    LOW = "low"
    MID = "mid"
    HIGH = "high"
    UNKNOWN = "unknown"
