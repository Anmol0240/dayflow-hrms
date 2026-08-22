from datetime import UTC, datetime
from decimal import Decimal
from math import ceil
from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthorizationError, ConflictError, ResourceNotFoundError
from app.models.audit import AuditLog
from app.models.notification import Notification, NotificationType
from app.models.payroll import PayrollRecord
from app.models.user import User, UserRole
from app.repositories.payroll import PayrollRepository
from app.repositories.user import UserRepository
from app.schemas.pagination import PaginationMeta
from app.schemas.payroll import (
    PayrollCreateRequest,
    PayrollListResponse,
    PayrollResponse,
    PayrollUpdateRequest,
)

ADMIN_ROLES = {UserRole.ADMIN, UserRole.HR}


class PayrollService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.payroll = PayrollRepository(session)
        self.users = UserRepository(session)

    async def list_own(self, actor: User, page: int, page_size: int) -> PayrollListResponse:
        return await self._list(actor.id, page, page_size)

    async def list_all(
        self, actor: User, employee_id: UUID | None, page: int, page_size: int
    ) -> PayrollListResponse:
        self._require_admin(actor)
        return await self._list(employee_id, page, page_size)

    async def _list(
        self, employee_id: UUID | None, page: int, page_size: int
    ) -> PayrollListResponse:
        items, total = await self.payroll.list(
            employee_id=employee_id, offset=(page - 1) * page_size, limit=page_size
        )
        return PayrollListResponse(
            items=[PayrollResponse.model_validate(item) for item in items],
            pagination=PaginationMeta(
                page=page,
                page_size=page_size,
                total=total,
                pages=ceil(total / page_size) if total else 0,
            ),
        )

    async def create(self, actor: User, request: PayrollCreateRequest) -> PayrollRecord:
        self._require_admin(actor)
        gross, net = self._calculate(request.basic_salary, request.allowances, request.deductions)
        try:
            async with self.session.begin():
                if not await self.users.get_by_id(request.employee_id):
                    raise ResourceNotFoundError("Employee was not found")
                record = PayrollRecord(
                    **request.model_dump(exclude={"payslip_url"}),
                    payslip_url=str(request.payslip_url) if request.payslip_url else None,
                    gross_salary=gross,
                    net_salary=net,
                )
                self.session.add(record)
                self.session.add(
                    Notification(
                        recipient_id=request.employee_id,
                        title="Payroll updated",
                        message=f"Payroll effective {request.effective_from} is available.",
                        notification_type=NotificationType.PAYROLL.value,
                    )
                )
                self.session.add(
                    AuditLog(
                        actor_id=actor.id,
                        action="PAYROLL_CREATED",
                        entity_type="PayrollRecord",
                        entity_id=str(record.id),
                        metadata_={"employee_id": str(request.employee_id)},
                    )
                )
                await self.session.flush()
        except IntegrityError as error:
            raise ConflictError(
                "Payroll already exists for this effective date", "DUPLICATE_PAYROLL"
            ) from error
        return record

    async def update(
        self, actor: User, payroll_id: UUID, request: PayrollUpdateRequest
    ) -> PayrollRecord:
        self._require_admin(actor)
        async with self.session.begin():
            record = await self.payroll.get(payroll_id, for_update=True)
            if record is None:
                raise ResourceNotFoundError("Payroll record was not found")
            changes = request.model_dump(exclude_unset=True)
            if "payslip_url" in changes and changes["payslip_url"] is not None:
                changes["payslip_url"] = str(changes["payslip_url"])
            for name, value in changes.items():
                setattr(record, name, value)
            record.gross_salary, record.net_salary = self._calculate(
                record.basic_salary, record.allowances, record.deductions
            )
            record.updated_at = datetime.now(UTC)
            self.session.add(
                AuditLog(
                    actor_id=actor.id,
                    action="PAYROLL_UPDATED",
                    entity_type="PayrollRecord",
                    entity_id=str(record.id),
                    metadata_={"changed_fields": sorted(changes)},
                )
            )
            await self.session.flush()
        return record

    @staticmethod
    def _calculate(basic: Decimal, allowances: Decimal, deductions: Decimal):
        gross = basic + allowances
        net = gross - deductions
        if net < 0:
            raise ConflictError("Deductions cannot exceed gross salary", "INVALID_SALARY")
        return gross, net

    @staticmethod
    def _require_admin(actor: User) -> None:
        if actor.role not in ADMIN_ROLES:
            raise AuthorizationError()
