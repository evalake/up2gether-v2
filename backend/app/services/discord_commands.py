"""Slash commands do bot Discord do up2gether.

Registra um CommandTree no client que ja roda (PresenceBot). Comandos consultam
o banco direto via SessionLocal (mesmo processo, nao precisa HTTP roundtrip).

O guild id do Discord e o link com o grupo no up2gether via Group.discord_guild_id.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

import discord
from discord import app_commands
from sqlalchemy import func, select

from app.core.config import get_settings
from app.models.group import Group, GroupMembership
from app.models.session import PlaySession
from app.models.vote import VoteSession

log = logging.getLogger(__name__)


def register_commands(client: discord.Client) -> app_commands.CommandTree:
    """Cria CommandTree ligada ao client e registra os comandos.

    Retorna a tree pra quem chamar (PresenceBot) chamar tree.sync() no on_ready.
    """
    tree = app_commands.CommandTree(client)
    settings = get_settings()
    base_url = settings.frontend_base_url.rstrip("/")

    @tree.command(
        name="up2gether",
        description="Resumo rapido do servidor no up2gether",
    )
    async def up2gether_cmd(interaction: discord.Interaction) -> None:
        if interaction.guild_id is None:
            await interaction.response.send_message(
                "Esse comando so funciona dentro de um servidor.", ephemeral=True
            )
            return

        await interaction.response.defer(ephemeral=True, thinking=True)

        # import local pra evitar ciclo com database na hora do boot
        from app.core.database import SessionLocal

        guild_id = str(interaction.guild_id)
        async with SessionLocal() as db:
            group = (
                await db.execute(select(Group).where(Group.discord_guild_id == guild_id))
            ).scalar_one_or_none()

            if group is None:
                embed = discord.Embed(
                    title="up2gether",
                    description=(
                        f"Esse servidor ainda nao esta registrado.\n"
                        f"Entra em **{base_url}** e loga com Discord pra criar o grupo."
                    ),
                    color=0xEF7C00,
                )
                await interaction.followup.send(embed=embed, ephemeral=True)
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

        legacy_tag = " (legacy)" if group.legacy_free else ""
        embed = discord.Embed(
            title=f"{group.name}{legacy_tag}",
            url=f"{base_url}/groups/{group.id}",
            color=0xEF7C00,
        )
        embed.add_field(name="Membros ativos", value=str(seats), inline=True)
        embed.add_field(name="Votacoes abertas", value=str(open_votes), inline=True)
        embed.add_field(name="Sessoes futuras", value=str(upcoming), inline=True)
        embed.set_footer(text="up2gether")

        await interaction.followup.send(embed=embed, ephemeral=True)

    log.info("slash commands registrados: /up2gether")
    return tree
