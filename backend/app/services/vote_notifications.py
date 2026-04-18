"""Helpers de notificacao pra vote engine.

Extraido do vote_service pra deixar a logica de orquestracao mais
legivel. Aqui mora todo monte de strings + webhook fields.
"""

from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game import Game
from app.models.vote import VoteBallot, VoteSession, VoteStage
from app.repositories.game_repo import GameRepository
from app.services.notifications import notify_group


async def notify_vote_opened(
    db: AsyncSession,
    *,
    session: VoteSession,
    candidate_ids: list[uuid.UUID],
    duration_hours: int,
    per_stage_hours: int,
    max_selections: int,
    total_stages: int,
    actor_id: uuid.UUID,
) -> None:
    cand_games = (
        (await db.execute(select(Game).where(Game.id.in_(candidate_ids[:10])))).scalars().all()
    )
    fields = [
        {"name": g.name, "value": f"{g.player_min}+ jogadores", "inline": True}
        for g in cand_games[:9]
    ]
    if len(candidate_ids) > 9:
        fields.append(
            {
                "name": "+ " + str(len(candidate_ids) - 9),
                "value": "outros candidatos",
                "inline": True,
            }
        )
    await notify_group(
        db,
        group_id=session.group_id,
        event="game_vote.opened",
        title=f"Nova votação: {session.title}",
        body=f"{len(candidate_ids)} candidatos, fecha em {duration_hours}h",
        link=f"/groups/{session.group_id}/votes",
        data={"vote_id": str(session.id), "group_id": str(session.group_id)},
        exclude_user_ids=[actor_id],
        webhook_description=(
            f"Abriu uma nova votação de game no servidor. "
            f"Fase 1 de {total_stages} — aprove até **{max_selections}** escolhas.\n\n"
            f"Fase fecha em **{per_stage_hours}h** ou quando todos votarem."
        ),
        webhook_fields=fields,
        webhook_thumbnail_url=cand_games[0].cover_url if cand_games else None,
    )


async def notify_stage_advanced(
    db: AsyncSession,
    *,
    session: VoteSession,
    stage: VoteStage,
    next_number: int,
    total_stages: int,
    advance_count: int,
) -> None:
    await notify_group(
        db,
        group_id=session.group_id,
        event="game_vote.stage_advanced",
        title=f"Fase {next_number} de {total_stages}",
        body=f"{advance_count} jogos seguem pra proxima fase de {session.title}",
        link=f"/groups/{session.group_id}/votes",
        data={
            "vote_id": str(session.id),
            "group_id": str(session.group_id),
            "stage_number": next_number,
        },
        webhook_description=(
            f"Fase {stage.stage_number} encerrada. **{advance_count}** jogos avancam "
            f"pra fase **{next_number}** de **{total_stages}**."
        ),
    )


async def notify_vote_closed(
    db: AsyncSession,
    games: GameRepository,
    *,
    session: VoteSession,
    stage: VoteStage,
    ballots: list[VoteBallot],
    winner_id: uuid.UUID,
) -> None:
    winner = await games.get_by_id(winner_id)
    winner_name = winner.name if winner else None
    winner_cover = winner.cover_url if winner else None

    tally_map: dict[uuid.UUID, int] = {cid: 0 for cid in stage.candidate_game_ids}
    for b in ballots:
        for a in b.approvals or []:
            tally_map[a] = tally_map.get(a, 0) + 1
    ranked = sorted(tally_map.items(), key=lambda x: -x[1])[:5]
    fields = []
    for rank, (cid, cnt) in enumerate(ranked, 1):
        g = await games.get_by_id(cid)
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
        db,
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
