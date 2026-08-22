from collections.abc import AsyncIterator

import pytest
from app.core.config import Settings
from app.core.database import Base
from app.main import create_application
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient


class CapturingEmailSender:
    def __init__(self) -> None:
        self.verification_tokens: dict[str, str] = {}
        self.password_reset_tokens: dict[str, str] = {}

    async def send_email_verification(self, email: str, token: str) -> None:
        self.verification_tokens[email] = token

    async def send_password_reset(self, email: str, token: str) -> None:
        self.password_reset_tokens[email] = token


@pytest.fixture
def test_settings() -> Settings:
    return Settings(
        _env_file=None,
        environment="test",
        database_url="sqlite+aiosqlite:///:memory:",
        jwt_secret="test-secret-with-at-least-thirty-two-characters",
        cors_origins="http://localhost:5173, https://dayflow.test/",
        log_level="ERROR",
    )


@pytest.fixture
def email_sender() -> CapturingEmailSender:
    return CapturingEmailSender()


@pytest.fixture
async def application(
    test_settings: Settings,
    email_sender: CapturingEmailSender,
) -> AsyncIterator[FastAPI]:
    test_application = create_application(test_settings)
    test_application.state.email_sender = email_sender
    async with test_application.state.database.engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    yield test_application
    async with test_application.state.database.engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)
    await test_application.state.database.dispose()


@pytest.fixture
async def client(application: FastAPI) -> AsyncIterator[AsyncClient]:
    transport = ASGITransport(app=application, raise_app_exceptions=False)
    async with AsyncClient(transport=transport, base_url="http://test") as test_client:
        yield test_client
