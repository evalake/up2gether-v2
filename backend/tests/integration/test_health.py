async def test_health_returns_ok(client):
    res = await client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


async def test_health_returns_503_when_db_unreachable(app_client):
    # app_client nao tem override de get_db, entao tenta conectar no DATABASE_URL
    # placeholder e falha. confirma que o LB recebe 503 e tira a maquina fora.
    res = await app_client.get("/api/health")
    assert res.status_code == 503
    assert res.json()["detail"] == "db unreachable"


async def test_openapi_docs_available(app_client):
    res = await app_client.get("/openapi.json")
    assert res.status_code == 200
    assert res.json()["info"]["title"] == "up2gether"
