"""Importar todos os models aqui pra Base.metadata os enxergar em create_all e Alembic autogenerate."""

from app.models.event import Event
from app.models.game import (
    Game,
    GameRosterMembership,
    InterestSignalRow,
    SteamGameOwnership,
)
from app.models.group import Group, GroupMembership
from app.models.notification import Notification, PushSubscription
from app.models.session import PlaySession, SessionRsvpRow
from app.models.theme import MonthlyTheme, ThemeCycle, ThemeSuggestion, ThemeVote
from app.models.user import IntegrationAccount, User, UserHardwareProfile
from app.models.vote import VoteBallot, VoteSession

__all__ = [
    "Event",
    "Game",
    "GameRosterMembership",
    "Group",
    "GroupMembership",
    "IntegrationAccount",
    "InterestSignalRow",
    "MonthlyTheme",
    "Notification",
    "PlaySession",
    "PushSubscription",
    "SessionRsvpRow",
    "SteamGameOwnership",
    "ThemeCycle",
    "ThemeSuggestion",
    "ThemeVote",
    "User",
    "UserHardwareProfile",
    "VoteBallot",
    "VoteSession",
]
