from datetime import UTC, datetime
from math import ceil
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthorizationError, ConflictError, ResourceNotFoundError
from app.models.audit import AuditLog
from app.models.leave import LeaveRequest, LeaveStatus
from app.models.notification import Notification, NotificationType
from app.models.user import User, UserRole
from app.repositories.leave import LeaveRepository
from app.repositories.user import UserRepository
from app.schemas.leave import LeaveCreateRequest, LeaveListResponse, LeaveResponse
from app.schemas.pagination import PaginationMeta

ADMIN_ROLES = {UserRole.ADMIN, UserRole.HR}


class LeaveService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.requests = LeaveRepository(session)

    async def create(self, actor: User, request: LeaveCreateRequest) -> LeaveRequest:
        async with self.session.begin():
            leave = LeaveRequest(
                employee_id=actor.id,
                leave_type=request.leave_type,
                start_date=request.start_date,
                end_date=request.end_date,
                number_of_days=(request.end_date - request.start_date).days + 1,
                reason=request.reason,
                employee_remarks=request.employee_remarks,
                status=LeaveStatus.PENDING,
            )
            self.session.add(leave)
            await self.session.flush()
        return leave

    async def list_own(self, actor: User, **kwargs) -> LeaveListResponse:
        return await self._list(employee_id=actor.id, **kwargs)

    async def list_all(self, actor: User, **kwargs) -> LeaveListResponse:
        self._require_admin(actor)
        return await self._list(**kwargs)

    async def _list(self, *, page: int, page_size: int, **filters) -> LeaveListResponse:
        items, total = await self.requests.list(
            offset=(page - 1) * page_size, limit=page_size, **filters
        )
        return LeaveListResponse(
            items=[LeaveResponse.model_validate(item) for item in items],
            pagination=PaginationMeta(
                page=page,
                page_size=page_size,
                total=total,
                pages=ceil(total / page_size) if total else 0,
            ),
        )

    async def get(self, actor: User, request_id: UUID) -> LeaveRequest:
        leave = await self.requests.get(request_id)
        if leave is None:
            raise ResourceNotFoundError("Leave request was not found")
        if actor.role not in ADMIN_ROLES and leave.employee_id != actor.id:
            raise AuthorizationError()
        return leave

    async def decide(
        self,
        actor: User,
        request_id: UUID,
        status: LeaveStatus,
        reviewer_comment: str | None,
    ) -> LeaveRequest:
        self._require_admin(actor)
        now = datetime.now(UTC)
        async with self.session.begin():
            leave = await self.requests.get(request_id, for_update=True)
            if leave is None:
                raise ResourceNotFoundError("Leave request was not found")
            if leave.status != LeaveStatus.PENDING:
                raise ConflictError("Only pending requests can be reviewed", "LEAVE_NOT_PENDING")
            # Lock the employee row to serialize concurrent decisions for this employee.
            await UserRepository(self.session).get_by_id(leave.employee_id, for_update=True)
            if status == LeaveStatus.APPROVED and await self.requests.has_approved_overlap(leave):
                raise ConflictError(
                    "This request overlaps approved leave", "OVERLAPPING_APPROVED_LEAVE"
                )
            leave.status = status
            leave.reviewer_comment = reviewer_comment
            leave.reviewed_by = actor.id
            leave.reviewed_at = now
            leave.updated_at = now
            self.session.add(
                Notification(
                    recipient_id=leave.employee_id,
                    title=f"Leave request {status.value.lower()}",
                    message=(
                        f"Your {leave.leave_type.value.lower()} leave from "
                        f"{leave.start_date} to {leave.end_date} was {status.value.lower()}."
                    ),
                    notification_type=NotificationType.LEAVE.value,
                )
            )
            self.session.add(
                AuditLog(
                    actor_id=actor.id,
                    action=f"LEAVE_{status.value}",
                    entity_type="LeaveRequest",
                    entity_id=str(leave.id),
                    metadata_={"reviewer_comment": reviewer_comment},
                )
            )
            await self.session.flush()
        return leave

    async def cancel(self, actor: User, request_id: UUID) -> LeaveRequest:
        now = datetime.now(UTC)
        async with self.session.begin():
            leave = await self.requests.get(request_id, for_update=True)
            if leave is None:
                raise ResourceNotFoundError("Leave request was not found")
            if leave.employee_id != actor.id:
                raise AuthorizationError()
            if leave.status != LeaveStatus.PENDING:
                raise ConflictError("Only pending requests can be cancelled", "LEAVE_NOT_PENDING")
            leave.status = LeaveStatus.CANCELLED
            leave.updated_at = now
            await self.session.flush()
        return leave

    @staticmethod
    def _require_admin(actor: User) -> None:
        if actor.role not in ADMIN_ROLES:
            raise AuthorizationError()
