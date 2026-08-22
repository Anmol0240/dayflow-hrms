from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.core.dependencies import CurrentUser, SessionDependency
from app.models.notification import Notification
from app.schemas.notification import (
    NotificationListResponse,
    NotificationResponse,
    ReadAllResponse,
)
from app.services.notification import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def get_service(session: SessionDependency) -> NotificationService:
    return NotificationService(session)


Service = Annotated[NotificationService, Depends(get_service)]


@router.get("", response_model=NotificationListResponse)
async def notifications(
    current_user: CurrentUser,
    service: Service,
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> NotificationListResponse:
    return await service.list(current_user, page, page_size)


@router.patch("/read-all", response_model=ReadAllResponse)
async def read_all(current_user: CurrentUser, service: Service) -> ReadAllResponse:
    return ReadAllResponse(updated_count=await service.read_all(current_user))


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_read(
    notification_id: UUID, current_user: CurrentUser, service: Service
) -> Notification:
    return await service.mark_read(current_user, notification_id)
