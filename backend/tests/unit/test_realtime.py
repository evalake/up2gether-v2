"""Unit tests do broker realtime. Sem DB, sem HTTP."""

from __future__ import annotations

import asyncio
import uuid

import pytest

from app.services.realtime import Broker

pytestmark = pytest.mark.asyncio


async def test_publish_delivers_to_subscriber():
    b = Broker()
    g = uuid.uuid4()
    q, _ = await b.subscribe([g])
    b.publish(g, kind="game_vote.ballot_cast")
    msg = await asyncio.wait_for(q.get(), timeout=0.5)
    assert msg["kind"] == "game_vote.ballot_cast"
    assert msg["group_id"] == str(g)


async def test_publish_delivers_to_multiple_subscribers():
    b = Broker()
    g = uuid.uuid4()
    q1, _ = await b.subscribe([g])
    q2, _ = await b.subscribe([g])
    b.publish(g, kind="game_vote.ballot_cast")
    m1 = await asyncio.wait_for(q1.get(), timeout=0.5)
    m2 = await asyncio.wait_for(q2.get(), timeout=0.5)
    assert m1["kind"] == m2["kind"] == "game_vote.ballot_cast"


async def test_publish_other_group_not_delivered():
    b = Broker()
    g1, g2 = uuid.uuid4(), uuid.uuid4()
    q, _ = await b.subscribe([g1])
    b.publish(g2, kind="x")
    with pytest.raises(TimeoutError):
        await asyncio.wait_for(q.get(), timeout=0.1)


async def test_unsubscribe_stops_delivery():
    b = Broker()
    g = uuid.uuid4()
    q, gids = await b.subscribe([g])
    await b.unsubscribe(q, gids)
    b.publish(g, kind="x")
    with pytest.raises(TimeoutError):
        await asyncio.wait_for(q.get(), timeout=0.1)


async def test_full_queue_drops_silently():
    b = Broker()
    g = uuid.uuid4()
    q, _ = await b.subscribe([g])
    # enche a fila (maxsize=100)
    for _ in range(150):
        b.publish(g, kind="spam")
    # nao explode
    assert q.qsize() == 100
