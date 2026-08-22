import csv
import io
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Response
from sqlalchemy import select

from app.core.dependencies import SessionDependency, require_roles
from app.models.attendance import AttendanceRecord
from app.models.user import User, UserRole
from app.schemas.reports import (
    AttendanceReportResponse,
    LeaveReportResponse,
    PayrollReportResponse,
)
from app.services.reports import ReportService

router = APIRouter(prefix="/reports", tags=["Reports"])
AdminUser = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.HR))]


def get_service(session: SessionDependency) -> ReportService:
    return ReportService(session)


Service = Annotated[ReportService, Depends(get_service)]


@router.get("/attendance", response_model=AttendanceReportResponse)
async def attendance_report(
    current_user: AdminUser,
    service: Service,
    start_date: date | None = None,
    end_date: date | None = None,
) -> AttendanceReportResponse:
    return await service.attendance(current_user, start_date, end_date)


@router.get("/leave", response_model=LeaveReportResponse)
async def leave_report(current_user: AdminUser, service: Service) -> LeaveReportResponse:
    return await service.leave(current_user)


@router.get("/payroll", response_model=PayrollReportResponse)
async def payroll_report(current_user: AdminUser, service: Service) -> PayrollReportResponse:
    return await service.payroll(current_user)


@router.get("/export")
async def export_attendance(current_user: AdminUser, session: SessionDependency) -> Response:
    records = list(
        (
            await session.scalars(
                select(AttendanceRecord).order_by(AttendanceRecord.attendance_date.desc())
            )
        ).all()
    )
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "record_id",
            "employee_id",
            "attendance_date",
            "status",
            "check_in_time",
            "check_out_time",
            "work_duration_seconds",
        ]
    )
    for item in records:
        writer.writerow(
            [
                item.id,
                item.employee_id,
                item.attendance_date,
                item.status.value,
                item.check_in_time or "",
                item.check_out_time or "",
                item.work_duration,
            ]
        )
    return Response(
        output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=dayflow-attendance.csv"},
    )
