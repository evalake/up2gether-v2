# up2gether

Plataforma pra coordenar sessoes de jogo em comunidades Discord. Resolve o eterno "o que a gente vai jogar hoje?" agregando quem tem qual jogo, quem quer jogar o que, e votacao pra decidir de forma (quase) democratica.

Live: https://up2gether.com.br

## Features

- Login via Discord
- Sync com Steam (biblioteca, precos, compatibilidade de hardware)
- Gestao de grupos, jogos e sessoes agendadas
- Votacao multi-stage (30 -> 15 -> 7 -> 3 -> 2) com desempate deterministico por viabilidade
- Temas mensais com ciclo de sugestao + votacao
- Notificacoes realtime in-app + webhook Discord do grupo

## Stack

**Backend:** Python 3.12, FastAPI async, SQLAlchemy 2.0, Postgres, Alembic, Pydantic v2, pytest + testcontainers
**Frontend:** Vite, React 19, TypeScript, Tailwind v4, TanStack Query, Zustand, React Router 7
**Infra:** Fly.io (backend) + Vercel (frontend) + Neon (Postgres)

## Rodando local

Requisitos: Python 3.12+, uv, Node 20+, pnpm, Docker Desktop (pros testes com testcontainers).

```bash
# backend
cd backend
uv sync
cp .env.example .env   # preenche JWT_SECRET, DATABASE_URL, Discord, Steam
uv run alembic upgrade head
uv run uvicorn app.main:app --reload

# frontend (outro terminal)
cd frontend
pnpm install
pnpm dev
```

## Testes

```bash
cd backend && uv run pytest
cd frontend && pnpm test
```

## Deploy

Ver [DEPLOY.md](DEPLOY.md).
