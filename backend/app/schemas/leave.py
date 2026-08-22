from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.leave import LeaveStatus, LeaveType
from app.schemas.pagination import PaginationMeta


class LeaveCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    leave_type: LeaveType
    start_date: date
    end_date: date
    reason: str = Field(min_length=3, max_length=2000)
    employee_remarks: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def date_range(self) -> "LeaveCreateRequest":
        if self.end_date < self.start_date:
            raise ValueError("End date cannot be before start date")
        return self


class LeaveDecisionRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reviewer_comment: str | None = Field(default=None, max_length=1000)


class LeaveRejectRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reviewer_comment: str = Field(min_length=3, max_length=1000)


class LeaveResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    employee_id: UUID
    leave_type: LeaveType
    start_date: date
    end_date: date
    number_of_days: int
    reason: str
    status: LeaveStatus
    employee_remarks: str | None
    reviewer_comment: str | None
    reviewed_by: UUID | None
    reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class LeaveListResponse(BaseModel):
    items: list[LeaveResponse]
    pagination: PaginationMeta
