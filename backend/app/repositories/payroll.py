from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.payroll import PayrollRecord


class PayrollRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, payroll_id: UUID, *, for_update=False) -> PayrollRecord | None:
        statement = select(PayrollRecord).where(PayrollRecord.id == payroll_id)
        if for_update:
            statement = statement.with_for_update()
        return await self.session.scalar(statement)

    async def list(
        self, *, employee_id: UUID | None, offset: int, limit: int
    ) -> tuple[list[PayrollRecord], int]:
        filters = [PayrollRecord.employee_id == employee_id] if employee_id else []
        total = await self.session.scalar(
            select(func.count()).select_from(PayrollRecord).where(*filters)
        )
        items = list(
            (
                await self.session.scalars(
                    select(PayrollRecord)
                    .where(*filters)
                    .order_by(PayrollRecord.effective_from.desc(), PayrollRecord.id)
                    .offset(offset)
                    .limit(limit)
                )
            ).all()
        )
        return items, int(total or 0)
