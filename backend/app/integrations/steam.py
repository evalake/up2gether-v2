"""Cliente Steam Store com Protocol pra ser injetavel/mockavel nos testes."""

from __future__ import annotations

import contextlib
import re
from typing import Protocol

import httpx
from fastapi import HTTPException, status


def _strip_html(s: str) -> str:
    return re.sub(r"<[^>]+>", " ", s or "")


# patterns: "1-4 players", "1 to 4 players", "up to 4 players", "4-player", "single player only"
_PLAYER_PATTERNS = [
    re.compile(r"(\d+)\s*[-to]+\s*(\d+)\s*player", re.I),
    re.compile(r"up\s*to\s*(\d+)\s*player", re.I),
    re.compile(r"(\d+)\s*player\s*(?:co-?op|multiplayer|online|local)", re.I),
    re.compile(r"max(?:imum)?\s*of\s*(\d+)\s*player", re.I),
]


# classificacao gigante de GPUs pra tier do jogo. ideia: a gpu citada no
# requisito recommended/minimum indica o peso do jogo. se o jogo pede uma gpu
# topo, e high. se pede uma budget/igpu, e low. defaults pra mid nunca unknown.
# patterns rodam em ordem: high -> mid -> low.
_GPU_HIGH_PATTERNS = [
    # nvidia rtx serie atual e semi-atual
    r"rtx\s*[2345]0[5-9]\d",  # 2060+, 3060+, 4060+, 5060+
    r"rtx\s*[2345]07\d",
    r"rtx\s*[2345]08\d",
    r"rtx\s*[2345]09\d",
    r"rtx\s*20[6-9]\d",
    r"rtx\s*30[5-9]\d",
    r"rtx\s*40[5-9]\d",
    r"rtx\s*50[5-9]\d",
    r"rtx\s*2060",
    r"rtx\s*2070",
    r"rtx\s*2080",
    r"rtx\s*2090",
    r"rtx\s*3060",
    r"rtx\s*3070",
    r"rtx\s*3080",
    r"rtx\s*3090",
    r"rtx\s*4060",
    r"rtx\s*4070",
    r"rtx\s*4080",
    r"rtx\s*4090",
    r"rtx\s*5060",
    r"rtx\s*5070",
    r"rtx\s*5080",
    r"rtx\s*5090",
    r"rtx\s*titan",
    r"titan\s*(rtx|v|xp)",
    # nvidia gtx topo
    r"gtx\s*1070",
    r"gtx\s*1080",
    r"gtx\s*1660\s*ti",
    r"gtx\s*titan",
    # amd rx 6000/7000/9000
    r"rx\s*6[6-9]\d\d",
    r"rx\s*7[6-9]\d\d",
    r"rx\s*9[6-9]\d\d",
    r"rx\s*6700",
    r"rx\s*6800",
    r"rx\s*6900",
    r"rx\s*6950",
    r"rx\s*7700",
    r"rx\s*7800",
    r"rx\s*7900",
    r"radeon\s*vii",
    r"vega\s*(56|64)",
    r"rx\s*vega",
    # workstation/profissional
    r"quadro\s*(p|rtx|t)\d{3,4}",
    r"radeon\s*pro",
]
_GPU_MID_PATTERNS = [
    # nvidia gtx mid
    r"gtx\s*106\d",
    r"gtx\s*105\d",
    r"gtx\s*104\d",
    r"gtx\s*165\d",
    r"gtx\s*166\d",
    r"gtx\s*1650",
    r"gtx\s*1660",
    r"gtx\s*9[678]0",
    r"gtx\s*780",
    r"gtx\s*770",
    # rtx entry
    r"rtx\s*20[3-5]\d",
    r"rtx\s*30[3-5]\d",
    r"rtx\s*40[3-5]\d",
    r"rtx\s*2050",
    r"rtx\s*3050",
    r"rtx\s*4050",
    # amd rx mid
    r"rx\s*[45]\d\d",
    r"rx\s*5[56]0",
    r"rx\s*570",
    r"rx\s*580",
    r"rx\s*590",
    r"rx\s*460",
    r"rx\s*470",
    r"rx\s*480",
    r"rx\s*64\d\d",
    r"rx\s*65\d\d",
    r"rx\s*66\d\d",
    r"rx\s*6400",
    r"rx\s*6500",
    r"rx\s*6600",
    r"rx\s*7600",
    r"r9\s*(270|280|285|290|380|390|fury|nano)",
    r"hd\s*7[789]\d\d",
    r"hd\s*79\d\d",
    # apple silicon (mid range)
    r"m[12]\b",
    r"apple\s*m[12]",
]
_GPU_LOW_PATTERNS = [
    # nvidia low / legacy
    r"gtx\s*[2-7]\d\d",
    r"gtx\s*4\d\d",
    r"gtx\s*3\d\d",
    r"gt\s*[2-9]\d\d",
    r"gt\s*10[23]\d",
    r"geforce\s*[2-9]\d\d",
    # intel igpu
    r"intel\s*hd",
    r"intel\s*uhd",
    r"intel\s*iris",
    r"hd\s*graphics",
    r"uhd\s*graphics",
    r"iris\s*(xe|pro|plus)?",
    # amd legacy / igpu
    r"radeon\s*hd",
    r"hd\s*[456]\d\d\d",
    r"radeon\s*r[2-7]\b",
    r"vega\s*[3-9]\b",
    r"vega\s*1\d\b",
]


def _has_any(text: str, patterns: list[str]) -> bool:
    return any(re.search(p, text) for p in patterns)


def infer_hardware_tier(pc_requirements: dict | None) -> str:
    """Classifica o hardware tier do jogo a partir do bloco pc_requirements
    da Steam. Nunca retorna unknown. Default e 'mid'."""
    if not pc_requirements:
        return "mid"
    rec = pc_requirements.get("recommended") or ""
    mn = pc_requirements.get("minimum") or ""
    text_rec = _strip_html(rec).lower()
    text_min = _strip_html(mn).lower()
    text = (text_rec + " " + text_min).strip()
    if not text:
        return "mid"

    # ram: pega o maior numero de GB encontrado (recommended costuma estar la)
    ram_gb = 0
    for m in re.finditer(r"(\d{1,3})\s*gb\s*(?:of\s*)?(?:ram|memory|mem[óo]ria|system)", text):
        with contextlib.suppress(ValueError):
            ram_gb = max(ram_gb, int(m.group(1)))

    # vram: "4 gb vram", "8gb video"
    vram_gb = 0
    for m in re.finditer(r"(\d{1,2})\s*gb\s*(?:vram|video\s*memory|dedicated)", text):
        with contextlib.suppress(ValueError):
            vram_gb = max(vram_gb, int(m.group(1)))

    # storage grande tambem e indicativo (jogos AAA modernos)
    storage_gb = 0
    for m in re.finditer(
        r"(\d{1,3})\s*gb\s*(?:available\s*space|hard\s*drive|storage|hd|ssd|disk)", text
    ):
        with contextlib.suppress(ValueError):
            storage_gb = max(storage_gb, int(m.group(1)))

    has_high = _has_any(text, _GPU_HIGH_PATTERNS)
    has_mid = _has_any(text, _GPU_MID_PATTERNS)
    has_low = _has_any(text, _GPU_LOW_PATTERNS)

    # pontuacao: gpu pesa mais, ram e storage empurram pra cima
    score = 0
    if has_high:
        score += 3
    elif has_mid:
        score += 1
    elif has_low:
        score -= 2
    if vram_gb >= 8:
        score += 2
    elif vram_gb >= 4:
        score += 1
    elif vram_gb and vram_gb < 2:
        score -= 1
    if ram_gb >= 16:
        score += 2
    elif ram_gb >= 8:
        score += 1
    elif ram_gb and ram_gb <= 4:
        score -= 2
    if storage_gb >= 80:
        score += 1
    if storage_gb and storage_gb <= 5:
        score -= 1

    if score >= 3:
        return "high"
    if score <= -2:
        return "low"
    return "mid"


def infer_players(about_html: str | None, categories: list[str]) -> tuple[int | None, int | None]:
    """Tenta extrair (min, max) jogadores. Retorna (None, None) se nao conseguir."""
    text = _strip_html(about_html or "")
    cats_lower = [(c or "").lower() for c in categories]
    has_solo = any("single-player" in c for c in cats_lower)
    has_multi = any(
        ("multi-player" in c or "co-op" in c or "pvp" in c or "mmo" in c) for c in cats_lower
    )

    # tenta achar range "1-4" no texto
    for pat in _PLAYER_PATTERNS[:1]:
        m = pat.search(text)
        if m:
            return int(m.group(1)), int(m.group(2))
    # "up to N" / "N player co-op" / "max N"
    for pat in _PLAYER_PATTERNS[1:]:
        m = pat.search(text)
        if m:
            n = int(m.group(1))
            return (1, n)

    # sem texto: usa categorias
    if has_solo and not has_multi:
        return (1, 1)
    if has_multi:
        return (1, None)  # multiplayer mas sem limite conhecido
    return (None, None)


class SteamSearchResult(dict):
    """Item de resultado de busca: {appid, name, header_image, price}."""


class SteamGameDetails(dict):
    """Detalhes de um app: {appid, name, short_description, header_image, price, ...}."""


class OwnedGame(dict):
    """{appid, name, playtime_forever}"""


class SteamClient(Protocol):
    async def search(self, query: str) -> list[SteamSearchResult]: ...
    async def get_details(self, appid: int) -> SteamGameDetails: ...
    async def get_owned_games(self, steam_id: str) -> list[OwnedGame]: ...


class HttpSteamClient:
    """Implementacao real que bate na Steam Store API."""

    SEARCH_URL = "https://store.steampowered.com/api/storesearch"
    DETAILS_URL = "https://store.steampowered.com/api/appdetails"

    async def search(self, query: str) -> list[SteamSearchResult]:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(
                self.SEARCH_URL,
                params={"term": query, "l": "portuguese", "cc": "br"},
            )
        if res.status_code != 200:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Steam search failed")
        items = res.json().get("items", []) or []
        return [
            SteamSearchResult(
                appid=it.get("id"),
                name=it.get("name"),
                header_image=it.get("tiny_image"),
                price=(it.get("price") or {}).get("final"),
            )
            for it in items
        ]

    async def get_details(self, appid: int) -> SteamGameDetails:
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(
                self.DETAILS_URL,
                params={"appids": str(appid), "cc": "br", "l": "portuguese"},
            )
        if res.status_code != 200:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Steam details failed")
        payload = res.json() or {}
        entry = payload.get(str(appid)) or {}
        if not entry.get("success"):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Steam app not found")
        data = entry.get("data") or {}
        price_overview = data.get("price_overview") or {}
        cats = [c.get("description") for c in (data.get("categories") or [])]
        about = (data.get("about_the_game") or "") + " " + (data.get("detailed_description") or "")
        pmin, pmax = infer_players(about, cats)
        hw_tier = infer_hardware_tier(data.get("pc_requirements"))
        metacritic = (data.get("metacritic") or {}).get("score")
        devs = data.get("developers") or []
        return SteamGameDetails(
            appid=appid,
            name=data.get("name"),
            short_description=data.get("short_description"),
            header_image=data.get("header_image"),
            price=price_overview.get("final"),
            price_initial=price_overview.get("initial"),
            discount_percent=price_overview.get("discount_percent"),
            price_formatted=price_overview.get("final_formatted"),
            genres=[g.get("description") for g in (data.get("genres") or [])],
            categories=cats,
            platforms=data.get("platforms") or {},
            release_date=(data.get("release_date") or {}).get("date"),
            player_min=pmin,
            player_max=pmax,
            developer=devs[0] if devs else None,
            metacritic_score=metacritic,
            hardware_tier=hw_tier,
        )

    OWNED_GAMES_URL = "https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/"
    RESOLVE_URL = "https://api.steampowered.com/ISteamUser/ResolveVanityURL/v1/"

    async def get_owned_games(self, steam_id: str) -> list[OwnedGame]:
        from app.core.config import get_settings

        key = get_settings().steam_api_key
        if not key:
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE, "STEAM_API_KEY nao configurada"
            )
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.get(
                self.OWNED_GAMES_URL,
                params={
                    "key": key,
                    "steamid": steam_id,
                    "include_appinfo": 1,
                    "include_played_free_games": 1,
                    "format": "json",
                },
            )
        if res.status_code != 200:
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Steam owned games failed")
        payload = res.json() or {}
        games = ((payload.get("response") or {}).get("games")) or []
        return [
            OwnedGame(
                appid=g.get("appid"),
                name=g.get("name"),
                playtime_forever=g.get("playtime_forever", 0),
            )
            for g in games
            if g.get("appid")
        ]

    async def resolve_vanity(self, vanity: str) -> str | None:
        from app.core.config import get_settings

        key = get_settings().steam_api_key
        if not key:
            return None
        async with httpx.AsyncClient(timeout=10) as client:
            res = await client.get(self.RESOLVE_URL, params={"key": key, "vanityurl": vanity})
        if res.status_code != 200:
            return None
        payload = res.json() or {}
        r = payload.get("response") or {}
        if r.get("success") == 1:
            return r.get("steamid")
        return None


def get_steam_client() -> SteamClient:
    return HttpSteamClient()
