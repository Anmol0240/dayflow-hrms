from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.core.dependencies import CurrentUser, SessionDependency, require_roles
from app.models.user import User, UserRole
from app.schemas.common import ErrorResponse
from app.schemas.employee import (
    EmployeeAdminUpdateRequest,
    EmployeeCreateRequest,
    EmployeeListResponse,
    EmployeeResponse,
    EmployeeSelfUpdateRequest,
)
from app.services.employee import EmployeeService

router = APIRouter(prefix="/employees", tags=["Employees"])
AdminUser = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.HR))]


def get_employee_service(session: SessionDependency) -> EmployeeService:
    return EmployeeService(session)


EmployeeServiceDependency = Annotated[EmployeeService, Depends(get_employee_service)]


@router.get("/me", response_model=EmployeeResponse, summary="Get my employee profile")
async def get_my_profile(current_user: CurrentUser) -> EmployeeResponse:
    return EmployeeResponse.from_user(current_user)


@router.patch(
    "/me",
    response_model=EmployeeResponse,
    responses={422: {"model": ErrorResponse}},
    summary="Update my permitted personal profile fields",
)
async def update_my_profile(
    request: EmployeeSelfUpdateRequest,
    current_user: CurrentUser,
    service: EmployeeServiceDependency,
) -> EmployeeResponse:
    user = await service.update_self(current_user, request)
    return EmployeeResponse.from_user(user)


@router.get("", response_model=EmployeeListResponse, summary="List employees")
async def list_employees(
    current_user: AdminUser,
    service: EmployeeServiceDependency,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query(max_length=200)] = None,
    department: Annotated[str | None, Query(max_length=120)] = None,
    is_active: bool | None = None,
) -> EmployeeListResponse:
    return await service.list_employees(
        current_user,
        page=page,
        page_size=page_size,
        search=search,
        department=department,
        is_active=is_active,
    )


@router.post(
    "",
    response_model=EmployeeResponse,
    status_code=status.HTTP_201_CREATED,
    responses={403: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
    summary="Create an employee account and profile",
)
async def create_employee(
    request: EmployeeCreateRequest,
    current_user: AdminUser,
    service: EmployeeServiceDependency,
) -> EmployeeResponse:
    user = await service.create_employee(current_user, request)
    return EmployeeResponse.from_user(user)


@router.get(
    "/{employee_id}",
    response_model=EmployeeResponse,
    responses={404: {"model": ErrorResponse}},
    summary="Get an employee profile",
)
async def get_employee(
    employee_id: str,
    current_user: AdminUser,
    service: EmployeeServiceDependency,
) -> EmployeeResponse:
    user = await service.get_employee(current_user, employee_id)
    return EmployeeResponse.from_user(user)


@router.patch(
    "/{employee_id}",
    response_model=EmployeeResponse,
    responses={403: {"model": ErrorResponse}, 404: {"model": ErrorResponse}},
    summary="Update any employee profile",
)
async def update_employee(
    employee_id: str,
    request: EmployeeAdminUpdateRequest,
    current_user: AdminUser,
    service: EmployeeServiceDependency,
) -> EmployeeResponse:
    user = await service.update_employee(current_user, employee_id, request)
    return EmployeeResponse.from_user(user)


@router.delete(
    "/{employee_id}",
    response_model=EmployeeResponse,
    responses={404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}},
    summary="Deactivate an employee account",
)
async def deactivate_employee(
    employee_id: str,
    current_user: AdminUser,
    service: EmployeeServiceDependency,
) -> EmployeeResponse:
    user = await service.deactivate_employee(current_user, employee_id)
    return EmployeeResponse.from_user(user)
