from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, HttpUrl, field_validator

from app.models.employee import EmploymentType, Gender
from app.models.user import User, UserRole
from app.schemas.auth import validate_password_strength
from app.schemas.pagination import PaginationMeta


class EmergencyContact(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    phone: str = Field(min_length=5, max_length=32)
    relationship: str | None = Field(default=None, max_length=100)


class EmployeeCreateRequest(BaseModel):
    employee_id: str = Field(pattern=r"^[A-Za-z0-9][A-Za-z0-9_-]{2,31}$")
    full_name: str = Field(min_length=2, max_length=200)
    email: EmailStr
    password: str
    role: UserRole = UserRole.EMPLOYEE
    profile_picture_url: HttpUrl | None = None
    phone: str | None = Field(default=None, min_length=5, max_length=32)
    address: str | None = Field(default=None, max_length=1000)
    date_of_birth: date | None = None
    gender: Gender | None = None
    department: str | None = Field(default=None, max_length=120)
    job_title: str | None = Field(default=None, max_length=160)
    employment_type: EmploymentType | None = None
    joining_date: date | None = None
    manager_id: UUID | None = None
    emergency_contact: EmergencyContact | None = None

    @field_validator("employee_id")
    @classmethod
    def normalize_employee_id(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("full_name", "department", "job_title")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        return " ".join(value.split()) if value is not None else None

    @field_validator("password")
    @classmethod
    def enforce_password_strength(cls, value: str) -> str:
        return validate_password_strength(value)

    @field_validator("date_of_birth")
    @classmethod
    def validate_date_of_birth(cls, value: date | None) -> date | None:
        if value is not None and value >= date.today():
            raise ValueError("Date of birth must be in the past")
        return value


class EmployeeAdminUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=200)
    email: EmailStr | None = None
    role: UserRole | None = None
    profile_picture_url: HttpUrl | None = None
    phone: str | None = Field(default=None, min_length=5, max_length=32)
    address: str | None = Field(default=None, max_length=1000)
    date_of_birth: date | None = None
    gender: Gender | None = None
    department: str | None = Field(default=None, max_length=120)
    job_title: str | None = Field(default=None, max_length=160)
    employment_type: EmploymentType | None = None
    joining_date: date | None = None
    manager_id: UUID | None = None
    emergency_contact: EmergencyContact | None = None

    @field_validator("full_name", "department", "job_title")
    @classmethod
    def normalize_text(cls, value: str | None) -> str | None:
        return " ".join(value.split()) if value is not None else None

    @field_validator("full_name", "role")
    @classmethod
    def prevent_required_fields_from_being_cleared(cls, value: Any) -> Any:
        if value is None:
            raise ValueError("Field cannot be null")
        return value


class EmployeeSelfUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    profile_picture_url: HttpUrl | None = None
    phone: str | None = Field(default=None, min_length=5, max_length=32)
    address: str | None = Field(default=None, max_length=1000)


class EmployeeResponse(BaseModel):
    id: UUID
    employee_id: str
    email: EmailStr
    role: UserRole
    is_active: bool
    is_email_verified: bool
    full_name: str
    profile_picture_url: str | None
    phone: str | None
    address: str | None
    date_of_birth: date | None
    gender: Gender | None
    department: str | None
    job_title: str | None
    employment_type: EmploymentType | None
    joining_date: date | None
    manager_id: UUID | None
    emergency_contact: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_user(cls, user: User) -> EmployeeResponse:
        profile = user.profile
        return cls(
            id=user.id,
            employee_id=user.employee_id,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
            is_email_verified=user.is_email_verified,
            full_name=profile.full_name,
            profile_picture_url=profile.profile_picture_url,
            phone=profile.phone,
            address=profile.address,
            date_of_birth=profile.date_of_birth,
            gender=profile.gender,
            department=profile.department,
            job_title=profile.job_title,
            employment_type=profile.employment_type,
            joining_date=profile.joining_date,
            manager_id=profile.manager_id,
            emergency_contact=profile.emergency_contact,
            created_at=user.created_at,
            updated_at=profile.updated_at,
        )


class EmployeeListResponse(BaseModel):
    items: list[EmployeeResponse]
    pagination: PaginationMeta
