"""Catalogo hardcoded de jogos F2P conhecidos (Riot, Epic).

Esses jogos nao tem API publica de catalogo, entao a gente mantem
os metadados aqui. Covers sao URLs publicas oficiais.
"""

from __future__ import annotations

BUILTIN_GAMES: list[dict] = [
    {
        "slug": "league-of-legends",
        "name": "League of Legends",
        "aliases": ["lol", "league"],
        "source": "riot",
        # ddragon e o CDN oficial da Riot, estavel desde 2012
        "cover_url": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Jinx_0.jpg",
        "description": "MOBA 5v5 competitivo da Riot Games. Escolha entre mais de 160 campeoes e destrua o Nexus inimigo.",
        "is_free": True,
        "genres": ["MOBA", "Estrategia"],
        "player_min": 1,
        "player_max": 10,
        "min_hardware_tier": "low",
        "developer": "Riot Games",
        "release_date": "2009-10-27",
    },
    {
        "slug": "valorant",
        "name": "VALORANT",
        "aliases": ["val", "valo"],
        "source": "riot",
        # valorant-api.com - CDN publica estavel, splash do mapa Ascent
        "cover_url": "https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/splash.png",
        "description": "FPS tatico 5v5 com agentes e habilidades unicas. Plante a spike e domine o mapa.",
        "is_free": True,
        "genres": ["FPS", "Tatico"],
        "player_min": 2,
        "player_max": 10,
        "min_hardware_tier": "low",
        "developer": "Riot Games",
        "release_date": "2020-06-02",
    },
    {
        "slug": "teamfight-tactics",
        "name": "Teamfight Tactics",
        "aliases": ["tft"],
        "source": "riot",
        # ddragon splash tematico (TFT usa campeoes de LoL)
        "cover_url": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/AurelionSol_0.jpg",
        "description": "Auto battler da Riot. Monte seu comp, posicione seus campeoes e venca os 7 oponentes.",
        "is_free": True,
        "genres": ["Auto Battler", "Estrategia"],
        "player_min": 1,
        "player_max": 8,
        "min_hardware_tier": "low",
        "developer": "Riot Games",
        "release_date": "2019-06-26",
    },
    {
        "slug": "legends-of-runeterra",
        "name": "Legends of Runeterra",
        "aliases": ["lor", "runeterra"],
        "source": "riot",
        # ddragon splash (LoR usa personagens de Runeterra)
        "cover_url": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ezreal_0.jpg",
        "description": "Card game estrategico no universo de League of Legends.",
        "is_free": True,
        "genres": ["Card Game", "Estrategia"],
        "player_min": 1,
        "player_max": 2,
        "min_hardware_tier": "low",
        "developer": "Riot Games",
        "release_date": "2020-04-29",
    },
    {
        "slug": "wild-rift",
        "name": "League of Legends: Wild Rift",
        "aliases": ["wr", "wild rift"],
        "source": "riot",
        # ddragon splash (Wild Rift usa mesmos campeoes)
        "cover_url": "https://ddragon.leagueoflegends.com/cdn/img/champion/splash/Ahri_0.jpg",
        "description": "Versao mobile/console de League of Legends. MOBA 5v5 com partidas de ~15 minutos.",
        "is_free": True,
        "genres": ["MOBA", "Estrategia"],
        "player_min": 1,
        "player_max": 10,
        "min_hardware_tier": "low",
        "developer": "Riot Games",
        "release_date": "2020-10-27",
    },
    {
        "slug": "fortnite",
        "name": "Fortnite",
        "aliases": ["fort", "fn"],
        "source": "epic",
        # unreal CDN - bloqueia bots mas browsers carregam normal
        "cover_url": "https://cdn2.unrealengine.com/social-image-chapter4-s3-3840x2160-d35912cc25ad.jpg",
        "description": "Battle royale ate 100 jogadores com construcao, armas e modos criativos.",
        "is_free": True,
        "genres": ["Battle Royale", "Shooter"],
        "player_min": 1,
        "player_max": 4,
        "min_hardware_tier": "mid",
        "developer": "Epic Games",
        "release_date": "2017-07-21",
    },
]

# index por slug pra lookup rapido
_BY_SLUG: dict[str, dict] = {g["slug"]: g for g in BUILTIN_GAMES}


def search_builtin(query: str) -> list[dict]:
    """Fuzzy match: checa query no nome, slug, aliases, ou developer."""
    q = query.lower().strip()
    if len(q) < 2:
        return []
    results = []
    for g in BUILTIN_GAMES:
        name_lower = g["name"].lower()
        slug = g["slug"]
        aliases = g.get("aliases") or []
        if (
            q in name_lower
            or q in slug
            or q in (g.get("developer") or "").lower()
            or any(q == a for a in aliases)
        ):
            results.append(g)
    return results


def get_builtin_by_slug(slug: str) -> dict | None:
    return _BY_SLUG.get(slug)


def get_builtin_by_name(name: str) -> dict | None:
    """Busca por nome exato (case-insensitive)."""
    q = name.lower().strip()
    for g in BUILTIN_GAMES:
        if g["name"].lower() == q:
            return g
    return None
