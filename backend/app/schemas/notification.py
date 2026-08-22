from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict

from app.schemas.pagination import PaginationMeta


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    recipient_id: UUID
    title: str
    message: str
    notification_type: str
    is_read: bool
    created_at: datetime


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    unread_count: int
    pagination: PaginationMeta


class ReadAllResponse(BaseModel):
    updated_count: int
