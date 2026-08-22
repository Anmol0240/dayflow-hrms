from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.attendance import AttendanceStatus
from app.schemas.pagination import PaginationMeta


class AttendanceUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    attendance_date: date | None = None
    check_in_time: datetime | None = None
    check_out_time: datetime | None = None
    status: AttendanceStatus | None = None
    remarks: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def validate_times(self) -> "AttendanceUpdateRequest":
        if self.check_in_time and self.check_out_time and self.check_out_time < self.check_in_time:
            raise ValueError("Check-out time cannot be before check-in time")
        return self


class AttendanceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    employee_id: UUID
    attendance_date: date
    check_in_time: datetime | None
    check_out_time: datetime | None
    status: AttendanceStatus
    work_duration: int
    remarks: str | None
    created_at: datetime
    updated_at: datetime


class AttendanceListResponse(BaseModel):
    items: list[AttendanceResponse]
    pagination: PaginationMeta


class AttendanceSummaryResponse(BaseModel):
    start_date: date
    end_date: date
    total: int
    present: int
    absent: int
    half_day: int
    leave: int
    total_work_duration: int
