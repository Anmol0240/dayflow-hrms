from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import CurrentUser, SessionDependency, require_roles
from app.models.leave import LeaveRequest, LeaveStatus
from app.models.user import User, UserRole
from app.schemas.leave import (
    LeaveCreateRequest,
    LeaveDecisionRequest,
    LeaveListResponse,
    LeaveRejectRequest,
    LeaveResponse,
)
from app.services.leave import LeaveService

router = APIRouter(prefix="/leave-requests", tags=["Leave requests"])
AdminUser = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.HR))]


def get_service(session: SessionDependency) -> LeaveService:
    return LeaveService(session)


Service = Annotated[LeaveService, Depends(get_service)]


@router.post("", response_model=LeaveResponse, status_code=201)
async def create_leave(
    request: LeaveCreateRequest, current_user: CurrentUser, service: Service
) -> LeaveRequest:
    return await service.create(current_user, request)


@router.get("/me", response_model=LeaveListResponse)
async def own_leave(
    current_user: CurrentUser,
    service: Service,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    status: LeaveStatus | None = None,
) -> LeaveListResponse:
    return await service.list_own(current_user, page=page, page_size=page_size, status=status)


@router.get("", response_model=LeaveListResponse)
async def all_leave(
    current_user: AdminUser,
    service: Service,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    employee_id: UUID | None = None,
    status: LeaveStatus | None = None,
) -> LeaveListResponse:
    return await service.list_all(
        current_user,
        page=page,
        page_size=page_size,
        employee_id=employee_id,
        status=status,
    )


@router.post("/{request_id}/approve", response_model=LeaveResponse)
async def approve(
    request_id: UUID,
    request: LeaveDecisionRequest,
    current_user: AdminUser,
    service: Service,
) -> LeaveRequest:
    return await service.decide(
        current_user, request_id, LeaveStatus.APPROVED, request.reviewer_comment
    )


@router.post("/{request_id}/reject", response_model=LeaveResponse)
async def reject(
    request_id: UUID,
    request: LeaveRejectRequest,
    current_user: AdminUser,
    service: Service,
) -> LeaveRequest:
    return await service.decide(
        current_user, request_id, LeaveStatus.REJECTED, request.reviewer_comment
    )


@router.post("/{request_id}/cancel", response_model=LeaveResponse)
async def cancel(request_id: UUID, current_user: CurrentUser, service: Service) -> LeaveRequest:
    return await service.cancel(current_user, request_id)


@router.get("/{request_id}", response_model=LeaveResponse)
async def get_leave(request_id: UUID, current_user: CurrentUser, service: Service) -> LeaveRequest:
    return await service.get(current_user, request_id)
