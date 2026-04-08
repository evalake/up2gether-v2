from __future__ import annotations

import uuid

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.enums import HardwareTier, InterestSignal
from app.models.game import (
    Game,
    GameRosterMembership,
    InterestSignalRow,
    SteamGameOwnership,
)
from app.models.group import GroupMembership
from app.models.user import User, UserHardwareProfile


class GameRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_id(self, game_id: uuid.UUID) -> Game | None:
        return await self.db.get(Game, game_id)

    async def get_by_name_in_group(self, group_id: uuid.UUID, name: str) -> Game | None:
        result = await self.db.execute(
            select(Game).where(
                Game.group_id == group_id,
                func.lower(Game.name) == name.lower(),
                Game.archived_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_steam_appid_in_group(
        self, group_id: uuid.UUID, steam_appid: int
    ) -> Game | None:
        result = await self.db.execute(
            select(Game).where(
                Game.group_id == group_id,
                Game.steam_appid == steam_appid,
                Game.archived_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list_for_group(
        self, group_id: uuid.UUID, include_archived: bool = False
    ) -> list[Game]:
        stmt = select(Game).where(Game.group_id == group_id)
        if not include_archived:
            stmt = stmt.where(Game.archived_at.is_(None))
        stmt = stmt.order_by(Game.created_at.desc())
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def count_for_group(self, group_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(Game)
            .where(Game.group_id == group_id, Game.archived_at.is_(None))
        )
        return int(result.scalar_one())

    async def add(self, game: Game) -> Game:
        self.db.add(game)
        await self.db.commit()
        await self.db.refresh(game)
        return game

    async def save(self) -> None:
        await self.db.commit()

    async def archive(self, game: Game, when) -> None:
        game.archived_at = when
        await self.db.commit()

    # ---- interest ----

    async def upsert_interest(
        self, game_id: uuid.UUID, user_id: uuid.UUID, signal: InterestSignal
    ) -> None:
        existing = await self.db.execute(
            select(InterestSignalRow).where(
                InterestSignalRow.game_id == game_id,
                InterestSignalRow.user_id == user_id,
            )
        )
        row = existing.scalar_one_or_none()
        if row is None:
            self.db.add(InterestSignalRow(game_id=game_id, user_id=user_id, signal=signal))
        else:
            row.signal = signal
        await self.db.commit()

    async def get_user_interest(
        self, game_id: uuid.UUID, user_id: uuid.UUID
    ) -> InterestSignal | None:
        result = await self.db.execute(
            select(InterestSignalRow.signal).where(
                InterestSignalRow.game_id == game_id,
                InterestSignalRow.user_id == user_id,
            )
        )
        val = result.scalar_one_or_none()
        return InterestSignal(val) if val else None

    async def count_interests_by_signal(self, game_id: uuid.UUID) -> dict[InterestSignal, int]:
        result = await self.db.execute(
            select(InterestSignalRow.signal, func.count())
            .where(InterestSignalRow.game_id == game_id)
            .group_by(InterestSignalRow.signal)
        )
        return {InterestSignal(s): int(c) for s, c in result.all()}

    # ---- roster ----

    async def upsert_roster(
        self,
        game_id: uuid.UUID,
        user_id: uuid.UUID,
        participation_status: str,
        notes: str | None,
    ) -> GameRosterMembership:
        existing = await self.db.execute(
            select(GameRosterMembership).where(
                GameRosterMembership.game_id == game_id,
                GameRosterMembership.user_id == user_id,
            )
        )
        row = existing.scalar_one_or_none()
        if row is None:
            row = GameRosterMembership(
                game_id=game_id,
                user_id=user_id,
                participation_status=participation_status,
                notes=notes,
            )
            self.db.add(row)
        else:
            row.participation_status = participation_status
            row.notes = notes
        await self.db.commit()
        await self.db.refresh(row)
        return row

    async def list_roster(self, game_id: uuid.UUID) -> list[GameRosterMembership]:
        result = await self.db.execute(
            select(GameRosterMembership).where(GameRosterMembership.game_id == game_id)
        )
        return list(result.scalars().all())

    async def remove_from_roster(self, game_id: uuid.UUID, user_id: uuid.UUID) -> None:
        await self.db.execute(
            delete(GameRosterMembership).where(
                GameRosterMembership.game_id == game_id,
                GameRosterMembership.user_id == user_id,
            )
        )
        await self.db.commit()

    async def has_roster(self, game_id: uuid.UUID, user_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            select(func.count())
            .select_from(GameRosterMembership)
            .where(
                GameRosterMembership.game_id == game_id,
                GameRosterMembership.user_id == user_id,
            )
        )
        return int(result.scalar_one()) > 0

    # ---- ownership ----

    async def set_ownership(self, user_id: uuid.UUID, game_id: uuid.UUID, owns: bool) -> None:
        if owns:
            existing = await self.db.execute(
                select(SteamGameOwnership).where(
                    SteamGameOwnership.user_id == user_id,
                    SteamGameOwnership.game_id == game_id,
                )
            )
            if existing.scalar_one_or_none() is None:
                self.db.add(SteamGameOwnership(user_id=user_id, game_id=game_id, manual=True))
        else:
            await self.db.execute(
                delete(SteamGameOwnership).where(
                    SteamGameOwnership.user_id == user_id,
                    SteamGameOwnership.game_id == game_id,
                )
            )
        await self.db.commit()

    async def count_owners(self, game_id: uuid.UUID) -> int:
        result = await self.db.execute(
            select(func.count())
            .select_from(SteamGameOwnership)
            .where(SteamGameOwnership.game_id == game_id)
        )
        return int(result.scalar_one())

    async def list_owners(self, game_id: uuid.UUID) -> list[User]:
        result = await self.db.execute(
            select(User)
            .join(SteamGameOwnership, SteamGameOwnership.user_id == User.id)
            .where(SteamGameOwnership.game_id == game_id)
        )
        return list(result.scalars().all())

    async def user_owns(self, user_id: uuid.UUID, game_id: uuid.UUID) -> bool:
        result = await self.db.execute(
            select(func.count())
            .select_from(SteamGameOwnership)
            .where(
                SteamGameOwnership.user_id == user_id,
                SteamGameOwnership.game_id == game_id,
            )
        )
        return int(result.scalar_one()) > 0

    # ---- group helpers (for viability) ----

    async def member_tiers(self, group_id: uuid.UUID) -> list[HardwareTier]:
        result = await self.db.execute(
            select(GroupMembership.user_id).where(GroupMembership.group_id == group_id)
        )
        user_ids = [row[0] for row in result.all()]
        if not user_ids:
            return []
        hw_result = await self.db.execute(
            select(UserHardwareProfile.user_id, UserHardwareProfile.tier).where(
                UserHardwareProfile.user_id.in_(user_ids)
            )
        )
        def _coerce(v: str) -> HardwareTier:
            # tolera "HardwareTier.MID" / "MID" / "mid"
            s = (v or "unknown").split(".")[-1].lower()
            try:
                return HardwareTier(s)
            except ValueError:
                return HardwareTier.UNKNOWN
        tier_map = {uid: tier for uid, tier in hw_result.all()}
        return [_coerce(tier_map.get(uid, "unknown")) for uid in user_ids]
