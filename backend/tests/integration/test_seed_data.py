from app.core.config import Settings
from app.core.database import Base, Database
from app.models.attendance import AttendanceRecord
from app.models.leave import LeaveRequest
from app.models.notification import Notification
from app.models.payroll import PayrollRecord
from app.models.user import User
from app.seed import seed_database
from sqlalchemy import func, select


async def test_seed_data_is_complete_and_idempotent(tmp_path, monkeypatch) -> None:
    database_path = (tmp_path / "seed.db").as_posix()
    settings = Settings(
        _env_file=None,
        environment="test",
        database_url=f"sqlite+aiosqlite:///{database_path}",
        jwt_secret="seed-test-secret-with-at-least-thirty-two-characters",
        cors_origins="http://localhost:5173",
    )
    monkeypatch.setenv("DAYFLOW_SEED_ADMIN_PASSWORD", "SeedAdminPassword123!")
    monkeypatch.setenv("DAYFLOW_SEED_HR_PASSWORD", "SeedHumanResources123!")
    monkeypatch.setenv("DAYFLOW_SEED_EMPLOYEE_PASSWORD", "SeedEmployeePassword123!")
    database = Database(settings)
    async with database.engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    await database.dispose()

    first = await seed_database(settings)
    second = await seed_database(settings)

    verification = Database(settings)
    try:
        async with verification.session_factory() as session:
            counts = {
                "users": await session.scalar(select(func.count()).select_from(User)),
                "attendance": await session.scalar(
                    select(func.count()).select_from(AttendanceRecord)
                ),
                "leave": await session.scalar(select(func.count()).select_from(LeaveRequest)),
                "payroll": await session.scalar(select(func.count()).select_from(PayrollRecord)),
                "notifications": await session.scalar(
                    select(func.count()).select_from(Notification)
                ),
            }
    finally:
        await verification.dispose()

    assert first == second
    assert counts == {
        "users": 7,
        "attendance": 50,
        "leave": 4,
        "payroll": 5,
        "notifications": 6,
    }
