from collections.abc import AsyncIterator
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.database import Database


def get_application_settings(request: Request) -> Settings:
    return request.app.state.settings


def get_database(request: Request) -> Database:
    return request.app.state.database


async def get_db_session(
    database: Annotated[Database, Depends(get_database)],
) -> AsyncIterator[AsyncSession]:
    async for session in database.session():
        yield session


SettingsDependency = Annotated[Settings, Depends(get_application_settings)]
DatabaseDependency = Annotated[Database, Depends(get_database)]
SessionDependency = Annotated[AsyncSession, Depends(get_db_session)]
