from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select

from app.domain.enums import GroupRole, HardwareTier, InterestSignal, VoteStatus
from app.models.game import Game
from app.models.user import User
from app.models.vote import VoteSession, VoteStage
from app.repositories.game_repo import GameRepository
from app.repositories.group_repo import GroupRepository
from app.repositories.vote_repo import VoteRepository
from app.schemas.vote import (
    VoteAuditCreator,
    VoteAuditGame,
    VoteAuditResponse,
    VoteAuditVoter,
    VoteSessionCreate,
    VoteSessionResponse,
    VoteStageResponse,
)
from app.services.events import (
    EVENT_VOTE_CAST,
    EVENT_VOTE_COMPLETED,
    EVENT_VOTE_CREATED,
    track_event,
)
from app.services.notifications import notify_group
from app.services.viability import ViabilityInput, calculate_viability
from app.services.vote_engine import (
    advance_stage,
    calculate_max_selections_for_stage,
    calculate_quorum,
    get_stage_sizes,
)


def _forbid(d: str) -> HTTPException:
    return HTTPException(status.HTTP_403_FORBIDDEN, d)


def _not_found(d: str) -> HTTPException:
    return HTTPException(status.HTTP_404_NOT_FOUND, d)


def _bad(d: str) -> HTTPException:
    return HTTPException(status.HTTP_400_BAD_REQUEST, d)


class VoteService:
    def __init__(
        self,
        votes: VoteRepository,
        groups: GroupRepository,
        games: GameRepository,
    ) -> None:
        self.votes = votes
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
        return m

    async def create(
        self, group_id: uuid.UUID, data: VoteSessionCreate, actor: User
    ) -> VoteSessionResponse:
        await self._require_admin_or_mod(group_id, actor)
        if not data.candidate_game_ids:
            raise _bad("Pelo menos um candidato e necessario")

        # valida que candidatos sao do grupo
        for cid in data.candidate_game_ids:
            game = await self.games.get_by_id(cid)
            if game is None or game.group_id != group_id:
                raise _bad(f"Candidato {cid} nao pertence ao grupo")

        eligible = max(await self.groups.count_members(group_id), 1)
        n = len(data.candidate_game_ids)
        now = datetime.now(UTC)
        stage_sizes = get_stage_sizes(n)
        total_stages = len(stage_sizes)
        # divide duration igualmente entre stages (min 1h por stage)
        per_stage_hours = max(1, data.duration_hours // total_stages)
        stage_closes = now + timedelta(hours=per_stage_hours)
        session = VoteSession(
            group_id=group_id,
            created_by=actor.id,
            title=data.title,
            description=data.description,
            status=VoteStatus.OPEN,
            candidate_game_ids=list(data.candidate_game_ids),
            eligible_voter_count=eligible,
            quorum_count=calculate_quorum(eligible),
            max_selections=calculate_max_selections_for_stage(n),
            opens_at=now,
            closes_at=now + timedelta(hours=data.duration_hours),
            tiebreak_seed=secrets.randbits(63),
            current_stage_number=1,
            total_stages=total_stages,
        )
        await self.votes.add(session)
        stage1 = VoteStage(
            vote_session_id=session.id,
            stage_number=1,
            candidate_game_ids=list(data.candidate_game_ids),
            max_selections=calculate_max_selections_for_stage(n),
            status=VoteStatus.OPEN,
            opens_at=now,
            closes_at=stage_closes,
        )
        await self.votes.add_stage(stage1)
        await track_event(
            self.votes.db,
            EVENT_VOTE_CREATED,
            user_id=actor.id,
            group_id=group_id,
            payload={
                "vote_id": str(session.id),
                "candidates": len(data.candidate_game_ids),
                "total_stages": total_stages,
            },
        )
        # notifica todos os membros do grupo + webhook discord
        cand_games = (
            (
                await self.votes.db.execute(
                    select(Game).where(Game.id.in_(data.candidate_game_ids[:10]))
                )
            )
            .scalars()
            .all()
        )
        fields = [
            {"name": g.name, "value": f"{g.player_min}+ jogadores", "inline": True}
            for g in cand_games[:9]
        ]
        if len(data.candidate_game_ids) > 9:
            fields.append(
                {
                    "name": "+ " + str(len(data.candidate_game_ids) - 9),
                    "value": "outros candidatos",
                    "inline": True,
                }
            )
        await notify_group(
            self.votes.db,
            group_id=group_id,
            event="game_vote.opened",
            title=f"Nova votação: {data.title}",
            body=f"{len(data.candidate_game_ids)} candidatos, fecha em {data.duration_hours}h",
            link=f"/groups/{group_id}/votes",
            data={"vote_id": str(session.id), "group_id": str(group_id)},
            exclude_user_ids=[actor.id],
            webhook_description=(
                f"Abriu uma nova votação de game no servidor. "
                f"Fase 1 de {total_stages} — aprove até **{calculate_max_selections_for_stage(n)}** escolhas.\n\n"
                f"Fase fecha em **{per_stage_hours}h** ou quando todos votarem."
            ),
            webhook_fields=fields,
            webhook_thumbnail_url=cand_games[0].cover_url if cand_games else None,
        )
        return await self._to_response(session, actor)

    async def list_for_group(
        self, group_id: uuid.UUID, actor: User, limit: int = 50, offset: int = 0
    ) -> list[VoteSessionResponse]:
        await self._require_member(group_id, actor)
        sessions = await self.votes.list_for_group(group_id, limit, offset)
        return [await self._to_response(s, actor) for s in sessions]

    async def get(
        self, group_id: uuid.UUID, vote_id: uuid.UUID, actor: User
    ) -> VoteSessionResponse:
        await self._require_member(group_id, actor)
        session = await self.votes.get(vote_id)
        if session is None or session.group_id != group_id:
            raise _not_found("Vote not found")
        return await self._to_response(session, actor)

    async def audit(
        self, group_id: uuid.UUID, vote_id: uuid.UUID, actor: User
    ) -> VoteAuditResponse:
        await self._require_member(group_id, actor)
        session = await self.votes.get(vote_id)
        if session is None or session.group_id != group_id:
            raise _not_found("Vote not found")

        # resposta base ja traz stages/tallies/etc
        session_resp = await self._to_response(session, actor)

        # todos os ballots de todos os stages
        ballots = await self.votes.list_ballots(vote_id)
        stages = await self.votes.list_stages(vote_id)
        stage_num_by_id = {s.id: s.stage_number for s in stages}

        # users dos ballots + criador + membros do grupo (pra non_voters)
        from sqlalchemy import select as _sel

        from app.models.user import User as UserModel
        from app.repositories.group_repo import GroupRepository

        user_ids = {b.user_id for b in ballots}
        if session.created_by:
            user_ids.add(session.created_by)

        members = await GroupRepository(self.votes.db).list_members(group_id)
        member_user_ids = [m.user_id for m in members]
        user_ids.update(member_user_ids)

        users_by_id: dict[uuid.UUID, UserModel] = {}
        if user_ids:
            rows = await self.votes.db.execute(
                _sel(UserModel).where(UserModel.id.in_(list(user_ids)))
            )
            for u in rows.scalars().all():
                users_by_id[u.id] = u

        def _creator(uid: uuid.UUID | None) -> VoteAuditCreator:
            if uid is None or uid not in users_by_id:
                return VoteAuditCreator(id=uid, discord_id=None, display_name=None, avatar_url=None)
            u = users_by_id[uid]
            return VoteAuditCreator(
                id=u.id,
                discord_id=u.discord_id,
                display_name=u.discord_display_name or u.discord_username,
                avatar_url=u.discord_avatar,
            )

        # candidatos: pega nome/cover
        all_cand_ids: set[uuid.UUID] = set()
        for s in stages:
            all_cand_ids.update(s.candidate_game_ids)
        all_cand_ids.update(session.candidate_game_ids)
        if session.winner_game_id:
            all_cand_ids.add(session.winner_game_id)

        games_list: list[VoteAuditGame] = []
        if all_cand_ids:
            from app.models.game import Game as GameModel

            grows = await self.votes.db.execute(
                _sel(GameModel).where(GameModel.id.in_(list(all_cand_ids)))
            )
            for g in grows.scalars().all():
                games_list.append(VoteAuditGame(id=g.id, name=g.name, cover_url=g.cover_url))

        voters: list[VoteAuditVoter] = []
        voted_user_ids: set[uuid.UUID] = set()
        for b in sorted(ballots, key=lambda x: x.submitted_at, reverse=True):
            u = users_by_id.get(b.user_id)
            voted_user_ids.add(b.user_id)
            voters.append(
                VoteAuditVoter(
                    user_id=b.user_id,
                    discord_id=u.discord_id if u else None,
                    display_name=(u.discord_display_name or u.discord_username)
                    if u
                    else "(removido)",
                    avatar_url=u.discord_avatar if u else None,
                    approvals=list(b.approvals),
                    stage_id=b.stage_id,
                    stage_number=stage_num_by_id.get(b.stage_id) if b.stage_id else None,
                    submitted_at=b.submitted_at,
                )
            )

        non_voters: list[VoteAuditCreator] = []
        for uid in member_user_ids:
            if uid in voted_user_ids:
                continue
            non_voters.append(_creator(uid))

        return VoteAuditResponse(
            session=session_resp,
            creator=_creator(session.created_by),
            games=games_list,
            voters=voters,
            non_voters=non_voters,
        )

    async def submit_ballot(
        self, vote_id: uuid.UUID, approvals: list[uuid.UUID], actor: User
    ) -> VoteSessionResponse:
        session = await self.votes.get(vote_id)
        if session is None:
            raise _not_found("Vote not found")
        if session.status != VoteStatus.OPEN:
            raise _bad("Votacao nao esta aberta")
        if (await self.groups.get_membership(session.group_id, actor.id)) is None:
            raise _forbid("Not a member of this group")

        stage = await self._current_stage(session)
        if stage is None or stage.status != VoteStatus.OPEN:
            raise _bad("Nenhum stage aberto")
        if len(approvals) > stage.max_selections:
            raise _bad(f"Maximo {stage.max_selections} selecoes")
        for cid in approvals:
            if cid not in stage.candidate_game_ids:
                raise _bad(f"{cid} nao e um candidato valido")

        await self.votes.upsert_ballot(vote_id, actor.id, list(approvals), stage_id=stage.id)
        await track_event(
            self.votes.db,
            EVENT_VOTE_CAST,
            user_id=actor.id,
            group_id=session.group_id,
            payload={
                "vote_id": str(vote_id),
                "stage_number": stage.stage_number,
                "approvals": len(approvals),
            },
        )

        # realtime: notifica que o tally mudou
        from app.services.realtime import get_broker

        get_broker().publish(session.group_id, kind="game_vote.ballot_cast")

        # Auto-close stage: todos os eleitores votaram
        ballots_count = await self.votes.count_ballots(vote_id, stage_id=stage.id)
        if ballots_count >= session.eligible_voter_count:
            await self._close_stage(session, stage)
        return await self._to_response(session, actor)

    async def _current_stage(self, session: VoteSession) -> VoteStage | None:
        if session.current_stage_number is None:
            return None
        return await self.votes.get_stage(session.id, session.current_stage_number)

    async def delete(self, group_id: uuid.UUID, vote_id: uuid.UUID, actor: User) -> None:
        await self._require_admin_or_mod(group_id, actor)
        session = await self.votes.get(vote_id)
        if session is None or session.group_id != group_id:
            raise _not_found("Vote not found")
        # cascata cobre stages e ballots; FKs em groups viram NULL
        await self.votes.db.delete(session)
        await self.votes.db.commit()
        from app.services.realtime import get_broker

        get_broker().publish(group_id, kind="current_game.changed")

    async def close(
        self, group_id: uuid.UUID, vote_id: uuid.UUID, actor: User
    ) -> VoteSessionResponse:
        await self._require_admin_or_mod(group_id, actor)
        session = await self.votes.get(vote_id)
        if session is None or session.group_id != group_id:
            raise _not_found("Vote not found")
        if session.status != VoteStatus.OPEN:
            raise _bad("Votacao nao esta aberta")
        stage = await self._current_stage(session)
        if stage is None:
            raise _bad("Nenhum stage ativo")
        # force-close: marca como final pra encerrar a sessao agora
        await self._close_stage(session, stage, force_final=True)
        return await self._to_response(session)

    async def _close_stage(
        self, session: VoteSession, stage: VoteStage, force_final: bool = False
    ) -> None:
        ballots = await self.votes.list_ballots(session.id, stage_id=stage.id)
        total_stages = session.total_stages or 1
        is_final = (
            force_final or stage.stage_number >= total_stages or len(stage.candidate_game_ids) <= 2
        )
        viability_map: dict[uuid.UUID, float] = {}
        if is_final:
            viability_map = await self._viability_map(
                list(stage.candidate_game_ids), session.group_id
            )
        result = advance_stage(
            candidate_ids=list(stage.candidate_game_ids),
            ballots=[list(b.approvals) for b in ballots],
            eligible_count=session.eligible_voter_count,
            viability_by_id=viability_map,
            seed=session.tiebreak_seed,
            is_final=is_final,
        )
        now = datetime.now(UTC)
        stage.status = VoteStatus.CLOSED
        stage.closed_at = now

        # caso final OU early consensus: encerra sessao
        if result.winner_id is not None:
            session.status = VoteStatus.CLOSED
            session.closed_at = now
            session.winner_game_id = result.winner_id
            await self.votes.save()
            await track_event(
                self.votes.db,
                EVENT_VOTE_COMPLETED,
                group_id=session.group_id,
                payload={
                    "vote_id": str(session.id),
                    "winner_game_id": str(result.winner_id),
                    "total_stages": session.total_stages,
                    "final_stage": stage.stage_number,
                    "early_consensus": result.early_consensus,
                },
            )
            await self._post_winner_effects(session, stage, ballots, result.winner_id)
            return

        # avanca pro proximo stage
        advance_ids = result.advance_ids or []
        if not advance_ids or len(advance_ids) < 2:
            # defensivo: sem avancados, encerra sem vencedor
            session.status = VoteStatus.CLOSED
            session.closed_at = now
            await self.votes.save()
            await track_event(
                self.votes.db,
                EVENT_VOTE_COMPLETED,
                group_id=session.group_id,
                payload={
                    "vote_id": str(session.id),
                    "winner_game_id": None,
                    "total_stages": session.total_stages,
                    "final_stage": stage.stage_number,
                },
            )
            return
        next_number = stage.stage_number + 1
        # duracao restante / stages restantes
        remaining_stages = max(1, total_stages - stage.stage_number)
        remaining = (session.closes_at - now).total_seconds() if session.closes_at else 3600
        per_stage_seconds = max(3600, int(remaining / remaining_stages))
        next_stage = VoteStage(
            vote_session_id=session.id,
            stage_number=next_number,
            candidate_game_ids=list(advance_ids),
            max_selections=calculate_max_selections_for_stage(len(advance_ids)),
            status=VoteStatus.OPEN,
            opens_at=now,
            closes_at=now + timedelta(seconds=per_stage_seconds),
        )
        await self.votes.add_stage(next_stage)
        session.current_stage_number = next_number
        await self.votes.save()
        # notifica avanco de fase
        await notify_group(
            self.votes.db,
            group_id=session.group_id,
            event="game_vote.stage_advanced",
            title=f"Fase {next_number} de {total_stages}",
            body=f"{len(advance_ids)} jogos seguem pra proxima fase de {session.title}",
            link=f"/groups/{session.group_id}/votes",
            data={
                "vote_id": str(session.id),
                "group_id": str(session.group_id),
                "stage_number": next_number,
            },
            webhook_description=(
                f"Fase {stage.stage_number} encerrada. **{len(advance_ids)}** jogos avancam "
                f"pra fase **{next_number}** de **{total_stages}**."
            ),
        )

    async def _post_winner_effects(
        self,
        session: VoteSession,
        stage: VoteStage,
        ballots,
        winner_id: uuid.UUID,
    ) -> None:
        # mesmo padrao do admin panel (routers/groups.set_current_game): mutar grp,
        # commit, refresh. antes tinha guard de source=manual que travava votes, removido.
        import logging as _lg

        _vlog = _lg.getLogger(__name__)
        db = self.votes.db
        grp = await self.groups.get_by_id(session.group_id)
        if grp is not None:
            _vlog.info(
                "vote winner applying to group current_game group=%s old_source=%s old_game=%s new=%s",
                session.group_id,
                grp.current_game_source,
                grp.current_game_id,
                winner_id,
            )
            grp.current_game_id = winner_id
            grp.current_game_source = "vote"
            grp.current_game_set_at = datetime.now(UTC)
            grp.current_game_set_by = None
            grp.current_game_vote_id = session.id
            db.add(grp)
            await db.commit()
            await db.refresh(grp)
            _vlog.info(
                "vote winner persisted group=%s source=%s game=%s",
                session.group_id,
                grp.current_game_source,
                grp.current_game_id,
            )
            from app.services.realtime import get_broker

            get_broker().publish(session.group_id, kind="current_game.changed")

        winner = await self.games.get_by_id(winner_id)
        winner_name = winner.name if winner else None
        winner_cover = winner.cover_url if winner else None

        tally_map: dict[uuid.UUID, int] = {cid: 0 for cid in stage.candidate_game_ids}
        for b in ballots:
            for a in b.approvals or []:
                tally_map[a] = tally_map.get(a, 0) + 1
        ranked = sorted(tally_map.items(), key=lambda x: -x[1])[:5]
        fields = []
        for rank, (cid, cnt) in enumerate(ranked, 1):
            g = await self.games.get_by_id(cid)
            if g is None:
                continue
            medal = "🥇" if rank == 1 else "🥈" if rank == 2 else "🥉" if rank == 3 else f"{rank}º"
            fields.append(
                {
                    "name": f"{medal} {g.name}",
                    "value": f"{cnt} voto{'s' if cnt != 1 else ''}",
                    "inline": True,
                }
            )
        await notify_group(
            self.votes.db,
            group_id=session.group_id,
            event="game_vote.closed",
            title=f"Votação encerrada: {winner_name}" if winner_name else "Votação encerrada",
            body=f"Resultado de {session.title}",
            link=f"/groups/{session.group_id}/votes",
            data={
                "vote_id": str(session.id),
                "group_id": str(session.group_id),
                "winner_id": str(winner_id),
            },
            webhook_description=(
                f"**{winner_name}** venceu a votação **{session.title}** com "
                f"{len(ballots)}/{session.eligible_voter_count} participantes na fase final."
                if winner_name
                else f"Votação **{session.title}** encerrada sem vencedor."
            ),
            webhook_fields=fields or None,
            webhook_image_url=winner_cover,
        )

    async def _viability_map(
        self, candidate_ids: list[uuid.UUID], group_id: uuid.UUID
    ) -> dict[uuid.UUID, float]:
        member_count = max(await self.groups.count_members(group_id), 1)
        tiers = await self.games.member_tiers(group_id)
        games = await self.games.get_by_ids(candidate_ids)
        games_by_id = {g.id: g for g in games}
        all_counts = await self.games.count_interests_batch(candidate_ids)
        out: dict[uuid.UUID, float] = {}
        for cid in candidate_ids:
            game = games_by_id.get(cid)
            if game is None:
                continue
            counts = all_counts.get(cid, {})
            score = calculate_viability(
                ViabilityInput(
                    is_free=game.is_free,
                    price_current=game.price_current,
                    min_hardware_tier=HardwareTier(game.min_hardware_tier),
                    member_tiers=tuple(tiers),
                    want_count=counts.get(InterestSignal.WANT, 0),
                    ok_count=counts.get(InterestSignal.OK, 0),
                    pass_count=counts.get(InterestSignal.PASS, 0),
                    member_count=member_count,
                )
            )
            out[cid] = score.viability_score
        return out

    async def _to_response(self, s: VoteSession, actor: User | None = None) -> VoteSessionResponse:
        # Se multi-stage: usa stage atual pra candidatos/tallies/your.
        stage = await self._current_stage(s) if s.current_stage_number else None
        if stage is not None:
            active_candidates = list(stage.candidate_game_ids)
            active_max = stage.max_selections
            ballots = await self.votes.list_ballots(s.id, stage_id=stage.id)
            stage_closes = stage.closes_at
        else:
            active_candidates = list(s.candidate_game_ids)
            active_max = s.max_selections
            ballots = await self.votes.list_ballots(s.id)
            stage_closes = s.closes_at
        tallies: dict[uuid.UUID, int] = {cid: 0 for cid in active_candidates}
        your: list[uuid.UUID] = []
        for b in ballots:
            for aid in b.approvals:
                if aid in tallies:
                    tallies[aid] += 1
            if actor is not None and b.user_id == actor.id:
                your = list(b.approvals)
        return VoteSessionResponse(
            id=s.id,
            group_id=s.group_id,
            created_by=s.created_by,
            title=s.title,
            description=s.description,
            status=VoteStatus(s.status),
            candidate_game_ids=active_candidates,
            eligible_voter_count=s.eligible_voter_count,
            quorum_count=s.quorum_count,
            max_selections=active_max,
            opens_at=s.opens_at,
            closes_at=stage_closes if s.status == VoteStatus.OPEN else s.closes_at,
            closed_at=s.closed_at,
            winner_game_id=s.winner_game_id,
            created_at=s.created_at,
            ballots_count=len(ballots),
            tallies=tallies,
            your_approvals=your,
            current_stage_number=s.current_stage_number,
            total_stages=s.total_stages,
            stages=[
                VoteStageResponse.model_validate(st) for st in (await self.votes.list_stages(s.id))
            ]
            if s.current_stage_number
            else [],
        )
