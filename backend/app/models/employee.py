from __future__ import annotations

from datetime import date
from enum import StrEnum
from typing import TYPE_CHECKING, Any
from uuid import UUID

from sqlalchemy import (
    JSON,
    CheckConstraint,
    Date,
    Enum,
    ForeignKey,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class Gender(StrEnum):
    FEMALE = "FEMALE"
    MALE = "MALE"
    NON_BINARY = "NON_BINARY"
    OTHER = "OTHER"
    PREFER_NOT_TO_SAY = "PREFER_NOT_TO_SAY"


class EmploymentType(StrEnum):
    FULL_TIME = "FULL_TIME"
    PART_TIME = "PART_TIME"
    CONTRACT = "CONTRACT"
    INTERN = "INTERN"


class EmployeeProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "employee_profiles"
    __table_args__ = (
        UniqueConstraint("user_id"),
        CheckConstraint(
            "gender IN ('FEMALE', 'MALE', 'NON_BINARY', 'OTHER', " "'PREFER_NOT_TO_SAY')",
            name="gender",
        ),
        CheckConstraint(
            "employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN')",
            name="employment_type",
        ),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    profile_picture_url: Mapped[str | None] = mapped_column(String(2048))
    phone: Mapped[str | None] = mapped_column(String(32))
    address: Mapped[str | None] = mapped_column(String(1000))
    date_of_birth: Mapped[date | None] = mapped_column(Date)
    gender: Mapped[Gender | None] = mapped_column(
        Enum(Gender, name="gender", native_enum=False, create_constraint=False, length=24)
    )
    department: Mapped[str | None] = mapped_column(String(120), index=True)
    job_title: Mapped[str | None] = mapped_column(String(160))
    employment_type: Mapped[EmploymentType | None] = mapped_column(
        Enum(
            EmploymentType,
            name="employment_type",
            native_enum=False,
            create_constraint=False,
            length=16,
        )
    )
    joining_date: Mapped[date | None] = mapped_column(Date, index=True)
    manager_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    emergency_contact: Mapped[dict[str, Any] | None] = mapped_column(JSON)

    user: Mapped[User] = relationship(back_populates="profile", foreign_keys=[user_id])
    manager: Mapped[User | None] = relationship(foreign_keys=[manager_id])
