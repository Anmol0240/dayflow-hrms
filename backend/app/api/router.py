from fastapi import APIRouter

from app.api.endpoints.attendance import router as attendance_router
from app.api.endpoints.auth import router as auth_router
from app.api.endpoints.dashboard import router as dashboard_router
from app.api.endpoints.employees import router as employees_router
from app.api.endpoints.health import router as health_router
from app.api.endpoints.leave import router as leave_router
from app.api.endpoints.notifications import router as notifications_router
from app.api.endpoints.payroll import router as payroll_router
from app.api.endpoints.reports import router as reports_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(attendance_router)
api_router.include_router(dashboard_router)
api_router.include_router(employees_router)
api_router.include_router(health_router)
api_router.include_router(leave_router)
api_router.include_router(notifications_router)
api_router.include_router(payroll_router)
api_router.include_router(reports_router)
