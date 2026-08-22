from datetime import datetime
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.auth_token import OneTimeToken, RefreshToken, TokenPurpose
from app.models.user import User


class AuthTokenRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def add_refresh_token(self, token: RefreshToken) -> RefreshToken:
        self.session.add(token)
        await self.session.flush()
        return token

    async def get_refresh_token(
        self, token_hash: str, *, for_update: bool = False
    ) -> RefreshToken | None:
        statement = (
            select(RefreshToken)
            .where(RefreshToken.token_hash == token_hash)
            .options(selectinload(RefreshToken.user).selectinload(User.profile))
        )
        if for_update:
            statement = statement.with_for_update()
        return await self.session.scalar(statement)

    async def revoke_all_refresh_tokens(self, user_id: UUID, revoked_at: datetime) -> None:
        await self.session.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.revoked_at.is_(None))
            .values(revoked_at=revoked_at)
        )

    async def add_one_time_token(self, token: OneTimeToken) -> OneTimeToken:
        self.session.add(token)
        await self.session.flush()
        return token

    async def invalidate_one_time_tokens(
        self,
        user_id: UUID,
        purpose: TokenPurpose,
        used_at: datetime,
    ) -> None:
        await self.session.execute(
            update(OneTimeToken)
            .where(
                OneTimeToken.user_id == user_id,
                OneTimeToken.purpose == purpose,
                OneTimeToken.used_at.is_(None),
            )
            .values(used_at=used_at)
        )

    async def get_one_time_token(
        self,
        token_hash: str,
        purpose: TokenPurpose,
        *,
        for_update: bool = False,
    ) -> OneTimeToken | None:
        statement = (
            select(OneTimeToken)
            .where(
                OneTimeToken.token_hash == token_hash,
                OneTimeToken.purpose == purpose,
            )
            .options(selectinload(OneTimeToken.user).selectinload(User.profile))
        )
        if for_update:
            statement = statement.with_for_update()
        return await self.session.scalar(statement)
