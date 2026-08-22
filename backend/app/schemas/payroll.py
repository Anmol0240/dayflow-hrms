from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, field_validator

from app.schemas.pagination import PaginationMeta


class PayrollCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    employee_id: UUID
    effective_from: date
    basic_salary: Decimal = Field(ge=0, max_digits=14, decimal_places=2)
    allowances: Decimal = Field(default=Decimal("0"), ge=0, max_digits=14, decimal_places=2)
    deductions: Decimal = Field(default=Decimal("0"), ge=0, max_digits=14, decimal_places=2)
    currency: str = Field(default="INR", pattern=r"^[A-Za-z]{3}$")
    payslip_url: HttpUrl | None = None

    @field_validator("currency")
    @classmethod
    def uppercase_currency(cls, value: str) -> str:
        return value.upper()


class PayrollUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    effective_from: date | None = None
    basic_salary: Decimal | None = Field(default=None, ge=0, max_digits=14, decimal_places=2)
    allowances: Decimal | None = Field(default=None, ge=0, max_digits=14, decimal_places=2)
    deductions: Decimal | None = Field(default=None, ge=0, max_digits=14, decimal_places=2)
    currency: str | None = Field(default=None, pattern=r"^[A-Za-z]{3}$")
    payslip_url: HttpUrl | None = None

    @field_validator("currency")
    @classmethod
    def uppercase_currency(cls, value: str | None) -> str | None:
        return value.upper() if value else None


class PayrollResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    employee_id: UUID
    effective_from: date
    basic_salary: Decimal
    allowances: Decimal
    deductions: Decimal
    gross_salary: Decimal
    net_salary: Decimal
    currency: str
    payslip_url: str | None
    created_at: datetime
    updated_at: datetime


class PayrollListResponse(BaseModel):
    items: list[PayrollResponse]
    pagination: PaginationMeta
