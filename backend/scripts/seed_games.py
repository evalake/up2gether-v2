"""seed de jogos a partir de uma lista fixa de (nome, steam_appid).
uso:
    python -m scripts.seed_games <group_id>
    # ou usa o primeiro grupo se omitido:
    python -m scripts.seed_games

idempotente: pula jogos que ja existem no grupo (por steam_appid ou nome).
busca detalhes direto da Steam e insere via SQLAlchemy cru (sem auth).
tambem usado como mock data pra prod — essa lista e a base inicial.
"""
from __future__ import annotations

import asyncio
import sys
import uuid

from sqlalchemy import select

from app.core.database import SessionLocal
from app.domain.enums import GameStage, HardwareTier
from app.integrations.steam import HttpSteamClient
from app.models.game import Game
from app.models.group import Group


# lista base — nome e so referencia pro log, o que importa e o appid
SEED_GAMES: list[tuple[str, int]] = [
    ("Killing Floor 3", 1430190),
    ("Nuclear Throne", 242680),
    ("Gunfire Reborn", 1217060),
    ("MISERY", 2119830),
    ("Enshrouded", 1203620),
    ("Mycopunk", 3247750),
    ("LORT", 2956680),
    ("Fellowship", 2352620),
    ("Ready or Not", 1144200),
    ("Catan Universe", 544730),
    ("Crimson Desert", 3321460),
    ("Returnal", 1649240),
    ("Borderlands 4", 1285190),
    ("Project Zomboid", 108600),
    ("Euro Truck Simulator 2", 227300),
    ("Project: Doors", 4174160),
    ("Left 4 Dead 2", 550),
    ("The Forest", 242760),
    ("Dungeon Defenders", 65800),
    ("Ultimate Chicken Horse", 386940),
    ("Pummel Party", 880940),
    ("Worms Armageddon", 217200),
    ("No Rest for the Wicked", 1371980),
    ("7 Days to Die", 251570),
    ("Civilization VI", 289070),
    ("Killing Floor 2", 232090),
    ("No Man's Sky", 275850),
    ("Tribes of Midgard", 858820),
    ("Don't Starve Together", 322330),
    ("Tabletop Simulator", 286160),
    ("Warhammer: Vermintide 2", 552500),
    ("Space Engineers", 244850),
    ("YAPYAP", 3834090),
    ("Everwind", 2253100),
    ("Burglin' Gnomes", 3844970),
    ("Trine Enchanted Edition", 35700),
    ("Monster Hunter Wilds", 2246340),
    ("R.E.P.O.", 3241660),
    ("Abiotic Factor", 427410),
    ("Overcooked! 2", 728880),
    ("HELLDIVERS 2", 553850),
    ("Deadzone: Rogue", 3228590),
    ("Risk of Rain 2", 632360),
]


async def run(group_id_arg: str | None) -> None:
    client = HttpSteamClient()
    async with SessionLocal() as db:
        # resolve grupo
        if group_id_arg:
            group_id = uuid.UUID(group_id_arg)
            grp = (await db.execute(select(Group).where(Group.id == group_id))).scalar_one_or_none()
            if grp is None:
                print(f"grupo {group_id} nao existe")
                sys.exit(1)
        else:
            grp = (await db.execute(select(Group).limit(1))).scalar_one_or_none()
            if grp is None:
                print("sem grupos no banco. cria um primeiro.")
                sys.exit(1)
            group_id = grp.id
        print(f"seeding em grupo {grp.name} ({group_id})")

        # carrega ja existentes pra skip
        existing_appids = set(
            (
                await db.execute(
                    select(Game.steam_appid).where(Game.group_id == group_id, Game.steam_appid.is_not(None))
                )
            )
            .scalars()
            .all()
        )

        ok = 0
        skip = 0
        fail = 0
        for name, appid in SEED_GAMES:
            if appid in existing_appids:
                print(f"  [skip] {name} ({appid}) ja existe")
                skip += 1
                continue
            try:
                d = await client.get_details(appid)
            except Exception as e:
                print(f"  [fail] {name} ({appid}): {e}")
                fail += 1
                continue
            price = d.get("price")
            price_current = (price / 100) if isinstance(price, int | float) else None
            price_init = d.get("price_initial")
            price_original = (price_init / 100) if isinstance(price_init, int | float) else None
            is_free = price_current is None or price_current <= 0
            hw = d.get("hardware_tier") or "mid"
            try:
                hw_enum = HardwareTier(hw)
            except ValueError:
                hw_enum = HardwareTier.MID
            game = Game(
                group_id=group_id,
                name=d.get("name") or name,
                steam_appid=appid,
                cover_url=d.get("header_image"),
                description=d.get("short_description"),
                is_free=is_free,
                price_current=price_current if not is_free else None,
                price_original=price_original,
                discount_percent=d.get("discount_percent"),
                genres=d.get("genres") or [],
                tags=d.get("categories") or [],
                player_min=d.get("player_min") or 1,
                player_max=d.get("player_max"),
                min_hardware_tier=hw_enum,
                stage=GameStage.EXPLORING,
                developer=d.get("developer"),
                release_date=d.get("release_date"),
                metacritic_score=d.get("metacritic_score"),
            )
            db.add(game)
            await db.flush()
            print(f"  [ok]   {name} ({appid}) tier={hw}")
            ok += 1
            # delay leve pra nao ser bloqueado pela steam
            await asyncio.sleep(0.4)

        await db.commit()
        print(f"\nresultado: {ok} ok, {skip} skip, {fail} fail / {len(SEED_GAMES)} total")


if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(run(arg))
