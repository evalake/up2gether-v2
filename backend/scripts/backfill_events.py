"""backfill de events pra dados historicos.

roda uma vez por ambiente depois que o event tracking foi instrumentado,
sintetiza events pra coisas que ja aconteceram. idempotente: usa
payload.backfill_source_id pra detectar reexecucao e pular.

uso:
    # dry-run (conta o que seria inserido, nao toca o banco)
    python -m scripts.backfill_events --dry-run
    # aplica
    python -m scripts.backfill_events

eventos sintetizados:
  - member_activated: 1 por user (created_at)
  - group_created:   1 por group (created_at, user=owner)
  - group_joined:    1 por membership exceto owner (joined_at)
  - session_created: 1 por play_session (created_at)
  - session_completed: 1 por play_session com status=completed (updated_at)
  - vote_created:    1 por vote_session (created_at)
  - vote_cast:       1 por vote_ballot (submitted_at)
  - vote_completed:  1 por vote_session com closed_at (closed_at)
"""

from __future__ import annotations

import argparse
import asyncio

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.event import Event
from app.models.group import Group, GroupMembership
from app.models.session import PlaySession
from app.models.user import User
from app.models.vote import VoteBallot, VoteSession
from app.services.events import (
    EVENT_GROUP_CREATED,
    EVENT_GROUP_JOINED,
    EVENT_MEMBER_ACTIVATED,
    EVENT_SESSION_COMPLETED,
    EVENT_SESSION_CREATED,
    EVENT_VOTE_CAST,
    EVENT_VOTE_COMPLETED,
    EVENT_VOTE_CREATED,
)


async def _existing_source_ids(db, event_type: str) -> set[str]:
    # evita duplicar: pega todos os backfill_source_id ja registrados por tipo
    stmt = select(Event.payload["backfill_source_id"].astext).where(
        Event.event_type == event_type,
        Event.payload["backfill_source_id"].astext.is_not(None),
    )
    rows = (await db.execute(stmt)).scalars().all()
    return {r for r in rows if r}


async def _backfill(db, dry_run: bool) -> dict[str, int]:
    counts: dict[str, int] = {}

    # member_activated -- 1 por user
    seen = await _existing_source_ids(db, EVENT_MEMBER_ACTIVATED)
    users = (await db.execute(select(User))).scalars().all()
    n = 0
    for u in users:
        if str(u.id) in seen:
            continue
        if not dry_run:
            db.add(
                Event(
                    event_type=EVENT_MEMBER_ACTIVATED,
                    user_id=u.id,
                    occurred_at=u.created_at,
                    payload={
                        "backfill": True,
                        "backfill_source_id": str(u.id),
                        "discord_id": u.discord_id,
                        "source": "backfill",
                    },
                )
            )
        n += 1
    counts[EVENT_MEMBER_ACTIVATED] = n

    # group_created -- 1 por group, user=owner
    seen = await _existing_source_ids(db, EVENT_GROUP_CREATED)
    groups = (await db.execute(select(Group))).scalars().all()
    n = 0
    for g in groups:
        if str(g.id) in seen:
            continue
        if not dry_run:
            db.add(
                Event(
                    event_type=EVENT_GROUP_CREATED,
                    user_id=g.owner_user_id,
                    group_id=g.id,
                    occurred_at=g.created_at,
                    payload={"backfill": True, "backfill_source_id": str(g.id)},
                )
            )
        n += 1
    counts[EVENT_GROUP_CREATED] = n

    # group_joined -- 1 por membership, pula owner (ja contado em group_created)
    seen = await _existing_source_ids(db, EVENT_GROUP_JOINED)
    memberships = (await db.execute(select(GroupMembership))).scalars().all()
    owner_by_group = {g.id: g.owner_user_id for g in groups}
    n = 0
    for m in memberships:
        if str(m.id) in seen:
            continue
        if owner_by_group.get(m.group_id) == m.user_id:
            continue
        if not dry_run:
            db.add(
                Event(
                    event_type=EVENT_GROUP_JOINED,
                    user_id=m.user_id,
                    group_id=m.group_id,
                    occurred_at=m.joined_at,
                    payload={
                        "backfill": True,
                        "backfill_source_id": str(m.id),
                        "role": m.role,
                    },
                )
            )
        n += 1
    counts[EVENT_GROUP_JOINED] = n

    # session_created
    seen = await _existing_source_ids(db, EVENT_SESSION_CREATED)
    sessions = (await db.execute(select(PlaySession))).scalars().all()
    n = 0
    for s in sessions:
        if str(s.id) in seen:
            continue
        if not dry_run:
            db.add(
                Event(
                    event_type=EVENT_SESSION_CREATED,
                    user_id=s.created_by,
                    group_id=s.group_id,
                    occurred_at=s.created_at,
                    payload={
                        "backfill": True,
                        "backfill_source_id": str(s.id),
                        "game_id": str(s.game_id),
                    },
                )
            )
        n += 1
    counts[EVENT_SESSION_CREATED] = n

    # session_completed -- so status=completed, usa updated_at (proxy de completed_at)
    seen = await _existing_source_ids(db, EVENT_SESSION_COMPLETED)
    n = 0
    for s in sessions:
        if s.status != "completed":
            continue
        if str(s.id) in seen:
            continue
        if not dry_run:
            db.add(
                Event(
                    event_type=EVENT_SESSION_COMPLETED,
                    user_id=s.created_by,
                    group_id=s.group_id,
                    occurred_at=s.updated_at,
                    payload={
                        "backfill": True,
                        "backfill_source_id": str(s.id),
                        "game_id": str(s.game_id),
                    },
                )
            )
        n += 1
    counts[EVENT_SESSION_COMPLETED] = n

    # vote_created
    seen = await _existing_source_ids(db, EVENT_VOTE_CREATED)
    votes = (await db.execute(select(VoteSession))).scalars().all()
    n = 0
    for v in votes:
        if str(v.id) in seen:
            continue
        if not dry_run:
            db.add(
                Event(
                    event_type=EVENT_VOTE_CREATED,
                    user_id=v.created_by,
                    group_id=v.group_id,
                    occurred_at=v.created_at,
                    payload={"backfill": True, "backfill_source_id": str(v.id)},
                )
            )
        n += 1
    counts[EVENT_VOTE_CREATED] = n

    # vote_cast
    seen = await _existing_source_ids(db, EVENT_VOTE_CAST)
    ballots = (await db.execute(select(VoteBallot))).scalars().all()
    group_by_vote = {v.id: v.group_id for v in votes}
    n = 0
    for b in ballots:
        if str(b.id) in seen:
            continue
        if not dry_run:
            db.add(
                Event(
                    event_type=EVENT_VOTE_CAST,
                    user_id=b.user_id,
                    group_id=group_by_vote.get(b.vote_session_id),
                    occurred_at=b.submitted_at,
                    payload={
                        "backfill": True,
                        "backfill_source_id": str(b.id),
                        "vote_session_id": str(b.vote_session_id),
                    },
                )
            )
        n += 1
    counts[EVENT_VOTE_CAST] = n

    # vote_completed -- so votes com closed_at
    seen = await _existing_source_ids(db, EVENT_VOTE_COMPLETED)
    n = 0
    for v in votes:
        if v.closed_at is None:
            continue
        if str(v.id) in seen:
            continue
        if not dry_run:
            db.add(
                Event(
                    event_type=EVENT_VOTE_COMPLETED,
                    user_id=v.created_by,
                    group_id=v.group_id,
                    occurred_at=v.closed_at,
                    payload={
                        "backfill": True,
                        "backfill_source_id": str(v.id),
                        "winner_game_id": str(v.winner_game_id) if v.winner_game_id else None,
                    },
                )
            )
        n += 1
    counts[EVENT_VOTE_COMPLETED] = n

    return counts


async def run(dry_run: bool) -> None:
    async with SessionLocal() as db:
        counts = await _backfill(db, dry_run)
        if dry_run:
            print("[DRY-RUN] eventos que seriam inseridos:")
        else:
            await db.commit()
            print("[APPLIED] eventos inseridos:")
        total = 0
        for kind, n in counts.items():
            print(f"  {kind:22s} {n:>6d}")
            total += n
        print(f"  {'TOTAL':22s} {total:>6d}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="so conta, nao insere")
    args = parser.parse_args()
    asyncio.run(run(args.dry_run))
