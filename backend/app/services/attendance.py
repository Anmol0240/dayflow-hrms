from datetime import UTC, date, datetime, timedelta
from math import ceil
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthorizationError, ConflictError, ResourceNotFoundError
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.user import User, UserRole
from app.repositories.attendance import AttendanceRepository
from app.schemas.attendance import (
    AttendanceListResponse,
    AttendanceResponse,
    AttendanceSummaryResponse,
    AttendanceUpdateRequest,
)
from app.schemas.pagination import PaginationMeta

ADMIN_ROLES = {UserRole.ADMIN, UserRole.HR}


class AttendanceService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.records = AttendanceRepository(session)

    async def check_in(self, actor: User) -> AttendanceRecord:
        now = datetime.now(UTC)
        try:
            async with self.session.begin():
                if await self.records.get_for_day(actor.id, now.date()):
                    raise ConflictError("You have already checked in today", "DUPLICATE_CHECK_IN")
                record = AttendanceRecord(
                    employee_id=actor.id,
                    attendance_date=now.date(),
                    check_in_time=now,
                    status=AttendanceStatus.PRESENT,
                    work_duration=0,
                )
                self.session.add(record)
                await self.session.flush()
        except IntegrityError as error:
            raise ConflictError(
                "You have already checked in today", "DUPLICATE_CHECK_IN"
            ) from error
        return record

    async def check_out(self, actor: User) -> AttendanceRecord:
        now = datetime.now(UTC)
        async with self.session.begin():
            record = await self.records.get_for_day(actor.id, now.date())
            if record is None or record.check_in_time is None:
                raise ConflictError("Check in before checking out", "CHECK_IN_REQUIRED")
            if record.check_out_time is not None:
                raise ConflictError("You have already checked out today", "DUPLICATE_CHECK_OUT")
            check_in = record.check_in_time
            if check_in.tzinfo is None:
                check_in = check_in.replace(tzinfo=UTC)
            record.check_out_time = now
            record.work_duration = max(0, int((now - check_in).total_seconds()))
            record.updated_at = now
            await self.session.flush()
        return record

    async def list_own(self, actor: User, **kwargs) -> AttendanceListResponse:
        return await self._list(employee_id=actor.id, **kwargs)

    async def list_all(self, actor: User, **kwargs) -> AttendanceListResponse:
        self._require_admin(actor)
        return await self._list(**kwargs)

    async def _list(self, *, page: int, page_size: int, **filters) -> AttendanceListResponse:
        records, total = await self.records.list_records(
            offset=(page - 1) * page_size, limit=page_size, **filters
        )
        return AttendanceListResponse(
            items=[AttendanceResponse.model_validate(item) for item in records],
            pagination=PaginationMeta(
                page=page,
                page_size=page_size,
                total=total,
                pages=ceil(total / page_size) if total else 0,
            ),
        )

    async def get(self, actor: User, record_id: UUID) -> AttendanceRecord:
        record = await self.records.get_by_id(record_id)
        if record is None:
            raise ResourceNotFoundError("Attendance record was not found")
        if actor.role not in ADMIN_ROLES and record.employee_id != actor.id:
            raise AuthorizationError()
        return record

    async def update(
        self, actor: User, record_id: UUID, request: AttendanceUpdateRequest
    ) -> AttendanceRecord:
        self._require_admin(actor)
        async with self.session.begin():
            record = await self.records.get_by_id(record_id, for_update=True)
            if record is None:
                raise ResourceNotFoundError("Attendance record was not found")
            changes = request.model_dump(exclude_unset=True)
            for name, value in changes.items():
                setattr(record, name, value)
            if record.check_out_time and not record.check_in_time:
                raise ConflictError("Check-out requires a check-in", "CHECK_IN_REQUIRED")
            if record.check_in_time and record.check_out_time:
                check_in = record.check_in_time
                check_out = record.check_out_time
                if check_in.tzinfo is None:
                    check_in = check_in.replace(tzinfo=UTC)
                if check_out.tzinfo is None:
                    check_out = check_out.replace(tzinfo=UTC)
                if check_out < check_in:
                    raise ConflictError(
                        "Check-out cannot be before check-in", "INVALID_ATTENDANCE_TIME"
                    )
                record.work_duration = int((check_out - check_in).total_seconds())
            record.updated_at = datetime.now(UTC)
            await self.session.flush()
        return record

    async def summary(
        self,
        actor: User,
        *,
        employee_id: UUID | None,
        start_date: date | None,
        end_date: date | None,
    ) -> AttendanceSummaryResponse:
        if actor.role not in ADMIN_ROLES:
            employee_id = actor.id
        end = end_date or date.today()
        start = start_date or end - timedelta(days=29)
        if end < start:
            raise ConflictError("End date cannot be before start date", "INVALID_DATE_RANGE")
        values = await self.records.summary(employee_id, start, end)
        return AttendanceSummaryResponse(start_date=start, end_date=end, **values)

    @staticmethod
    def _require_admin(actor: User) -> None:
        if actor.role not in ADMIN_ROLES:
            raise AuthorizationError()
