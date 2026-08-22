from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import CurrentUser, SessionDependency, require_roles
from app.models.attendance import AttendanceRecord
from app.models.user import User, UserRole
from app.schemas.attendance import (
    AttendanceListResponse,
    AttendanceResponse,
    AttendanceSummaryResponse,
    AttendanceUpdateRequest,
)
from app.services.attendance import AttendanceService

router = APIRouter(prefix="/attendance", tags=["Attendance"])
AdminUser = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.HR))]


def get_service(session: SessionDependency) -> AttendanceService:
    return AttendanceService(session)


Service = Annotated[AttendanceService, Depends(get_service)]


@router.post("/check-in", response_model=AttendanceResponse, status_code=201)
async def check_in(current_user: CurrentUser, service: Service) -> AttendanceRecord:
    return await service.check_in(current_user)


@router.post("/check-out", response_model=AttendanceResponse)
async def check_out(current_user: CurrentUser, service: Service) -> AttendanceRecord:
    return await service.check_out(current_user)


@router.get("/me", response_model=AttendanceListResponse)
async def my_attendance(
    current_user: CurrentUser,
    service: Service,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    start_date: date | None = None,
    end_date: date | None = None,
) -> AttendanceListResponse:
    return await service.list_own(
        current_user,
        page=page,
        page_size=page_size,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/summary", response_model=AttendanceSummaryResponse)
async def attendance_summary(
    current_user: CurrentUser,
    service: Service,
    employee_id: UUID | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> AttendanceSummaryResponse:
    return await service.summary(
        current_user,
        employee_id=employee_id,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("", response_model=AttendanceListResponse)
async def all_attendance(
    current_user: AdminUser,
    service: Service,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    employee_id: UUID | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
) -> AttendanceListResponse:
    return await service.list_all(
        current_user,
        page=page,
        page_size=page_size,
        employee_id=employee_id,
        start_date=start_date,
        end_date=end_date,
    )


@router.get("/{record_id}", response_model=AttendanceResponse)
async def attendance_record(
    record_id: UUID, current_user: CurrentUser, service: Service
) -> AttendanceRecord:
    return await service.get(current_user, record_id)


@router.patch("/{record_id}", response_model=AttendanceResponse)
async def update_attendance(
    record_id: UUID,
    request: AttendanceUpdateRequest,
    current_user: AdminUser,
    service: Service,
) -> AttendanceRecord:
    return await service.update(current_user, record_id, request)
