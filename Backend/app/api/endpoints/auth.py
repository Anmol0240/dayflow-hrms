from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response, status

from app.core.dependencies import (
    CurrentUser,
    EmailSenderDependency,
    SessionDependency,
    SettingsDependency,
)
from app.core.exceptions import AuthenticationError
from app.schemas.auth import (
    ForgotPasswordRequest,
    LoginRequest,
    MessageResponse,
    ResetPasswordRequest,
    SignUpRequest,
    TokenResponse,
    VerifyEmailRequest,
)
from app.schemas.common import ErrorResponse
from app.schemas.user import UserResponse
from app.services.auth import AuthenticationResult, AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_auth_service(
    session: SessionDependency,
    settings: SettingsDependency,
    email_sender: EmailSenderDependency,
) -> AuthService:
    return AuthService(session, settings, email_sender)


AuthServiceDependency = Annotated[AuthService, Depends(get_auth_service)]


def _set_refresh_cookie(
    response: Response,
    result: AuthenticationResult,
    settings: SettingsDependency,
) -> None:
    response.set_cookie(
        key=settings.refresh_cookie_name,
        value=result.refresh_token,
        max_age=settings.refresh_token_days * 24 * 60 * 60,
        path=f"{settings.api_v1_prefix}/auth",
        secure=settings.secure_cookies,
        httponly=True,
        samesite=settings.cookie_samesite,
    )


def _token_response(result: AuthenticationResult) -> TokenResponse:
    return TokenResponse(
        access_token=result.access_token,
        expires_in=result.expires_in,
        user=UserResponse.from_user(result.user),
    )


@router.post(
    "/signup",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    responses={409: {"model": ErrorResponse}, 422: {"model": ErrorResponse}},
    summary="Register an employee account",
)
async def signup(request: SignUpRequest, service: AuthServiceDependency) -> UserResponse:
    user = await service.signup(request)
    return UserResponse.from_user(user)


@router.post(
    "/login",
    response_model=TokenResponse,
    responses={401: {"model": ErrorResponse}, 422: {"model": ErrorResponse}},
    summary="Authenticate with email and password",
)
async def login(
    request: LoginRequest,
    response: Response,
    settings: SettingsDependency,
    service: AuthServiceDependency,
) -> TokenResponse:
    result = await service.login(request)
    _set_refresh_cookie(response, result, settings)
    return _token_response(result)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Rotate a refresh token and renew access",
)
async def refresh(
    request: Request,
    response: Response,
    settings: SettingsDependency,
    service: AuthServiceDependency,
) -> TokenResponse:
    refresh_token = request.cookies.get(settings.refresh_cookie_name)
    if not refresh_token:
        raise AuthenticationError(code="INVALID_REFRESH_TOKEN")
    result = await service.refresh(refresh_token)
    _set_refresh_cookie(response, result, settings)
    return _token_response(result)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Revoke the current refresh token",
)
async def logout(
    request: Request,
    response: Response,
    settings: SettingsDependency,
    service: AuthServiceDependency,
) -> None:
    await service.logout(request.cookies.get(settings.refresh_cookie_name))
    response.delete_cookie(
        key=settings.refresh_cookie_name,
        path=f"{settings.api_v1_prefix}/auth",
        secure=settings.secure_cookies,
        httponly=True,
        samesite=settings.cookie_samesite,
    )


@router.get(
    "/me",
    response_model=UserResponse,
    responses={401: {"model": ErrorResponse}},
    summary="Get the authenticated account",
)
async def current_account(current_user: CurrentUser) -> UserResponse:
    return UserResponse.from_user(current_user)


@router.post(
    "/verify-email",
    response_model=MessageResponse,
    responses={400: {"model": ErrorResponse}},
    summary="Verify an email address with a single-use token",
)
async def verify_email(
    request: VerifyEmailRequest,
    service: AuthServiceDependency,
) -> MessageResponse:
    await service.verify_email(request.token)
    return MessageResponse(detail="Email address verified")


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Request password-reset instructions",
)
async def forgot_password(
    request: ForgotPasswordRequest,
    service: AuthServiceDependency,
) -> MessageResponse:
    await service.forgot_password(str(request.email))
    return MessageResponse(
        detail="If an eligible account exists, password-reset instructions have been sent"
    )


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    responses={400: {"model": ErrorResponse}, 422: {"model": ErrorResponse}},
    summary="Reset a password with a single-use token",
)
async def reset_password(
    request: ResetPasswordRequest,
    service: AuthServiceDependency,
) -> MessageResponse:
    await service.reset_password(request)
    return MessageResponse(detail="Password reset successfully")
