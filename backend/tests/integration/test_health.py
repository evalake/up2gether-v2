async def test_health_returns_ok(app_client):
    res = await app_client.get("/api/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


async def test_openapi_docs_available(app_client):
    res = await app_client.get("/openapi.json")
    assert res.status_code == 200
    assert res.json()["info"]["title"] == "up2gether"
