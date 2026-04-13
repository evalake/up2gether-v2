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
        "cover_url": "https://images.contentstack.io/v3/assets/bltb6530b271fddd0b1/blt3484b18ab498efb5/649dc88b97a0bc0377014c23/Val_EP7_PlayVALORANT_ContentStackThumbnail_1200x625_B2.png",
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
        "cover_url": "https://images.contentstack.io/v3/assets/blt76b5e73bfd1451ea/blt8b4ab8644c098a6c/60c7a135b83c3c0d68b2021b/TFT_generic_background.jpg",
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
        "cover_url": "https://images.contentstack.io/v3/assets/blta38dcaae86f2ef5c/blt27a63c07c8471754/60a2572e6bf3b10f55e3140b/lor-backgrounds-desktop.jpg",
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
        "cover_url": "https://images.contentstack.io/v3/assets/blt370612131b6e0756/blt3e5141a0a057a935/60ee3a2b4a53ef13e4999391/WR_Meta_Thumbnail.jpg",
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
