from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status

from app.domain.enums import GroupRole, SessionRsvp
from app.models.session import PlaySession
from app.models.user import User
from app.repositories.game_repo import GameRepository
from app.repositories.group_repo import GroupRepository
from app.repositories.session_repo import SessionRepository
from app.schemas.session import (
    RsvpResponse,
    SessionAuditGame,
    SessionAuditPerson,
    SessionAuditResponse,
    SessionAuditRsvp,
    SessionCreate,
    SessionResponse,
    SessionUpdate,
)
from app.services.notifications import notify_group


def _forbid(d: str) -> HTTPException:
    return HTTPException(status.HTTP_403_FORBIDDEN, d)


def _not_found(d: str) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, d)


def _bad(d: str) -> HTTPException:
    return HTTPException(status.HTTP_400_BAD_REQUEST, d)


class PlaySessionService:
    def __init__(
        self,
        sessions: SessionRepository,
        groups: GroupRepository,
        games: GameRepository,
    ) -> None:
        self.sessions = sessions
        self.groups = groups
        self.games = games

    async def _require_member(self, group_id: uuid.UUID, actor: User):
        group = await self.groups.get_by_id(group_id)
        if group is None:
            raise _not_found("Group not found")
        m = await self.groups.get_membership(group_id, actor.id)
        if m is None:
            if actor.is_sys_admin:
                from app.models.group import GroupMembership

                m = GroupMembership(group_id=group_id, user_id=actor.id, role=GroupRole.ADMIN)
            else:
                raise _forbid("Not a member of this group")
        return group, m

    async def _require_admin_or_mod(self, group_id: uuid.UUID, actor: User):
        _, m = await self._require_member(group_id, actor)
        if not actor.is_sys_admin and m.role not in (GroupRole.ADMIN, GroupRole.MOD):
            raise _forbid("Admin or Mod role required")

    async def create(
        self, group_id: uuid.UUID, data: SessionCreate, actor: User
    ) -> SessionResponse:
        await self._require_member(group_id, actor)
        game = await self.games.get_by_id(data.game_id)
        if game is None or game.group_id != group_id:
            raise _bad("Jogo nao pertence ao grupo")
        session = PlaySession(
            group_id=group_id,
            game_id=data.game_id,
            created_by=actor.id,
            title=data.title,
            description=data.description,
            start_at=data.start_at,
            duration_minutes=data.duration_minutes,
            max_participants=data.max_participants,
            status="scheduled",
        )
        await self.sessions.add(session)
        # best-effort google calendar sync pro criador (se conectado)
        from app.domain.enums import AuthProvider

        google_int = next(
            (i for i in actor.integrations if i.provider == AuthProvider.GOOGLE),
            None,
        )
        if google_int and google_int.access_token:
            try:
                from app.integrations.google_calendar import HttpGoogleCalendarClient

                gc = HttpGoogleCalendarClient()
                # se expirado e tem refresh, refresh
                if (
                    google_int.token_expires_at
                    and google_int.token_expires_at < datetime.now(UTC)
                    and google_int.refresh_token
                ):
                    new_tokens = await gc.refresh(google_int.refresh_token)
                    google_int.access_token = new_tokens.get(
                        "access_token", google_int.access_token
                    )
                    google_int.token_expires_at = datetime.now(UTC) + timedelta(
                        seconds=int(new_tokens.get("expires_in", 3600))
                    )
                    await self.sessions.db.commit()
                await gc.create_event(
                    google_int.access_token,
                    summary=data.title,
                    start=data.start_at,
                    duration_min=data.duration_minutes,
                    description=data.description or "",
                )
            except Exception:
                import logging as _log

                _log.getLogger(__name__).warning("google calendar sync falhou", exc_info=True)
        when = data.start_at.strftime("%d/%m %H:%M")
        fields = [
            {"name": "Jogo", "value": game.name, "inline": True},
            {"name": "Quando", "value": when, "inline": True},
            {"name": "Duração", "value": f"{data.duration_minutes} min", "inline": True},
        ]
        await notify_group(
            self.sessions.db,
            group_id=group_id,
            event="session.created",
            title=f"Sessão agendada: {data.title}",
            body=f"{game.name} · {when}",
            link=f"/groups/{group_id}/sessions",
            data={"session_id": str(session.id), "group_id": str(group_id)},
            exclude_user_ids=[actor.id],
            webhook_description=(
                f"**{data.title}** foi agendada.\n\n"
                f"Responda o RSVP na plataforma pra garantir sua vaga."
            ),
            webhook_fields=fields,
            webhook_image_url=game.cover_url,
        )
        return await self._to_response(session, actor)

    async def list_for_group(
        self, group_id: uuid.UUID, actor: User, limit: int = 50, offset: int = 0
    ) -> list[SessionResponse]:
        await self._require_member(group_id, actor)
        sessions = await self.sessions.list_for_group(group_id, limit, offset)
        return [await self._to_response(s, actor) for s in sessions]

    async def get(self, group_id: uuid.UUID, session_id: uuid.UUID, actor: User) -> SessionResponse:
        await self._require_member(group_id, actor)
        session = await self.sessions.get(session_id)
        if session is None or session.group_id != group_id:
            raise _not_found("Session not found")
        return await self._to_response(session, actor)

    async def update(
        self,
        group_id: uuid.UUID,
        session_id: uuid.UUID,
        data: SessionUpdate,
        actor: User,
    ) -> SessionResponse:
        _, m = await self._require_member(group_id, actor)
        session = await self.sessions.get(session_id)
        if session is None or session.group_id != group_id:
            raise _not_found("Session not found")
        is_staff = actor.is_sys_admin or m.role in (GroupRole.ADMIN, GroupRole.MOD)
        if session.created_by != actor.id and not is_staff:
            raise _forbid("so o criador, mod ou admin pode editar essa sessao")
        for field in (
            "title",
            "description",
            "start_at",
            "duration_minutes",
            "max_participants",
            "status",
        ):
            v = getattr(data, field)
            if v is not None:
                setattr(session, field, v)
        await self.sessions.save()
        return await self._to_response(session, actor)

    async def delete(self, group_id: uuid.UUID, session_id: uuid.UUID, actor: User) -> None:
        _, m = await self._require_member(group_id, actor)
        session = await self.sessions.get(session_id)
        if session is None or session.group_id != group_id:
            raise _not_found("Session not found")
        is_staff = actor.is_sys_admin or m.role in (GroupRole.ADMIN, GroupRole.MOD)
        if session.created_by != actor.id and not is_staff:
            raise _forbid("so o criador, mod ou admin pode deletar essa sessao")
        await self.sessions.delete(session)

    async def rsvp(
        self,
        group_id: uuid.UUID,
        session_id: uuid.UUID,
        rsvp_status: SessionRsvp,
        actor: User,
    ) -> SessionResponse:
        await self._require_member(group_id, actor)
        session = await self.sessions.get(session_id)
        if session is None or session.group_id != group_id:
            raise _not_found("Session not found")
        start = session.start_at
        if start.tzinfo is None:
            start = start.replace(tzinfo=UTC)
        if start <= datetime.now(UTC):
            raise _forbid("sessao ja comecou, rsvp travado")
        await self.sessions.upsert_rsvp(session_id, actor.id, rsvp_status)
        return await self._to_response(session, actor)

    async def audit(
        self, group_id: uuid.UUID, session_id: uuid.UUID, actor: User
    ) -> SessionAuditResponse:
        await self._require_member(group_id, actor)
        session = await self.sessions.get(session_id)
        if session is None or session.group_id != group_id:
            raise _not_found("Session not found")

        session_resp = await self._to_response(session, actor)
        rows = await self.sessions.list_rsvps(session.id)

        from sqlalchemy import select as _sel

        from app.models.game import Game as GameModel
        from app.models.user import User as UserModel

        user_ids: set[uuid.UUID] = {r.user_id for r in rows}
        if session.created_by:
            user_ids.add(session.created_by)
        members = await self.groups.list_members(group_id)
        member_user_ids = [m.user_id for m in members]
        user_ids.update(member_user_ids)

        users_by_id: dict[uuid.UUID, User] = {}
        if user_ids:
            urows = await self.sessions.db.execute(
                _sel(UserModel).where(UserModel.id.in_(list(user_ids)))
            )
            for u in urows.scalars().all():
                users_by_id[u.id] = u

        def _person(uid: uuid.UUID | None) -> SessionAuditPerson:
            if uid is None or uid not in users_by_id:
                return SessionAuditPerson(
                    id=uid, discord_id=None, display_name=None, avatar_url=None
                )
            u = users_by_id[uid]
            return SessionAuditPerson(
                id=u.id,
                discord_id=u.discord_id,
                display_name=u.discord_display_name or u.discord_username,
                avatar_url=u.discord_avatar,
            )

        game_obj: SessionAuditGame | None = None
        grow = await self.sessions.db.execute(
            _sel(GameModel).where(GameModel.id == session.game_id)
        )
        g = grow.scalar_one_or_none()
        if g is not None:
            game_obj = SessionAuditGame(id=g.id, name=g.name, cover_url=g.cover_url)

        rsvps: list[SessionAuditRsvp] = []
        responded: set[uuid.UUID] = set()
        for r in sorted(rows, key=lambda x: x.updated_at, reverse=True):
            u = users_by_id.get(r.user_id)
            responded.add(r.user_id)
            rsvps.append(
                SessionAuditRsvp(
                    user_id=r.user_id,
                    discord_id=u.discord_id if u else None,
                    display_name=(u.discord_display_name or u.discord_username)
                    if u
                    else "(removido)",
                    avatar_url=u.discord_avatar if u else None,
                    status=SessionRsvp(r.status),
                    updated_at=r.updated_at,
                )
            )

        non_respondents = [_person(uid) for uid in member_user_ids if uid not in responded]

        return SessionAuditResponse(
            session=session_resp,
            creator=_person(session.created_by),
            game=game_obj,
            rsvps=rsvps,
            non_respondents=non_respondents,
        )

    # ---- helpers ----

    async def _to_response(self, session: PlaySession, actor: User) -> SessionResponse:
        rows = await self.sessions.list_rsvps(session.id)
        yes = sum(1 for r in rows if r.status == SessionRsvp.YES)
        no = sum(1 for r in rows if r.status == SessionRsvp.NO)
        maybe = sum(1 for r in rows if r.status == SessionRsvp.MAYBE)
        user_rsvp = next((SessionRsvp(r.status) for r in rows if r.user_id == actor.id), None)
        return SessionResponse(
            id=session.id,
            group_id=session.group_id,
            game_id=session.game_id,
            created_by=session.created_by,
            title=session.title,
            description=session.description,
            start_at=session.start_at,
            duration_minutes=session.duration_minutes,
            max_participants=session.max_participants,
            status=session.status,
            created_at=session.created_at,
            rsvp_yes=yes,
            rsvp_no=no,
            rsvp_maybe=maybe,
            user_rsvp=user_rsvp,
            rsvps=[
                RsvpResponse(
                    user_id=r.user_id,
                    status=SessionRsvp(r.status),
                    updated_at=r.updated_at,
                )
                for r in rows
            ],
        )
