from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import CheckConstraint, Date, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base, TimestampMixin, UUIDPrimaryKeyMixin


class PayrollRecord(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "payroll_records"
    __table_args__ = (
        UniqueConstraint("employee_id", "effective_from"),
        CheckConstraint("basic_salary >= 0", name="basic_salary_non_negative"),
        CheckConstraint("allowances >= 0", name="allowances_non_negative"),
        CheckConstraint("deductions >= 0", name="deductions_non_negative"),
        CheckConstraint("gross_salary >= 0", name="gross_salary_non_negative"),
        CheckConstraint("net_salary >= 0", name="net_salary_non_negative"),
    )

    employee_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    effective_from: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    basic_salary: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    allowances: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    deductions: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    gross_salary: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    net_salary: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="INR")
    payslip_url: Mapped[str | None] = mapped_column(String(2048))
