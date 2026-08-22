"""expand employee profiles

Revision ID: 93972583a7c4
Revises: 4b2cbe54bdc2
Create Date: 2026-08-22 13:36:47.449821
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "93972583a7c4"
down_revision: str | None = "4b2cbe54bdc2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("employee_profiles", schema=None) as batch_op:
        batch_op.add_column(sa.Column("profile_picture_url", sa.String(length=2048), nullable=True))
        batch_op.add_column(sa.Column("phone", sa.String(length=32), nullable=True))
        batch_op.add_column(sa.Column("address", sa.String(length=1000), nullable=True))
        batch_op.add_column(sa.Column("date_of_birth", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("gender", sa.String(length=24), nullable=True))
        batch_op.add_column(sa.Column("department", sa.String(length=120), nullable=True))
        batch_op.add_column(sa.Column("job_title", sa.String(length=160), nullable=True))
        batch_op.add_column(sa.Column("employment_type", sa.String(length=16), nullable=True))
        batch_op.add_column(sa.Column("joining_date", sa.Date(), nullable=True))
        batch_op.add_column(sa.Column("manager_id", sa.Uuid(), nullable=True))
        batch_op.add_column(sa.Column("emergency_contact", sa.JSON(), nullable=True))
        batch_op.create_check_constraint(
            batch_op.f("ck_employee_profiles_gender"),
            "gender IN ('FEMALE', 'MALE', 'NON_BINARY', 'OTHER', " "'PREFER_NOT_TO_SAY')",
        )
        batch_op.create_check_constraint(
            batch_op.f("ck_employee_profiles_employment_type"),
            "employment_type IN ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN')",
        )
        batch_op.create_index(
            batch_op.f("ix_employee_profiles_department"), ["department"], unique=False
        )
        batch_op.create_index(
            batch_op.f("ix_employee_profiles_joining_date"),
            ["joining_date"],
            unique=False,
        )
        batch_op.create_index(
            batch_op.f("ix_employee_profiles_manager_id"), ["manager_id"], unique=False
        )
        batch_op.create_foreign_key(
            batch_op.f("fk_employee_profiles_manager_id_users"),
            "users",
            ["manager_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    with op.batch_alter_table("employee_profiles", schema=None) as batch_op:
        batch_op.drop_constraint(
            batch_op.f("fk_employee_profiles_manager_id_users"), type_="foreignkey"
        )
        batch_op.drop_index(batch_op.f("ix_employee_profiles_manager_id"))
        batch_op.drop_index(batch_op.f("ix_employee_profiles_joining_date"))
        batch_op.drop_index(batch_op.f("ix_employee_profiles_department"))
        batch_op.drop_constraint(batch_op.f("ck_employee_profiles_employment_type"), type_="check")
        batch_op.drop_constraint(batch_op.f("ck_employee_profiles_gender"), type_="check")
        batch_op.drop_column("emergency_contact")
        batch_op.drop_column("manager_id")
        batch_op.drop_column("joining_date")
        batch_op.drop_column("employment_type")
        batch_op.drop_column("job_title")
        batch_op.drop_column("department")
        batch_op.drop_column("gender")
        batch_op.drop_column("date_of_birth")
        batch_op.drop_column("address")
        batch_op.drop_column("phone")
        batch_op.drop_column("profile_picture_url")
