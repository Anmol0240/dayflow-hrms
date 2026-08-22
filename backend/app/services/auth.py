from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from anyio import to_thread
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.exceptions import (
    ApplicationError,
    AuthenticationError,
    AuthorizationError,
    ConflictError,
)
from app.core.security import (
    create_access_token,
    create_urlsafe_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.auth_token import OneTimeToken, RefreshToken, TokenPurpose
from app.models.employee import EmployeeProfile
from app.models.user import User, UserRole
from app.repositories.auth_token import AuthTokenRepository
from app.repositories.user import UserRepository
from app.schemas.auth import LoginRequest, ResetPasswordRequest, SignUpRequest
from app.services.email import EmailSender


@dataclass(frozen=True, slots=True)
class AuthenticationResult:
    access_token: str
    expires_in: int
    refresh_token: str
    user: User


def _utc_now() -> datetime:
    return datetime.now(UTC)


def _is_expired(value: datetime, now: datetime) -> bool:
    normalized = value if value.tzinfo is not None else value.replace(tzinfo=UTC)
    return normalized <= now


class AuthService:
    def __init__(
        self,
        session: AsyncSession,
        settings: Settings,
        email_sender: EmailSender,
    ) -> None:
        self.session = session
        self.settings = settings
        self.email_sender = email_sender
        self.users = UserRepository(session)
        self.tokens = AuthTokenRepository(session)

    async def signup(self, request: SignUpRequest) -> User:
        if request.role != UserRole.EMPLOYEE:
            raise AuthorizationError("Public signup can only create employee accounts")

        normalized_email = request.email.lower()
        password_hash = await to_thread.run_sync(hash_password, request.password)
        raw_verification_token = create_urlsafe_token()
        now = _utc_now()

        try:
            async with self.session.begin():
                if await self.users.get_by_email(normalized_email):
                    raise ConflictError(
                        "An account with this email already exists",
                        code="EMAIL_ALREADY_REGISTERED",
                    )
                if await self.users.get_by_employee_id(request.employee_id):
                    raise ConflictError(
                        "An account with this employee ID already exists",
                        code="EMPLOYEE_ID_ALREADY_REGISTERED",
                    )

                user = User(
                    employee_id=request.employee_id,
                    email=normalized_email,
                    hashed_password=password_hash,
                    role=UserRole.EMPLOYEE,
                    profile=EmployeeProfile(full_name=request.full_name),
                )
                await self.users.add(user)
                await self.tokens.add_one_time_token(
                    OneTimeToken(
                        user_id=user.id,
                        token_hash=hash_token(raw_verification_token),
                        purpose=TokenPurpose.EMAIL_VERIFICATION,
                        expires_at=now + timedelta(hours=self.settings.email_verification_hours),
                    )
                )
        except IntegrityError as error:
            raise ConflictError(
                "An account with this email or employee ID already exists",
                code="ACCOUNT_ALREADY_EXISTS",
            ) from error

        await self.email_sender.send_email_verification(user.email, raw_verification_token)
        return user

    async def login(self, request: LoginRequest) -> AuthenticationResult:
        normalized_email = request.email.lower()
        user = await self.users.get_by_email(normalized_email)
        if user is None:
            await self.session.rollback()
            await to_thread.run_sync(hash_password, request.password)
            raise AuthenticationError()

        user_id = user.id
        stored_password_hash = user.hashed_password
        await self.session.rollback()

        password_is_valid = await to_thread.run_sync(
            verify_password,
            request.password,
            stored_password_hash,
        )
        if not password_is_valid:
            raise AuthenticationError()

        raw_refresh_token = create_urlsafe_token()
        now = _utc_now()
        async with self.session.begin():
            current_user = await self.users.get_by_id(user_id, for_update=True)
            if current_user is None:
                raise AuthenticationError()
            self._ensure_account_can_authenticate(current_user)
            await self.tokens.add_refresh_token(
                RefreshToken(
                    user_id=current_user.id,
                    token_hash=hash_token(raw_refresh_token),
                    created_at=now,
                    expires_at=now + timedelta(days=self.settings.refresh_token_days),
                )
            )

        access_token, expires_in = create_access_token(
            current_user.id,
            current_user.role.value,
            self.settings,
        )
        return AuthenticationResult(
            access_token=access_token,
            expires_in=expires_in,
            refresh_token=raw_refresh_token,
            user=current_user,
        )

    async def refresh(self, raw_refresh_token: str) -> AuthenticationResult:
        old_token_hash = hash_token(raw_refresh_token)
        new_raw_token = create_urlsafe_token()
        now = _utc_now()
        invalid_reason: str | None = None

        async with self.session.begin():
            old_token = await self.tokens.get_refresh_token(old_token_hash, for_update=True)
            if old_token is None:
                raise AuthenticationError(code="INVALID_REFRESH_TOKEN")

            if old_token.revoked_at is not None:
                await self.tokens.revoke_all_refresh_tokens(old_token.user_id, now)
                invalid_reason = "Refresh token reuse was detected"
            elif _is_expired(old_token.expires_at, now):
                old_token.revoked_at = now
                invalid_reason = "Refresh token has expired"
            elif not old_token.user.is_active:
                await self.tokens.revoke_all_refresh_tokens(old_token.user_id, now)
                invalid_reason = "Account is inactive"
            elif not old_token.user.is_email_verified:
                await self.tokens.revoke_all_refresh_tokens(old_token.user_id, now)
                invalid_reason = "Email address is not verified"

            if invalid_reason is None:
                replacement = await self.tokens.add_refresh_token(
                    RefreshToken(
                        user_id=old_token.user_id,
                        token_hash=hash_token(new_raw_token),
                        created_at=now,
                        expires_at=now + timedelta(days=self.settings.refresh_token_days),
                    )
                )
                old_token.revoked_at = now
                old_token.replaced_by_id = replacement.id
                user = old_token.user

        if invalid_reason is not None:
            raise AuthenticationError(
                detail="Refresh token is invalid or expired",
                code="INVALID_REFRESH_TOKEN",
            )

        access_token, expires_in = create_access_token(user.id, user.role.value, self.settings)
        return AuthenticationResult(
            access_token=access_token,
            expires_in=expires_in,
            refresh_token=new_raw_token,
            user=user,
        )

    async def logout(self, raw_refresh_token: str | None) -> None:
        if not raw_refresh_token:
            return
        async with self.session.begin():
            token = await self.tokens.get_refresh_token(
                hash_token(raw_refresh_token), for_update=True
            )
            if token is not None and token.revoked_at is None:
                token.revoked_at = _utc_now()

    async def verify_email(self, raw_token: str) -> User:
        now = _utc_now()
        async with self.session.begin():
            token = await self.tokens.get_one_time_token(
                hash_token(raw_token),
                TokenPurpose.EMAIL_VERIFICATION,
                for_update=True,
            )
            self._validate_one_time_token(token, now, "INVALID_VERIFICATION_TOKEN")
            token.used_at = now
            token.user.is_email_verified = True
            user = token.user
        return user

    async def forgot_password(self, email: str) -> None:
        normalized_email = email.lower()
        user = await self.users.get_by_email(normalized_email)
        if user is None or not user.is_active:
            await self.session.rollback()
            return
        user_id = user.id
        await self.session.rollback()

        raw_reset_token = create_urlsafe_token()
        now = _utc_now()
        async with self.session.begin():
            current_user = await self.users.get_by_id(user_id, for_update=True)
            if current_user is None or not current_user.is_active:
                return
            await self.tokens.invalidate_one_time_tokens(
                current_user.id,
                TokenPurpose.PASSWORD_RESET,
                now,
            )
            await self.tokens.add_one_time_token(
                OneTimeToken(
                    user_id=current_user.id,
                    token_hash=hash_token(raw_reset_token),
                    purpose=TokenPurpose.PASSWORD_RESET,
                    expires_at=now + timedelta(minutes=self.settings.password_reset_minutes),
                )
            )

        await self.email_sender.send_password_reset(current_user.email, raw_reset_token)

    async def reset_password(self, request: ResetPasswordRequest) -> None:
        token_hash = hash_token(request.token)
        now = _utc_now()
        token = await self.tokens.get_one_time_token(token_hash, TokenPurpose.PASSWORD_RESET)
        self._validate_one_time_token(token, now, "INVALID_PASSWORD_RESET_TOKEN")
        await self.session.rollback()

        new_password_hash = await to_thread.run_sync(hash_password, request.new_password)
        async with self.session.begin():
            current_token = await self.tokens.get_one_time_token(
                token_hash,
                TokenPurpose.PASSWORD_RESET,
                for_update=True,
            )
            self._validate_one_time_token(
                current_token,
                _utc_now(),
                "INVALID_PASSWORD_RESET_TOKEN",
            )
            current_token.used_at = now
            current_token.user.hashed_password = new_password_hash
            await self.tokens.invalidate_one_time_tokens(
                current_token.user_id,
                TokenPurpose.PASSWORD_RESET,
                now,
            )
            await self.tokens.revoke_all_refresh_tokens(current_token.user_id, now)

    @staticmethod
    def _ensure_account_can_authenticate(user: User) -> None:
        if not user.is_active:
            raise AuthenticationError(detail="Account is inactive", code="ACCOUNT_INACTIVE")
        if not user.is_email_verified:
            raise AuthenticationError(
                detail="Email address is not verified",
                code="EMAIL_NOT_VERIFIED",
            )

    @staticmethod
    def _validate_one_time_token(
        token: OneTimeToken | None,
        now: datetime,
        error_code: str,
    ) -> None:
        if token is None or token.used_at is not None or _is_expired(token.expires_at, now):
            raise ApplicationError(
                detail="The token is invalid or expired",
                code=error_code,
                status_code=400,
            )
