"""Slash commands do bot Discord do up2gether.

Registra um CommandTree no client que ja roda (PresenceBot). Comandos consultam
o banco direto via SessionLocal (mesmo processo, nao precisa HTTP roundtrip).

Acoes inline (voto, rsvp, interesse) delegam pra discord_actions.
"""

from __future__ import annotations

import logging
import uuid
from datetime import UTC, datetime

import discord
from discord import app_commands
from sqlalchemy import func, select

from app.core.config import get_settings
from app.domain.enums import SessionRsvp
from app.models.game import Game
from app.models.group import Group, GroupMembership
from app.models.session import PlaySession, SessionRsvpRow
from app.models.vote import VoteSession, VoteStage
from app.services.discord_actions import (
    cast_vote,
    list_group_games,
    set_interest,
    set_rsvp,
)

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


class _VoteCandidateSelect(discord.ui.Select):
    def __init__(
        self,
        vote_id: uuid.UUID,
        guild_id: str,
        base_url: str,
        options: list[discord.SelectOption],
        max_values: int,
        stage_id: uuid.UUID,
    ) -> None:
        super().__init__(
            placeholder="escolha seu(s) voto(s)...",
            min_values=1,
            max_values=max_values,
            options=options,
            custom_id=f"u2g:vote:{vote_id}:{stage_id}",
        )
        self.vote_id = vote_id
        self.guild_id = guild_id
        self.base_url = base_url

    async def callback(self, interaction: discord.Interaction) -> None:
        await interaction.response.defer(ephemeral=True, thinking=True)
        approvals = [uuid.UUID(v) for v in self.values]
        from app.core.database import SessionLocal

        async with SessionLocal() as db:
            res = await cast_vote(
                db,
                discord_user_id=str(interaction.user.id),
                guild_id=self.guild_id,
                vote_id=self.vote_id,
                approvals=approvals,
                base_url=self.base_url,
            )
            await db.commit()
        emoji = "✅" if res.ok else "⚠️"
        await interaction.followup.send(f"{emoji} {res.message}", ephemeral=True)


class _RsvpView(discord.ui.View):
    def __init__(self, session_id: uuid.UUID, guild_id: str, base_url: str) -> None:
        super().__init__(timeout=600)
        self.session_id = session_id
        self.guild_id = guild_id
        self.base_url = base_url

    async def _handle(self, interaction: discord.Interaction, status: SessionRsvp) -> None:
        await interaction.response.defer(ephemeral=True, thinking=True)
        from app.core.database import SessionLocal

        async with SessionLocal() as db:
            res = await set_rsvp(
                db,
                discord_user_id=str(interaction.user.id),
                guild_id=self.guild_id,
                session_id=self.session_id,
                status=status,
                base_url=self.base_url,
            )
            await db.commit()
        emoji = "✅" if res.ok else "⚠️"
        await interaction.followup.send(f"{emoji} {res.message}", ephemeral=True)

    @discord.ui.button(label="vou", style=discord.ButtonStyle.success, custom_id="u2g:rsvp:yes")
    async def go(self, interaction: discord.Interaction, _: discord.ui.Button) -> None:
        await self._handle(interaction, SessionRsvp.YES)

    @discord.ui.button(
        label="talvez", style=discord.ButtonStyle.secondary, custom_id="u2g:rsvp:maybe"
    )
    async def maybe(self, interaction: discord.Interaction, _: discord.ui.Button) -> None:
        await self._handle(interaction, SessionRsvp.MAYBE)

    @discord.ui.button(label="nao vou", style=discord.ButtonStyle.danger, custom_id="u2g:rsvp:no")
    async def skip(self, interaction: discord.Interaction, _: discord.ui.Button) -> None:
        await self._handle(interaction, SessionRsvp.NO)


def register_commands(client: discord.Client) -> app_commands.CommandTree:
    """Cria CommandTree ligada ao client e registra os comandos."""
    tree = app_commands.CommandTree(client)
    settings = get_settings()
    base_url = settings.frontend_base_url.rstrip("/")

    @tree.command(name="up2gether", description="Resumo rápido do servidor no Up2Gether")
    async def up2gether_cmd(interaction: discord.Interaction) -> None:
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
                    .where(VoteSession.group_id == group.id, VoteSession.status == "open")
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
        description="Lista sessões agendadas e permite confirmar presença",
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
                        SessionRsvpRow.status == SessionRsvp.YES.value,
                    )
                    .group_by(SessionRsvpRow.session_id)
                )
            ).all()
            going_by_session = {sid: count for sid, count in rsvp_rows}

        # uma msg por sessao pra cada ter suas proprias buttons
        for sess in sessions:
            game = games_by_id.get(sess.game_id)
            game_name = game.name if game else "Jogo removido"
            epoch = int(sess.start_at.timestamp())
            going = going_by_session.get(sess.id, 0)
            cap = f"/{sess.max_participants}" if sess.max_participants else ""
            embed = discord.Embed(
                title=sess.title,
                url=f"{base_url}/groups/{group.id}/sessions/{sess.id}",
                description=(
                    f"Jogo: {game_name}\n"
                    f"Quando: <t:{epoch}:F> (<t:{epoch}:R>)\n"
                    f"Confirmados: {going}{cap}"
                ),
                color=0xEF7C00,
            )
            view = _RsvpView(sess.id, guild_id, base_url)
            await interaction.followup.send(embed=embed, view=view, ephemeral=True)

    @tree.command(
        name="up2gether-votar",
        description="Lista votações abertas e permite votar direto pelo Discord",
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
                await interaction.followup.send(embed=embed, ephemeral=True)
                return

            # pra cada vote, pega o stage atual e os jogos candidatos
            for vote in votes:
                stage_number = vote.current_stage_number
                if stage_number is None:
                    continue
                stage = (
                    await db.execute(
                        select(VoteStage).where(
                            VoteStage.vote_session_id == vote.id,
                            VoteStage.stage_number == stage_number,
                        )
                    )
                ).scalar_one_or_none()
                if stage is None or not stage.candidate_game_ids:
                    continue

                cand_games = (
                    (await db.execute(select(Game).where(Game.id.in_(stage.candidate_game_ids))))
                    .scalars()
                    .all()
                )
                cand_by_id = {g.id: g for g in cand_games}
                options: list[discord.SelectOption] = []
                for cid in stage.candidate_game_ids[:25]:
                    g = cand_by_id.get(cid)
                    if g is None:
                        continue
                    options.append(discord.SelectOption(label=g.name[:100], value=str(g.id)))
                if not options:
                    continue

                stage_info = ""
                if vote.current_stage_number and vote.total_stages:
                    stage_info = f" · Etapa {vote.current_stage_number}/{vote.total_stages}"
                closes_info = ""
                if vote.closes_at:
                    closes_epoch = int(vote.closes_at.timestamp())
                    closes_info = f"\nFecha em: <t:{closes_epoch}:R>"
                embed = discord.Embed(
                    title=vote.title,
                    url=f"{base_url}/groups/{group.id}/votes",
                    description=(
                        f"Candidatos: {len(options)}{stage_info}{closes_info}\n"
                        f"Selecione ate **{stage.max_selections}** abaixo."
                    ),
                    color=0xEF7C00,
                )
                view = discord.ui.View(timeout=600)
                view.add_item(
                    _VoteCandidateSelect(
                        vote_id=vote.id,
                        guild_id=guild_id,
                        base_url=base_url,
                        options=options,
                        max_values=min(stage.max_selections, len(options)),
                        stage_id=stage.id,
                    )
                )
                await interaction.followup.send(embed=embed, view=view, ephemeral=True)

    @tree.command(
        name="up2gether-quero",
        description="Marca interesse em um jogo do servidor",
    )
    @app_commands.describe(
        jogo="Nome do jogo (autocomplete)",
        sinal="Nivel de interesse",
    )
    @app_commands.choices(
        sinal=[
            app_commands.Choice(name="quero jogar", value="want"),
            app_commands.Choice(name="topo", value="ok"),
            app_commands.Choice(name="passo", value="pass"),
        ]
    )
    async def quero_cmd(
        interaction: discord.Interaction,
        jogo: str,
        sinal: app_commands.Choice[str],
    ) -> None:
        if interaction.guild_id is None:
            await interaction.response.send_message(
                "Este comando só funciona dentro de um servidor.", ephemeral=True
            )
            return
        await interaction.response.defer(ephemeral=True, thinking=True)
        try:
            game_id = uuid.UUID(jogo)
        except ValueError:
            await interaction.followup.send(
                "⚠️ Escolha um jogo da lista de autocomplete.", ephemeral=True
            )
            return

        from app.core.database import SessionLocal

        async with SessionLocal() as db:
            res = await set_interest(
                db,
                discord_user_id=str(interaction.user.id),
                guild_id=str(interaction.guild_id),
                game_id=game_id,
                signal=sinal.value,  # type: ignore[arg-type]
                base_url=base_url,
            )
            await db.commit()
        emoji = "✅" if res.ok else "⚠️"
        await interaction.followup.send(f"{emoji} {res.message}", ephemeral=True)

    @quero_cmd.autocomplete("jogo")
    async def jogo_autocomplete(
        interaction: discord.Interaction, current: str
    ) -> list[app_commands.Choice[str]]:
        if interaction.guild_id is None:
            return []
        from app.core.database import SessionLocal

        async with SessionLocal() as db:
            games = await list_group_games(
                db, guild_id=str(interaction.guild_id), query=current, limit=25
            )
        return [app_commands.Choice(name=g.name[:100], value=str(g.id)) for g in games]

    log.info(
        "slash commands registrados: /up2gether, /up2gether-sessoes, "
        "/up2gether-votar, /up2gether-quero"
    )
    return tree
