from datetime import date, timedelta
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthorizationError, ConflictError
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.employee import EmployeeProfile
from app.models.leave import LeaveRequest, LeaveStatus
from app.models.notification import Notification
from app.models.payroll import PayrollRecord
from app.models.user import User, UserRole
from app.repositories.attendance import AttendanceRepository
from app.schemas.reports import (
    AdminDashboardResponse,
    AttendanceReportResponse,
    EmployeeDashboardResponse,
    LeaveReportResponse,
    PayrollReportResponse,
)

ADMIN_ROLES = {UserRole.ADMIN, UserRole.HR}


class ReportService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def attendance(self, actor: User, start: date | None, end: date | None):
        self._admin(actor)
        end = end or date.today()
        start = start or end - timedelta(days=29)
        if end < start:
            raise ConflictError("End date cannot be before start date", "INVALID_DATE_RANGE")
        values = await AttendanceRepository(self.session).summary(None, start, end)
        return AttendanceReportResponse(
            start_date=start, end_date=end, total_records=values.pop("total"), **values
        )

    async def leave(self, actor: User) -> LeaveReportResponse:
        self._admin(actor)
        row = (
            await self.session.execute(
                select(
                    *[
                        func.sum(case((LeaveRequest.status == status, 1), else_=0))
                        for status in LeaveStatus
                    ],
                    func.sum(
                        case(
                            (
                                LeaveRequest.status == LeaveStatus.APPROVED,
                                LeaveRequest.number_of_days,
                            ),
                            else_=0,
                        )
                    ),
                )
            )
        ).one()
        return LeaveReportResponse(
            **{status.value.lower(): int(row[i] or 0) for i, status in enumerate(LeaveStatus)},
            approved_days=int(row[4] or 0),
        )

    async def payroll(self, actor: User) -> PayrollReportResponse:
        self._admin(actor)
        row = (
            await self.session.execute(
                select(
                    func.count(PayrollRecord.id),
                    func.sum(PayrollRecord.gross_salary),
                    func.sum(PayrollRecord.net_salary),
                    func.min(PayrollRecord.currency),
                    func.max(PayrollRecord.currency),
                )
            )
        ).one()
        currency = row[3] if row[3] == row[4] else None
        return PayrollReportResponse(
            record_count=int(row[0] or 0),
            total_gross=Decimal(row[1] or 0),
            total_net=Decimal(row[2] or 0),
            currency=currency,
        )

    async def employee_dashboard(self, actor: User) -> EmployeeDashboardResponse:
        today = date.today()
        attendance = await self.session.scalar(
            select(AttendanceRecord).where(
                AttendanceRecord.employee_id == actor.id,
                AttendanceRecord.attendance_date == today,
            )
        )
        pending, approved_days = (
            await self.session.execute(
                select(
                    func.sum(case((LeaveRequest.status == LeaveStatus.PENDING, 1), else_=0)),
                    func.sum(
                        case(
                            (
                                LeaveRequest.status == LeaveStatus.APPROVED,
                                LeaveRequest.number_of_days,
                            ),
                            else_=0,
                        )
                    ),
                ).where(LeaveRequest.employee_id == actor.id)
            )
        ).one()
        latest_salary = await self.session.scalar(
            select(PayrollRecord.net_salary)
            .where(PayrollRecord.employee_id == actor.id)
            .order_by(PayrollRecord.effective_from.desc())
            .limit(1)
        )
        unread = await self.session.scalar(
            select(func.count())
            .select_from(Notification)
            .where(Notification.recipient_id == actor.id, Notification.is_read.is_(False))
        )
        fields = [
            actor.profile.phone,
            actor.profile.address,
            actor.profile.department,
            actor.profile.job_title,
            actor.profile.joining_date,
        ]
        return EmployeeDashboardResponse(
            full_name=actor.full_name,
            profile_completion=50 + sum(value is not None for value in fields) * 10,
            checked_in_today=bool(attendance and attendance.check_in_time),
            checked_out_today=bool(attendance and attendance.check_out_time),
            pending_leave_requests=int(pending or 0),
            approved_leave_days=int(approved_days or 0),
            latest_net_salary=latest_salary,
            unread_notifications=int(unread or 0),
        )

    async def admin_dashboard(self, actor: User) -> AdminDashboardResponse:
        self._admin(actor)
        today = date.today()
        total, active = (
            await self.session.execute(
                select(func.count(User.id), func.sum(case((User.is_active.is_(True), 1), else_=0)))
            )
        ).one()
        present = await self.session.scalar(
            select(func.count())
            .select_from(AttendanceRecord)
            .where(
                AttendanceRecord.attendance_date == today,
                AttendanceRecord.status.in_([AttendanceStatus.PRESENT, AttendanceStatus.HALF_DAY]),
            )
        )
        on_leave = await self.session.scalar(
            select(func.count())
            .select_from(LeaveRequest)
            .where(
                LeaveRequest.status == LeaveStatus.APPROVED,
                LeaveRequest.start_date <= today,
                LeaveRequest.end_date >= today,
            )
        )
        pending = await self.session.scalar(
            select(func.count())
            .select_from(LeaveRequest)
            .where(LeaveRequest.status == LeaveStatus.PENDING)
        )
        departments = (
            await self.session.execute(
                select(EmployeeProfile.department, func.count())
                .where(EmployeeProfile.department.is_not(None))
                .group_by(EmployeeProfile.department)
            )
        ).all()
        return AdminDashboardResponse(
            total_employees=int(total or 0),
            active_employees=int(active or 0),
            present_today=int(present or 0),
            employees_on_leave=int(on_leave or 0),
            pending_leave_requests=int(pending or 0),
            department_distribution={name: count for name, count in departments},
        )

    @staticmethod
    def _admin(actor: User) -> None:
        if actor.role not in ADMIN_ROLES:
            raise AuthorizationError()
