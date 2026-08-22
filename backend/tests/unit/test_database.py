from app.core.config import Settings
from app.core.database import Database
from sqlalchemy import text


async def test_database_ping_and_session_lifecycle() -> None:
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url="sqlite+aiosqlite:///:memory:",
    )
    database = Database(settings)

    await database.ping()
    async for session in database.session():
        result = await session.execute(text("SELECT 42"))
        assert result.scalar_one() == 42

    await database.dispose()
