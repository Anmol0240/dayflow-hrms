from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.user import User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, user_id: UUID, *, for_update: bool = False) -> User | None:
        statement = select(User).where(User.id == user_id).options(selectinload(User.profile))
        if for_update:
            statement = statement.with_for_update()
        return await self.session.scalar(statement)

    async def get_by_email(self, email: str) -> User | None:
        statement = select(User).where(User.email == email).options(selectinload(User.profile))
        return await self.session.scalar(statement)

    async def get_by_employee_id(
        self, employee_id: str, *, for_update: bool = False
    ) -> User | None:
        statement = (
            select(User).where(User.employee_id == employee_id).options(selectinload(User.profile))
        )
        if for_update:
            statement = statement.with_for_update()
        return await self.session.scalar(statement)

    async def list_employees(
        self,
        *,
        offset: int,
        limit: int,
        search: str | None = None,
        department: str | None = None,
        is_active: bool | None = None,
    ) -> tuple[list[User], int]:
        from app.models.employee import EmployeeProfile

        filters = []
        if search:
            pattern = f"%{search.strip()}%"
            filters.append(
                or_(
                    User.employee_id.ilike(pattern),
                    User.email.ilike(pattern),
                    EmployeeProfile.full_name.ilike(pattern),
                )
            )
        if department:
            filters.append(EmployeeProfile.department == department)
        if is_active is not None:
            filters.append(User.is_active.is_(is_active))

        base = select(User).join(User.profile).where(*filters)
        total = await self.session.scalar(
            select(func.count()).select_from(base.order_by(None).subquery())
        )
        statement = (
            base.options(selectinload(User.profile))
            .order_by(User.created_at.desc(), User.id)
            .offset(offset)
            .limit(limit)
        )
        users = list((await self.session.scalars(statement)).all())
        return users, int(total or 0)

    async def add(self, user: User) -> User:
        self.session.add(user)
        await self.session.flush()
        return user
