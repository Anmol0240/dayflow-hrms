from math import ceil
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthorizationError, ResourceNotFoundError
from app.models.notification import Notification
from app.models.user import User
from app.repositories.notification import NotificationRepository
from app.schemas.notification import NotificationListResponse, NotificationResponse
from app.schemas.pagination import PaginationMeta


class NotificationService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.notifications = NotificationRepository(session)

    async def list(self, actor: User, page: int, page_size: int) -> NotificationListResponse:
        items, total, unread = await self.notifications.list(
            actor.id, (page - 1) * page_size, page_size
        )
        return NotificationListResponse(
            items=[NotificationResponse.model_validate(item) for item in items],
            unread_count=unread,
            pagination=PaginationMeta(
                page=page,
                page_size=page_size,
                total=total,
                pages=ceil(total / page_size) if total else 0,
            ),
        )

    async def mark_read(self, actor: User, notification_id: UUID) -> Notification:
        async with self.session.begin():
            notification = await self.notifications.get(notification_id)
            if notification is None:
                raise ResourceNotFoundError("Notification was not found")
            if notification.recipient_id != actor.id:
                raise AuthorizationError()
            notification.is_read = True
            await self.session.flush()
        return notification

    async def read_all(self, actor: User) -> int:
        async with self.session.begin():
            return await self.notifications.read_all(actor.id)
