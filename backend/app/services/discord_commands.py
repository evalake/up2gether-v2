"""Slash commands do bot Discord do up2gether.

Registra um CommandTree no client que ja roda (PresenceBot). Comandos consultam
o banco direto via SessionLocal (mesmo processo, nao precisa HTTP roundtrip).

O guild id do Discord e o link com o grupo no up2gether via Group.discord_guild_id.
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime

import discord
from discord import app_commands
from sqlalchemy import func, select

from app.core.config import get_settings
from app.models.game import Game
from app.models.group import Group, GroupMembership
from app.models.session import PlaySession, SessionRsvpRow
from app.models.vote import VoteSession

log = logging.getLogger(__name__)


async def _resolve_group(db, guild_id: str) -> Group | None:
    return (
        await db.execute(select(Group).where(Group.discord_guild_id == guild_id))
    ).scalar_one_or_none()


def _not_registered_embed(base_url: str) -> discord.Embed:
    return discord.Embed(
        title="Up2Gether",
        description=(
            f"Este servidor ainda não está registrado.\n"
            f"Acesse **{base_url}** e faça login com o Discord "
            f"para criar o grupo."
        ),
        color=0xEF7C00,
    )


def register_commands(client: discord.Client) -> app_commands.CommandTree:
    """Cria CommandTree ligada ao client e registra os comandos.

    Retorna a tree pra quem chamar (PresenceBot) chamar tree.sync() no on_ready.
    """
    tree = app_commands.CommandTree(client)
    settings = get_settings()
    base_url = settings.frontend_base_url.rstrip("/")

    @tree.command(
        name="up2gether",
        description="Resumo rápido do servidor no Up2Gether",
    )
    async def up2gether_cmd(interaction: discord.Interaction) -> None:
        if interaction.guild_id is None:
            await interaction.response.send_message(
                "Este comando só funciona dentro de um servidor.", ephemeral=True
            )
            return

        await interaction.response.defer(ephemeral=True, thinking=True)

        # import local pra evitar ciclo com database na hora do boot
        from app.core.database import SessionLocal

        guild_id = str(interaction.guild_id)
        async with SessionLocal() as db:
            group = await _resolve_group(db, guild_id)

            if group is None:
                await interaction.followup.send(
                    embed=_not_registered_embed(base_url), ephemeral=True
                )
                return

            seats = (
                await db.execute(
                    select(func.count())
                    .select_from(GroupMembership)
                    .where(
                        GroupMembership.group_id == group.id,
                        GroupMembership.activated_at.is_not(None),
                    )
                )
            ).scalar_one()

            open_votes = (
                await db.execute(
                    select(func.count())
                    .select_from(VoteSession)
                    .where(
                        VoteSession.group_id == group.id,
                        VoteSession.status == "open",
                    )
                )
            ).scalar_one()

            now = datetime.now(UTC)
            upcoming = (
                await db.execute(
                    select(func.count())
                    .select_from(PlaySession)
                    .where(
                        PlaySession.group_id == group.id,
                        PlaySession.status == "scheduled",
                        PlaySession.start_at >= now,
                    )
                )
            ).scalar_one()

        legacy_tag = " (plano legado)" if group.legacy_free else ""
        embed = discord.Embed(
            title=f"{group.name}{legacy_tag}",
            url=f"{base_url}/groups/{group.id}",
            color=0xEF7C00,
        )
        embed.add_field(name="Membros ativos", value=str(seats), inline=True)
        embed.add_field(name="Votações abertas", value=str(open_votes), inline=True)
        embed.add_field(name="Sessões futuras", value=str(upcoming), inline=True)
        embed.set_footer(text="Up2Gether")

        await interaction.followup.send(embed=embed, ephemeral=True)

    @tree.command(
        name="up2gether-sessoes",
        description="Lista as próximas sessões agendadas do servidor",
    )
    async def sessoes_cmd(interaction: discord.Interaction) -> None:
        if interaction.guild_id is None:
            await interaction.response.send_message(
                "Este comando só funciona dentro de um servidor.", ephemeral=True
            )
            return

        await interaction.response.defer(ephemeral=True, thinking=True)

        from app.core.database import SessionLocal

        guild_id = str(interaction.guild_id)
        async with SessionLocal() as db:
            group = await _resolve_group(db, guild_id)

            if group is None:
                await interaction.followup.send(
                    embed=_not_registered_embed(base_url), ephemeral=True
                )
                return

            now = datetime.now(UTC)
            sessions = (
                (
                    await db.execute(
                        select(PlaySession)
                        .where(
                            PlaySession.group_id == group.id,
                            PlaySession.status == "scheduled",
                            PlaySession.start_at >= now,
                        )
                        .order_by(PlaySession.start_at.asc())
                        .limit(5)
                    )
                )
                .scalars()
                .all()
            )

            if not sessions:
                embed = discord.Embed(
                    title=f"{group.name}",
                    description=(
                        "Nenhuma sessão agendada no momento.\n"
                        f"Agende uma em **{base_url}/groups/{group.id}**."
                    ),
                    color=0xEF7C00,
                )
                embed.set_footer(text="Up2Gether")
                await interaction.followup.send(embed=embed, ephemeral=True)
                return

            game_ids = {s.game_id for s in sessions}
            games_rows = (
                (await db.execute(select(Game).where(Game.id.in_(game_ids)))).scalars().all()
            )
            games_by_id: dict[uuid.UUID, Game] = {g.id: g for g in games_rows}

            session_ids = [s.id for s in sessions]
            rsvp_rows = (
                await db.execute(
                    select(SessionRsvpRow.session_id, func.count())
                    .where(
                        SessionRsvpRow.session_id.in_(session_ids),
                        SessionRsvpRow.status == "going",
                    )
                    .group_by(SessionRsvpRow.session_id)
                )
            ).all()
            going_by_session = {sid: count for sid, count in rsvp_rows}

        lines: list[str] = []
        for sess in sessions:
            game = games_by_id.get(sess.game_id)
            game_name = game.name if game else "Jogo removido"
            epoch = int(sess.start_at.timestamp())
            going = going_by_session.get(sess.id, 0)
            cap = f"/{sess.max_participants}" if sess.max_participants else ""
            lines.append(
                f"**{sess.title}**\n"
                f"Jogo: {game_name} · Quando: <t:{epoch}:F> (<t:{epoch}:R>)\n"
                f"Confirmados: {going}{cap}"
            )

        embed = discord.Embed(
            title=f"Próximas sessões · {group.name}",
            url=f"{base_url}/groups/{group.id}",
            description="\n\n".join(lines),
            color=0xEF7C00,
        )
        embed.set_footer(text="Up2Gether · confirme sua presença no app")
        await interaction.followup.send(embed=embed, ephemeral=True)

    @tree.command(
        name="up2gether-votar",
        description="Lista as votações abertas do servidor",
    )
    async def votar_cmd(interaction: discord.Interaction) -> None:
        if interaction.guild_id is None:
            await interaction.response.send_message(
                "Este comando só funciona dentro de um servidor.", ephemeral=True
            )
            return

        await interaction.response.defer(ephemeral=True, thinking=True)

        from app.core.database import SessionLocal

        guild_id = str(interaction.guild_id)
        async with SessionLocal() as db:
            group = await _resolve_group(db, guild_id)

            if group is None:
                await interaction.followup.send(
                    embed=_not_registered_embed(base_url), ephemeral=True
                )
                return

            votes = (
                (
                    await db.execute(
                        select(VoteSession)
                        .where(
                            VoteSession.group_id == group.id,
                            VoteSession.status == "open",
                        )
                        .order_by(VoteSession.opens_at.desc())
                        .limit(5)
                    )
                )
                .scalars()
                .all()
            )

            if not votes:
                embed = discord.Embed(
                    title=f"{group.name}",
                    description=(
                        "Nenhuma votação aberta no momento.\n"
                        f"Abra uma em **{base_url}/groups/{group.id}**."
                    ),
                    color=0xEF7C00,
                )
                embed.set_footer(text="Up2Gether")
                await interaction.followup.send(embed=embed, ephemeral=True)
                return

        lines: list[str] = []
        for vote in votes:
            candidate_count = len(vote.candidate_game_ids or [])
            stage_info = ""
            if vote.current_stage_number and vote.total_stages:
                stage_info = f" · Etapa {vote.current_stage_number}/{vote.total_stages}"
            closes_info = ""
            if vote.closes_at:
                closes_epoch = int(vote.closes_at.timestamp())
                closes_info = f"\nFecha em: <t:{closes_epoch}:R>"
            url = f"{base_url}/groups/{group.id}/votes"
            lines.append(
                f"**[{vote.title}]({url})**\nCandidatos: {candidate_count}{stage_info}{closes_info}"
            )

        embed = discord.Embed(
            title=f"Votações abertas · {group.name}",
            url=f"{base_url}/groups/{group.id}",
            description="\n\n".join(lines),
            color=0xEF7C00,
        )
        embed.set_footer(text="Up2Gether · clique no título para votar")
        await interaction.followup.send(embed=embed, ephemeral=True)

    log.info("slash commands registrados: /up2gether, /up2gether-sessoes, /up2gether-votar")
    return tree
