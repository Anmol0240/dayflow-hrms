from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.dependencies import CurrentUser, SessionDependency, require_roles
from app.models.user import User, UserRole
from app.schemas.reports import AdminDashboardResponse, EmployeeDashboardResponse
from app.services.reports import ReportService

router = APIRouter(prefix="/dashboard", tags=["Dashboards"])
AdminUser = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.HR))]


def get_service(session: SessionDependency) -> ReportService:
    return ReportService(session)


Service = Annotated[ReportService, Depends(get_service)]


@router.get("/employee", response_model=EmployeeDashboardResponse)
async def employee_dashboard(
    current_user: CurrentUser, service: Service
) -> EmployeeDashboardResponse:
    return await service.employee_dashboard(current_user)


@router.get("/admin", response_model=AdminDashboardResponse)
async def admin_dashboard(current_user: AdminUser, service: Service) -> AdminDashboardResponse:
    return await service.admin_dashboard(current_user)
