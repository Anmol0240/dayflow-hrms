import pytest
from app.core.config import PROJECT_ROOT, Settings
from pydantic import ValidationError


def test_settings_normalize_prefix_and_cors_origins() -> None:
    settings = Settings(
        _env_file=None,
        api_v1_prefix="api/v2/",
        cors_origins="http://localhost:3000/, https://dayflow.example",
    )

    assert settings.api_v1_prefix == "/api/v2"
    assert settings.cors_origin_list == [
        "http://localhost:3000",
        "https://dayflow.example",
    ]


def test_wildcard_cors_origin_is_rejected() -> None:
    with pytest.raises(ValidationError, match="Wildcard CORS origins"):
        Settings(_env_file=None, cors_origins="*")


def test_unsupported_database_driver_is_rejected() -> None:
    with pytest.raises(ValidationError, match=r"postgresql\+asyncpg or sqlite\+aiosqlite"):
        Settings(_env_file=None, database_url="postgresql://localhost/dayflow")


def test_relative_sqlite_path_is_stable_across_working_directories() -> None:
    settings = Settings(
        _env_file=None,
        database_url="sqlite+aiosqlite:///./data/dayflow.db",
    )

    expected_path = (PROJECT_ROOT / "data" / "dayflow.db").resolve().as_posix()
    assert settings.database_url == f"sqlite+aiosqlite:///{expected_path}"


def test_production_requires_secure_settings() -> None:
    with pytest.raises(ValidationError, match="unique JWT secret"):
        Settings(_env_file=None, environment="production")

    with pytest.raises(ValidationError, match="Debug mode"):
        Settings(
            _env_file=None,
            environment="production",
            jwt_secret="production-secret-with-at-least-thirty-two-characters",
            secure_cookies=True,
            debug=True,
        )


def test_secret_is_redacted() -> None:
    settings = Settings(_env_file=None)

    assert settings.jwt_secret.get_secret_value() not in repr(settings)
