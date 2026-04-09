from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.logging import configure_logging
from app.jobs.theme_cycle_cron import auto_open_theme_cycles
from app.routers import (
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


@asynccontextmanager
async def lifespan(_: FastAPI):
    configure_logging()
    scheduler = AsyncIOScheduler(timezone="UTC")
    # roda todo dia 9h UTC; abre ciclo de tema se faltam <=5 dias pro fim do mes
    scheduler.add_job(auto_open_theme_cycles, CronTrigger(hour=9, minute=0))
    scheduler.start()
    try:
        yield
    finally:
        scheduler.shutdown(wait=False)


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="up2gether", version="2.0.0", lifespan=lifespan)
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
    return app


app = create_app()
