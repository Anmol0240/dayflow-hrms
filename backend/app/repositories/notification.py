from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


class NotificationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def list(self, recipient_id: UUID, offset: int, limit: int):
        filters = [Notification.recipient_id == recipient_id]
        total = await self.session.scalar(
            select(func.count()).select_from(Notification).where(*filters)
        )
        unread = await self.session.scalar(
            select(func.count())
            .select_from(Notification)
            .where(*filters, Notification.is_read.is_(False))
        )
        items = list(
            (
                await self.session.scalars(
                    select(Notification)
                    .where(*filters)
                    .order_by(Notification.created_at.desc(), Notification.id)
                    .offset(offset)
                    .limit(limit)
                )
            ).all()
        )
        return items, int(total or 0), int(unread or 0)

    async def get(self, notification_id: UUID) -> Notification | None:
        return await self.session.scalar(
            select(Notification).where(Notification.id == notification_id)
        )

    async def read_all(self, recipient_id: UUID) -> int:
        result = await self.session.execute(
            update(Notification)
            .where(Notification.recipient_id == recipient_id, Notification.is_read.is_(False))
            .values(is_read=True)
        )
        return int(result.rowcount or 0)
