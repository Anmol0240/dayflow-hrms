import re

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.user import UserRole
from app.schemas.user import UserResponse

_UPPERCASE = re.compile(r"[A-Z]")
_LOWERCASE = re.compile(r"[a-z]")
_DIGIT = re.compile(r"[0-9]")
_SPECIAL = re.compile(r"[^A-Za-z0-9]")
_EMPLOYEE_ID = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]{2,31}$")
_COMMON_PASSWORDS = {
    "password123!",
    "qwerty123456!",
    "changeme123!",
    "dayflow123!",
}


def validate_password_strength(password: str) -> str:
    if len(password) < 12:
        raise ValueError("Password must contain at least 12 characters")
    if len(password) > 128:
        raise ValueError("Password must contain at most 128 characters")
    if not _UPPERCASE.search(password):
        raise ValueError("Password must include an uppercase letter")
    if not _LOWERCASE.search(password):
        raise ValueError("Password must include a lowercase letter")
    if not _DIGIT.search(password):
        raise ValueError("Password must include a number")
    if not _SPECIAL.search(password):
        raise ValueError("Password must include a special character")
    if password.casefold() in _COMMON_PASSWORDS:
        raise ValueError("Password is too common")
    return password


class SignUpRequest(BaseModel):
    employee_id: str = Field(min_length=3, max_length=32)
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    password: str
    role: UserRole = UserRole.EMPLOYEE

    @field_validator("employee_id")
    @classmethod
    def validate_employee_id(cls, value: str) -> str:
        normalized = value.strip().upper()
        if not _EMPLOYEE_ID.fullmatch(normalized):
            raise ValueError("Employee ID may contain letters, numbers, hyphens, and underscores")
        return normalized

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if len(normalized) < 2:
            raise ValueError("Full name must contain at least two characters")
        return normalized

    @field_validator("password")
    @classmethod
    def enforce_password_strength(cls, value: str) -> str:
        return validate_password_strength(value)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=256)


class VerifyEmailRequest(BaseModel):
    token: str = Field(min_length=32, max_length=512)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=32, max_length=512)
    new_password: str

    @field_validator("new_password")
    @classmethod
    def enforce_password_strength(cls, value: str) -> str:
        return validate_password_strength(value)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"  # noqa: S105 - OAuth token scheme label
    expires_in: int
    user: UserResponse


class MessageResponse(BaseModel):
    detail: str
