from datetime import date
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.attendance import AttendanceRecord, AttendanceStatus


class AttendanceRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_for_day(self, employee_id: UUID, day: date) -> AttendanceRecord | None:
        return await self.session.scalar(
            select(AttendanceRecord).where(
                AttendanceRecord.employee_id == employee_id,
                AttendanceRecord.attendance_date == day,
            )
        )

    async def get_by_id(
        self, record_id: UUID, *, for_update: bool = False
    ) -> AttendanceRecord | None:
        statement = select(AttendanceRecord).where(AttendanceRecord.id == record_id)
        if for_update:
            statement = statement.with_for_update()
        return await self.session.scalar(statement)

    async def list_records(
        self,
        *,
        employee_id: UUID | None,
        start_date: date | None,
        end_date: date | None,
        offset: int,
        limit: int,
    ) -> tuple[list[AttendanceRecord], int]:
        filters = []
        if employee_id:
            filters.append(AttendanceRecord.employee_id == employee_id)
        if start_date:
            filters.append(AttendanceRecord.attendance_date >= start_date)
        if end_date:
            filters.append(AttendanceRecord.attendance_date <= end_date)
        total = await self.session.scalar(
            select(func.count()).select_from(AttendanceRecord).where(*filters)
        )
        records = list(
            (
                await self.session.scalars(
                    select(AttendanceRecord)
                    .where(*filters)
                    .order_by(AttendanceRecord.attendance_date.desc(), AttendanceRecord.id)
                    .offset(offset)
                    .limit(limit)
                )
            ).all()
        )
        return records, int(total or 0)

    async def summary(self, employee_id: UUID | None, start_date: date, end_date: date) -> dict:
        filters = [
            AttendanceRecord.attendance_date >= start_date,
            AttendanceRecord.attendance_date <= end_date,
        ]
        if employee_id:
            filters.append(AttendanceRecord.employee_id == employee_id)
        row = (
            await self.session.execute(
                select(
                    func.count(AttendanceRecord.id),
                    func.sum(AttendanceRecord.work_duration),
                    *[
                        func.sum(
                            func.cast(
                                AttendanceRecord.status == status,
                                AttendanceRecord.work_duration.type,
                            )
                        )
                        for status in AttendanceStatus
                    ],
                ).where(*filters)
            )
        ).one()
        return {
            "total": int(row[0] or 0),
            "total_work_duration": int(row[1] or 0),
            **{
                status.value.lower(): int(row[index + 2] or 0)
                for index, status in enumerate(AttendanceStatus)
            },
        }
