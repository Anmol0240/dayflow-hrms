from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import CurrentUser, SessionDependency, require_roles
from app.models.payroll import PayrollRecord
from app.models.user import User, UserRole
from app.schemas.payroll import (
    PayrollCreateRequest,
    PayrollListResponse,
    PayrollResponse,
    PayrollUpdateRequest,
)
from app.services.payroll import PayrollService

router = APIRouter(prefix="/payroll", tags=["Payroll"])
AdminUser = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.HR))]


def get_service(session: SessionDependency) -> PayrollService:
    return PayrollService(session)


Service = Annotated[PayrollService, Depends(get_service)]


@router.get("/me", response_model=PayrollListResponse)
async def own_payroll(
    current_user: CurrentUser,
    service: Service,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PayrollListResponse:
    return await service.list_own(current_user, page, page_size)


@router.get("", response_model=PayrollListResponse)
async def all_payroll(
    current_user: AdminUser,
    service: Service,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    employee_id: UUID | None = None,
) -> PayrollListResponse:
    return await service.list_all(current_user, employee_id, page, page_size)


@router.get("/{employee_id}", response_model=PayrollListResponse)
async def employee_payroll(
    employee_id: UUID,
    current_user: AdminUser,
    service: Service,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> PayrollListResponse:
    return await service.list_all(current_user, employee_id, page, page_size)


@router.post("", response_model=PayrollResponse, status_code=201)
async def create_payroll(
    request: PayrollCreateRequest, current_user: AdminUser, service: Service
) -> PayrollRecord:
    return await service.create(current_user, request)


@router.patch("/{payroll_id}", response_model=PayrollResponse)
async def update_payroll(
    payroll_id: UUID,
    request: PayrollUpdateRequest,
    current_user: AdminUser,
    service: Service,
) -> PayrollRecord:
    return await service.update(current_user, payroll_id, request)
