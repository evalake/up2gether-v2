"""Smoke test que valida testcontainers + SQLAlchemy 2.0 async + Base.metadata."""

from sqlalchemy import select

from app.domain.enums import AuthProvider, HardwareTier
from app.models.user import IntegrationAccount, User, UserHardwareProfile


async def test_create_and_query_user(db_session):
    user = User(discord_id="123456789", discord_username="yuri", discord_avatar="avatar.png")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    result = await db_session.execute(select(User).where(User.discord_id == "123456789"))
    fetched = result.scalar_one()

    assert fetched.id == user.id
    assert fetched.discord_username == "yuri"
    assert fetched.discord_avatar == "avatar.png"
    assert fetched.created_at is not None
    assert fetched.updated_at is not None


async def test_user_with_discord_integration(db_session):
    user = User(discord_id="999", discord_username="alice")
    user.integrations.append(
        IntegrationAccount(
            provider=AuthProvider.DISCORD,
            external_id="999",
            access_token="tok",
            refresh_token="ref",
        )
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    assert len(user.integrations) == 1
    assert user.integrations[0].provider == AuthProvider.DISCORD
    assert user.integrations[0].external_id == "999"


async def test_user_hardware_profile_one_to_one(db_session):
    user = User(discord_id="42", discord_username="bob")
    user.hardware_profile = UserHardwareProfile(tier=HardwareTier.HIGH, notes="rtx 4090")
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    assert user.hardware_profile is not None
    assert user.hardware_profile.tier == HardwareTier.HIGH
    assert user.hardware_profile.notes == "rtx 4090"


async def test_integration_unique_per_provider(db_session):
    """Mesmo user nao pode ter duas integrations do mesmo provider."""
    import pytest
    from sqlalchemy.exc import IntegrityError

    user = User(discord_id="dup", discord_username="dup")
    user.integrations.append(IntegrationAccount(provider=AuthProvider.DISCORD, external_id="a"))
    user.integrations.append(IntegrationAccount(provider=AuthProvider.DISCORD, external_id="b"))
    db_session.add(user)

    with pytest.raises(IntegrityError):
        await db_session.commit()
