from __future__ import annotations

from datetime import UTC, datetime
from math import ceil
from uuid import UUID

from anyio import to_thread
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthorizationError, ConflictError, ResourceNotFoundError
from app.core.security import hash_password
from app.models.employee import EmployeeProfile
from app.models.user import User, UserRole
from app.repositories.auth_token import AuthTokenRepository
from app.repositories.user import UserRepository
from app.schemas.employee import (
    EmployeeAdminUpdateRequest,
    EmployeeCreateRequest,
    EmployeeListResponse,
    EmployeeResponse,
    EmployeeSelfUpdateRequest,
)
from app.schemas.pagination import PaginationMeta

ADMIN_ROLES = frozenset({UserRole.ADMIN, UserRole.HR})


class EmployeeService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.auth_tokens = AuthTokenRepository(session)

    async def list_employees(
        self,
        actor: User,
        *,
        page: int,
        page_size: int,
        search: str | None,
        department: str | None,
        is_active: bool | None,
    ) -> EmployeeListResponse:
        self._require_admin(actor)
        users, total = await self.users.list_employees(
            offset=(page - 1) * page_size,
            limit=page_size,
            search=search,
            department=department,
            is_active=is_active,
        )
        return EmployeeListResponse(
            items=[EmployeeResponse.from_user(user) for user in users],
            pagination=PaginationMeta(
                page=page,
                page_size=page_size,
                total=total,
                pages=ceil(total / page_size) if total else 0,
            ),
        )

    async def create_employee(self, actor: User, request: EmployeeCreateRequest) -> User:
        self._require_admin(actor)
        if request.role == UserRole.ADMIN:
            raise AuthorizationError("The employee API cannot create Admin accounts")
        if request.role == UserRole.HR and actor.role != UserRole.ADMIN:
            raise AuthorizationError("Only an Admin can create HR accounts")

        password_hash = await to_thread.run_sync(hash_password, request.password)
        profile_values = self._profile_values(request)
        try:
            async with self.session.begin():
                if await self.users.get_by_email(request.email.lower()):
                    raise ConflictError(
                        "An account with this email already exists",
                        code="EMAIL_ALREADY_REGISTERED",
                    )
                if await self.users.get_by_employee_id(request.employee_id):
                    raise ConflictError(
                        "An account with this employee ID already exists",
                        code="EMPLOYEE_ID_ALREADY_REGISTERED",
                    )
                await self._validate_manager(request.manager_id)
                user = User(
                    employee_id=request.employee_id,
                    email=request.email.lower(),
                    hashed_password=password_hash,
                    role=request.role,
                    is_email_verified=True,
                    profile=EmployeeProfile(full_name=request.full_name, **profile_values),
                )
                await self.users.add(user)
        except IntegrityError as error:
            raise ConflictError(
                "An account with this email or employee ID already exists",
                code="ACCOUNT_ALREADY_EXISTS",
            ) from error
        return user

    async def get_employee(self, actor: User, employee_id: str) -> User:
        self._require_admin(actor)
        user = await self.users.get_by_employee_id(employee_id.upper())
        if user is None:
            raise ResourceNotFoundError("Employee was not found")
        return user

    async def update_employee(
        self,
        actor: User,
        employee_id: str,
        request: EmployeeAdminUpdateRequest,
    ) -> User:
        self._require_admin(actor)
        async with self.session.begin():
            user = await self.users.get_by_employee_id(employee_id.upper(), for_update=True)
            if user is None:
                raise ResourceNotFoundError("Employee was not found")

            changes = request.model_dump(exclude_unset=True)
            if "role" in changes:
                new_role = request.role
                if actor.role != UserRole.ADMIN:
                    raise AuthorizationError("Only an Admin can change account roles")
                if new_role == UserRole.ADMIN:
                    raise AuthorizationError("The employee API cannot assign the Admin role")
                user.role = new_role
                user.updated_at = datetime.now(UTC)
                changes.pop("role")

            if "email" in changes:
                normalized_email = str(request.email).lower()
                existing = await self.users.get_by_email(normalized_email)
                if existing is not None and existing.id != user.id:
                    raise ConflictError(
                        "An account with this email already exists",
                        code="EMAIL_ALREADY_REGISTERED",
                    )
                user.email = normalized_email
                user.updated_at = datetime.now(UTC)
                changes.pop("email")

            if "manager_id" in changes:
                if request.manager_id == user.id:
                    raise ConflictError(
                        "An employee cannot be their own manager", "INVALID_MANAGER"
                    )
                await self._validate_manager(request.manager_id)

            self._apply_profile_changes(user.profile, changes)
            await self.session.flush()
        return user

    async def update_self(self, actor: User, request: EmployeeSelfUpdateRequest) -> User:
        async with self.session.begin():
            user = await self.users.get_by_id(actor.id, for_update=True)
            if user is None:
                raise ResourceNotFoundError("Employee was not found")
            self._apply_profile_changes(user.profile, request.model_dump(exclude_unset=True))
            await self.session.flush()
        return user

    async def deactivate_employee(self, actor: User, employee_id: str) -> User:
        self._require_admin(actor)
        async with self.session.begin():
            user = await self.users.get_by_employee_id(employee_id.upper(), for_update=True)
            if user is None:
                raise ResourceNotFoundError("Employee was not found")
            if user.id == actor.id:
                raise ConflictError("You cannot deactivate your own account", "SELF_DEACTIVATION")
            user.is_active = False
            user.updated_at = datetime.now(UTC)
            await self.auth_tokens.revoke_all_refresh_tokens(user.id, datetime.now(UTC))
        return user

    async def _validate_manager(self, manager_id: UUID | None) -> None:
        if manager_id is None:
            return
        manager = await self.users.get_by_id(manager_id)
        if manager is None or not manager.is_active:
            raise ConflictError("Manager must reference an active employee", "INVALID_MANAGER")

    @staticmethod
    def _profile_values(request: EmployeeCreateRequest) -> dict[str, object]:
        values = request.model_dump(
            exclude={"employee_id", "full_name", "email", "password", "role"},
            exclude_none=True,
        )
        if "profile_picture_url" in values:
            values["profile_picture_url"] = str(values["profile_picture_url"])
        if "emergency_contact" in values and request.emergency_contact is not None:
            values["emergency_contact"] = request.emergency_contact.model_dump()
        return values

    @staticmethod
    def _apply_profile_changes(profile: EmployeeProfile, changes: dict[str, object]) -> None:
        if "profile_picture_url" in changes and changes["profile_picture_url"] is not None:
            changes["profile_picture_url"] = str(changes["profile_picture_url"])
        if "emergency_contact" in changes and changes["emergency_contact"] is not None:
            contact = changes["emergency_contact"]
            if hasattr(contact, "model_dump"):
                changes["emergency_contact"] = contact.model_dump()
        for field_name, value in changes.items():
            setattr(profile, field_name, value)
        if changes:
            profile.updated_at = datetime.now(UTC)

    @staticmethod
    def _require_admin(actor: User) -> None:
        if actor.role not in ADMIN_ROLES:
            raise AuthorizationError()
