# deploy up2gether

## neon (postgres)
1. cria projeto em neon.tech, regiao aws-sa-east-1 (sao paulo)
2. copia a connection string pooled, troca `postgres://` por `postgresql+asyncpg://`
3. guarda como `DATABASE_URL`

## backend (fly.io)
```bash
cd backend
fly launch --no-deploy --copy-config    # usa fly.toml ja existente
fly secrets set \
  JWT_SECRET="..." \
  DATABASE_URL="postgresql+asyncpg://..." \
  CORS_ORIGINS='["https://up2gether.vercel.app"]' \
  DISCORD_CLIENT_ID="..." \
  DISCORD_CLIENT_SECRET="..." \
  DISCORD_REDIRECT_URI="https://up2gether.vercel.app/auth/discord/callback" \
  STEAM_API_KEY="..."
fly deploy
```

o CMD do Dockerfile roda `alembic upgrade head` antes do uvicorn, entao a primeira subida ja cria o schema no Neon.

## frontend (vercel)
- import do repo no dashboard, root = `frontend/`
- build command / install / output ja vem do `vercel.json`
- env vars:
  - `VITE_API_URL=https://up2gether-api.fly.dev/api`
  - `VITE_DISCORD_CLIENT_ID=...`
  - `VITE_DISCORD_REDIRECT_URI=https://up2gether.vercel.app/auth/discord/callback`

## pos-deploy
- whitelist do redirect uri novo no discord dev portal
- smoke test: login, criar grupo, criar game, votar, agendar sessao
