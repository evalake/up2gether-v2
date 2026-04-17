from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.jobs.price_check_cron import check_game_prices
from app.jobs.theme_cycle_cron import auto_open_theme_cycles
from app.routers import (
    admin,
    auth,
    events,
    games,
    google,
    groups,
    health,
    notifications,
    public,
    sessions,
    steam,
    themes,
    users,
    votes,
)
from app.services.discord_presence import PresenceBot, set_bot
from app.services.leader import LeaderElection
from app.services.realtime import get_broker


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    settings = get_settings()

    # SSE broker via Postgres LISTEN/NOTIFY (funciona cross-machine)
    broker = get_broker()
    await broker.start_listening()

    # leader election: so 1 machine roda bot + scheduler
    scheduler = AsyncIOScheduler(timezone="UTC")
    scheduler.add_job(auto_open_theme_cycles, CronTrigger(hour=9, minute=0))
    scheduler.add_job(check_game_prices, CronTrigger(hour="*/6", minute=30))
    bot = PresenceBot(settings.discord_bot_token)
    leader = LeaderElection()

    async def on_promote():
        scheduler.start()
        set_bot(bot)
        await bot.start()

    async def on_demote():
        scheduler.shutdown(wait=False)
        await bot.stop()
        set_bot(None)

    leader.on_promote(on_promote)
    leader.on_demote(on_demote)
    await leader.start()

    try:
        yield
    finally:
        await leader.stop()
        await broker.stop()
        if leader.is_leader:
            scheduler.shutdown(wait=False)
            await bot.stop()
            set_bot(None)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        resp = await call_next(request)
        # HSTS so faz sentido sobre HTTPS. Fly serve via https, entao sempre.
        resp.headers.setdefault(
            "Strict-Transport-Security",
            "max-age=63072000; includeSubDomains; preload",
        )
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        # API nao renderiza HTML, mas por garantia nega frame
        resp.headers.setdefault("X-Frame-Options", "DENY")
        return resp


def create_app() -> FastAPI:
    settings = get_settings()
    # em prod fecha swagger/redoc/openapi (reduz surface area pro scanner)
    docs_kwargs: dict = (
        {"docs_url": None, "redoc_url": None, "openapi_url": None} if settings.is_prod else {}
    )
    app = FastAPI(title="up2gether", version="2.0.0", lifespan=lifespan, **docs_kwargs)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health.router, prefix="/api")
    app.include_router(auth.router, prefix="/api")
    app.include_router(groups.router, prefix="/api")
    app.include_router(games.router, prefix="/api")
    app.include_router(votes.router, prefix="/api")
    app.include_router(themes.router, prefix="/api")
    app.include_router(sessions.router, prefix="/api")
    app.include_router(users.router, prefix="/api")
    app.include_router(steam.router, prefix="/api")
    app.include_router(public.router, prefix="/api")
    app.include_router(notifications.router, prefix="/api")
    app.include_router(google.router, prefix="/api")
    app.include_router(events.router, prefix="/api")
    app.include_router(admin.router, prefix="/api")
    return app


app = create_app()
