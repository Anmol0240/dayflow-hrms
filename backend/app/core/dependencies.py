from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.database import Database
from app.core.exceptions import AuthenticationError, AuthorizationError
from app.core.security import InvalidAccessTokenError, decode_access_token
from app.models.user import User, UserRole
from app.repositories.user import UserRepository
from app.services.email import EmailSender

bearer_scheme = HTTPBearer(auto_error=False)


def get_application_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_database(request: Request) -> Database:
    return request.app.state.database


def get_email_sender(request: Request) -> EmailSender:
    return request.app.state.email_sender


async def get_db_session(
    database: Annotated[Database, Depends(get_database)],
) -> AsyncIterator[AsyncSession]:
    async for session in database.session():
        yield session


SettingsDependency = Annotated[Settings, Depends(get_application_settings)]
DatabaseDependency = Annotated[Database, Depends(get_database)]
SessionDependency = Annotated[AsyncSession, Depends(get_db_session)]
EmailSenderDependency = Annotated[EmailSender, Depends(get_email_sender)]


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    session: SessionDependency,
    settings: SettingsDependency,
) -> User:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise AuthenticationError(code="AUTHENTICATION_REQUIRED")
    try:
        claims = decode_access_token(credentials.credentials, settings)
    except InvalidAccessTokenError as error:
        raise AuthenticationError(code="INVALID_ACCESS_TOKEN") from error

    user = await UserRepository(session).get_by_id(claims.sub)
    if user is None:
        raise AuthenticationError(code="INVALID_ACCESS_TOKEN")
    if not user.is_active:
        raise AuthenticationError(detail="Account is inactive", code="ACCOUNT_INACTIVE")
    if not user.is_email_verified:
        raise AuthenticationError(
            detail="Email address is not verified",
            code="EMAIL_NOT_VERIFIED",
        )
    if user.role.value != claims.role:
        raise AuthenticationError(code="INVALID_ACCESS_TOKEN")
    session.expunge_all()
    await session.rollback()
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]


def require_roles(*allowed_roles: UserRole):
    allowed = frozenset(allowed_roles)

    async def role_dependency(current_user: CurrentUser) -> User:
        if current_user.role not in allowed:
            raise AuthorizationError()
        return current_user

    return role_dependency
