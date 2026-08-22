from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.leave import LeaveRequest, LeaveStatus


class LeaveRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, request_id: UUID, *, for_update: bool = False) -> LeaveRequest | None:
        statement = select(LeaveRequest).where(LeaveRequest.id == request_id)
        if for_update:
            statement = statement.with_for_update()
        return await self.session.scalar(statement)

    async def list(
        self, *, employee_id: UUID | None, status: LeaveStatus | None, offset: int, limit: int
    ) -> tuple[list[LeaveRequest], int]:
        filters = []
        if employee_id:
            filters.append(LeaveRequest.employee_id == employee_id)
        if status:
            filters.append(LeaveRequest.status == status)
        total = await self.session.scalar(
            select(func.count()).select_from(LeaveRequest).where(*filters)
        )
        items = list(
            (
                await self.session.scalars(
                    select(LeaveRequest)
                    .where(*filters)
                    .order_by(LeaveRequest.created_at.desc(), LeaveRequest.id)
                    .offset(offset)
                    .limit(limit)
                )
            ).all()
        )
        return items, int(total or 0)

    async def has_approved_overlap(self, request: LeaveRequest) -> bool:
        overlap = await self.session.scalar(
            select(LeaveRequest.id).where(
                LeaveRequest.employee_id == request.employee_id,
                LeaveRequest.id != request.id,
                LeaveRequest.status == LeaveStatus.APPROVED,
                LeaveRequest.start_date <= request.end_date,
                LeaveRequest.end_date >= request.start_date,
            )
        )
        return overlap is not None
