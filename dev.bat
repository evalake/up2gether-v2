@echo off
REM sobe tudo: postgres, backend (uvicorn), frontend (vite)
setlocal
set ROOT=%~dp0

echo [up2gether] subindo postgres...
pushd "%ROOT%"
docker compose up -d db
if errorlevel 1 (
  echo falhou subir o db, docker ta rodando?
  popd & exit /b 1
)
popd

echo [up2gether] aguardando db ficar healthy...
:waitdb
for /f %%i in ('docker inspect -f "{{.State.Health.Status}}" up2gether-db 2^>nul') do set DBSTATUS=%%i
if not "%DBSTATUS%"=="healthy" (
  ping -n 2 127.0.0.1 >nul
  goto waitdb
)
echo [up2gether] db ok

echo [up2gether] rodando migrations...
pushd "%ROOT%backend"
call uv run alembic upgrade head
if errorlevel 1 (
  echo migration falhou
  popd & exit /b 1
)
popd

echo [up2gether] subindo backend (nova janela)...
start "up2gether-backend" cmd /k "cd /d %ROOT%backend && uv run uvicorn app.main:app --reload"

echo [up2gether] subindo frontend (nova janela)...
start "up2gether-frontend" cmd /k "cd /d %ROOT%frontend && pnpm dev"

echo.
echo [up2gether] tudo no ar:
echo   api:      http://localhost:8000/api/health
echo   docs:     http://localhost:8000/docs
echo   frontend: http://localhost:5173
echo.
echo pra parar: fecha as duas janelas + docker compose down
endlocal
