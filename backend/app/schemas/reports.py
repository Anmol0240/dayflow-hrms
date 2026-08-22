from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class AttendanceReportResponse(BaseModel):
    start_date: date
    end_date: date
    total_records: int
    present: int
    absent: int
    half_day: int
    leave: int
    total_work_duration: int


class LeaveReportResponse(BaseModel):
    pending: int
    approved: int
    rejected: int
    cancelled: int
    approved_days: int


class PayrollReportResponse(BaseModel):
    record_count: int
    total_gross: Decimal
    total_net: Decimal
    currency: str | None


class EmployeeDashboardResponse(BaseModel):
    full_name: str
    profile_completion: int
    checked_in_today: bool
    checked_out_today: bool
    pending_leave_requests: int
    approved_leave_days: int
    latest_net_salary: Decimal | None
    unread_notifications: int


class AdminDashboardResponse(BaseModel):
    total_employees: int
    active_employees: int
    present_today: int
    employees_on_leave: int
    pending_leave_requests: int
    department_distribution: dict[str, int]
