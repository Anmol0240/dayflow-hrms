from uuid import uuid4

import pytest
from app.core.config import Settings
from app.core.security import (
    InvalidAccessTokenError,
    create_access_token,
    create_urlsafe_token,
    decode_access_token,
    hash_password,
    hash_token,
    password_hash_needs_upgrade,
    verify_password,
)


def test_password_hashing_and_verification() -> None:
    password_hash = hash_password("Correct-Horse-Battery-Staple-42!")

    assert password_hash.startswith("$argon2id$")
    assert verify_password("Correct-Horse-Battery-Staple-42!", password_hash)
    assert not verify_password("wrong-password", password_hash)
    assert not verify_password("password", "not-a-valid-hash")
    assert not password_hash_needs_upgrade(password_hash)


def test_urlsafe_tokens_are_unique_and_enforce_entropy() -> None:
    first = create_urlsafe_token()
    second = create_urlsafe_token()

    assert first != second
    assert len(first) >= 40

    with pytest.raises(ValueError, match="at least 16"):
        create_urlsafe_token(8)


def test_access_token_round_trip_and_tamper_rejection() -> None:
    settings = Settings(
        _env_file=None,
        environment="test",
        jwt_secret="test-secret-with-at-least-thirty-two-characters",
    )
    user_id = uuid4()

    token, expires_in = create_access_token(user_id, "EMPLOYEE", settings)
    claims = decode_access_token(token, settings)

    assert claims.sub == user_id
    assert claims.role == "EMPLOYEE"
    assert claims.type == "access"
    assert expires_in == settings.access_token_minutes * 60

    with pytest.raises(InvalidAccessTokenError):
        decode_access_token(f"{token}tampered", settings)


def test_opaque_tokens_are_hashed_deterministically() -> None:
    token = create_urlsafe_token()

    assert hash_token(token) == hash_token(token)
    assert hash_token(token) != token
    assert len(hash_token(token)) == 64
