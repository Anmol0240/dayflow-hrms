import secrets
from datetime import UTC, datetime, timedelta
from hashlib import sha256
from typing import Literal
from uuid import UUID, uuid4

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from jwt import InvalidTokenError
from pydantic import BaseModel, ValidationError

from app.core.config import Settings

_password_hasher = PasswordHasher(
    time_cost=3,
    memory_cost=65_536,
    parallelism=4,
    hash_len=32,
    salt_len=16,
)


def hash_password(password: str) -> str:
    return _password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _password_hasher.verify(password_hash, password)
    except (InvalidHashError, VerificationError, VerifyMismatchError):
        return False


def password_hash_needs_upgrade(password_hash: str) -> bool:
    try:
        return _password_hasher.check_needs_rehash(password_hash)
    except InvalidHashError:
        return True


def create_urlsafe_token(number_of_bytes: int = 32) -> str:
    if number_of_bytes < 16:
        raise ValueError("Security tokens must contain at least 16 random bytes")
    return secrets.token_urlsafe(number_of_bytes)


def hash_token(token: str) -> str:
    return sha256(token.encode("utf-8")).hexdigest()


class AccessTokenClaims(BaseModel):
    sub: UUID
    role: str
    type: Literal["access"]
    jti: UUID
    iat: datetime
    exp: datetime
    iss: str
    aud: str


class InvalidAccessTokenError(ValueError):
    pass


def create_access_token(user_id: UUID, role: str, settings: Settings) -> tuple[str, int]:
    issued_at = datetime.now(UTC)
    expires_at = issued_at + timedelta(minutes=settings.access_token_minutes)
    expires_in = int((expires_at - issued_at).total_seconds())
    payload = {
        "sub": str(user_id),
        "role": role,
        "type": "access",
        "jti": str(uuid4()),
        "iat": issued_at,
        "exp": expires_at,
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
    }
    token = jwt.encode(
        payload,
        settings.jwt_secret.get_secret_value(),
        algorithm=settings.jwt_algorithm,
    )
    return token, expires_in


def decode_access_token(token: str, settings: Settings) -> AccessTokenClaims:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret.get_secret_value(),
            algorithms=[settings.jwt_algorithm],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
            options={"require": ["sub", "role", "type", "jti", "iat", "exp", "iss", "aud"]},
        )
        claims = AccessTokenClaims.model_validate(payload)
        if claims.type != "access":
            raise InvalidAccessTokenError("Token is not an access token")
        return claims
    except (InvalidTokenError, ValidationError, ValueError) as error:
        raise InvalidAccessTokenError("Access token is invalid or expired") from error
