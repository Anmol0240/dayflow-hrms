from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import urlparse

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[3]

Environment = Literal["development", "test", "staging", "production"]
DEFAULT_DEVELOPMENT_JWT_SECRET = "development-only-secret-change-me-now"  # noqa: S105


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        env_prefix="DAYFLOW_",
        case_sensitive=False,
        extra="ignore",
    )

    environment: Environment = "development"
    debug: bool = False
    api_v1_prefix: str = "/api/v1"
    application_name: str = "Dayflow API"
    application_version: str = "0.1.0"
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"

    database_url: str = "sqlite+aiosqlite:///./backend/data/dayflow.db"
    database_echo: bool = False
    database_pool_size: int = Field(default=10, ge=1, le=100)
    database_max_overflow: int = Field(default=20, ge=0, le=100)
    database_pool_timeout_seconds: int = Field(default=30, ge=1, le=300)

    jwt_secret: SecretStr = SecretStr(DEFAULT_DEVELOPMENT_JWT_SECRET)
    jwt_algorithm: Literal["HS256", "HS384", "HS512"] = "HS256"
    jwt_issuer: str = "dayflow-api"
    jwt_audience: str = "dayflow-web"
    access_token_minutes: int = Field(default=15, ge=1, le=1440)
    refresh_token_days: int = Field(default=7, ge=1, le=90)
    email_verification_hours: int = Field(default=24, ge=1, le=168)
    password_reset_minutes: int = Field(default=30, ge=5, le=1440)
    refresh_cookie_name: str = "dayflow_refresh_token"
    cookie_samesite: Literal["lax", "strict"] = "lax"
    secure_cookies: bool = False

    cors_origins: str = "http://localhost:5173"

    @field_validator("api_v1_prefix")
    @classmethod
    def validate_api_prefix(cls, value: str) -> str:
        normalized = "/" + value.strip("/")
        if normalized == "/":
            raise ValueError("API prefix cannot be empty")
        return normalized

    @field_validator("database_url")
    @classmethod
    def validate_database_url(cls, value: str) -> str:
        supported = ("postgresql+asyncpg://", "sqlite+aiosqlite:///")
        if not value.startswith(supported):
            raise ValueError("Database URL must use postgresql+asyncpg or sqlite+aiosqlite")
        if value.startswith("sqlite+aiosqlite:///"):
            database_path = value.removeprefix("sqlite+aiosqlite:///")
            if database_path == ":memory:":
                return value
            path = Path(database_path).expanduser()
            if not path.is_absolute():
                path = PROJECT_ROOT / path
            return f"sqlite+aiosqlite:///{path.resolve().as_posix()}"
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        origins = [origin.strip().rstrip("/") for origin in self.cors_origins.split(",")]
        return [origin for origin in origins if origin]

    @model_validator(mode="after")
    def validate_security_settings(self) -> Settings:
        origins = self.cors_origin_list
        if not origins:
            raise ValueError("At least one CORS origin is required")

        for origin in origins:
            parsed = urlparse(origin)
            if origin != "*" and (parsed.scheme not in {"http", "https"} or not parsed.netloc):
                raise ValueError(f"Invalid CORS origin: {origin}")

        if "*" in origins:
            raise ValueError("Wildcard CORS origins are not permitted")

        secret = self.jwt_secret.get_secret_value()
        if len(secret) < 32:
            raise ValueError("JWT secret must contain at least 32 characters")

        if self.environment in {"staging", "production"}:
            if secret == DEFAULT_DEVELOPMENT_JWT_SECRET:
                raise ValueError("A unique JWT secret is required outside local development")
            if self.debug:
                raise ValueError("Debug mode is not permitted outside local development")
            if not self.secure_cookies:
                raise ValueError("Secure cookies are required outside local development")

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
