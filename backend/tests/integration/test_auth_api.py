from typing import Annotated, Protocol

from app.core.dependencies import require_roles
from app.models.user import User, UserRole
from app.repositories.user import UserRepository
from fastapi import Depends, FastAPI
from httpx import AsyncClient


class CapturedEmail(Protocol):
    verification_tokens: dict[str, str]
    password_reset_tokens: dict[str, str]


def signup_payload(
    *,
    email: str = "employee@dayflow.dev",
    employee_id: str = "EMP-001",
    password: str = "SecurePassword123!",
    role: str = "EMPLOYEE",
) -> dict[str, str]:
    return {
        "employee_id": employee_id,
        "full_name": "Asha Rao",
        "email": email,
        "password": password,
        "role": role,
    }


async def register_and_verify(
    client: AsyncClient,
    email_sender: CapturedEmail,
    *,
    email: str = "employee@dayflow.dev",
    employee_id: str = "EMP-001",
    password: str = "SecurePassword123!",
) -> None:
    signup_response = await client.post(
        "/api/v1/auth/signup",
        json=signup_payload(email=email, employee_id=employee_id, password=password),
    )
    assert signup_response.status_code == 201
    token = email_sender.verification_tokens[email]
    verification_response = await client.post(
        "/api/v1/auth/verify-email",
        json={"token": token},
    )
    assert verification_response.status_code == 200


async def login(
    client: AsyncClient,
    *,
    email: str = "employee@dayflow.dev",
    password: str = "SecurePassword123!",
) -> dict[str, object]:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert response.status_code == 200
    return response.json()


async def test_successful_signup_persists_normalized_employee_identity(
    client: AsyncClient,
    email_sender: CapturedEmail,
) -> None:
    response = await client.post(
        "/api/v1/auth/signup",
        json={
            **signup_payload(email="Employee@Dayflow.Dev", employee_id="emp-001"),
            "full_name": "  Asha   Rao  ",
        },
    )

    assert response.status_code == 201
    body = response.json()
    assert body["employee_id"] == "EMP-001"
    assert body["email"] == "employee@dayflow.dev"
    assert body["full_name"] == "Asha Rao"
    assert body["role"] == "EMPLOYEE"
    assert body["is_email_verified"] is False
    assert "password" not in response.text
    assert "employee@dayflow.dev" in email_sender.verification_tokens


async def test_duplicate_email_and_employee_id_are_rejected(
    client: AsyncClient,
) -> None:
    first = await client.post("/api/v1/auth/signup", json=signup_payload())
    duplicate_email = await client.post(
        "/api/v1/auth/signup",
        json=signup_payload(email="EMPLOYEE@DAYFLOW.DEV", employee_id="EMP-002"),
    )
    duplicate_employee_id = await client.post(
        "/api/v1/auth/signup",
        json=signup_payload(email="other@dayflow.dev", employee_id="emp-001"),
    )

    assert first.status_code == 201
    assert duplicate_email.status_code == 409
    assert duplicate_email.json()["code"] == "EMAIL_ALREADY_REGISTERED"
    assert duplicate_employee_id.status_code == 409
    assert duplicate_employee_id.json()["code"] == "EMPLOYEE_ID_ALREADY_REGISTERED"


async def test_public_signup_cannot_create_privileged_accounts(client: AsyncClient) -> None:
    for role in ("ADMIN", "HR"):
        response = await client.post(
            "/api/v1/auth/signup",
            json=signup_payload(role=role),
        )

        assert response.status_code == 403
        assert response.json()["code"] == "FORBIDDEN"


async def test_password_strength_is_validated(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/signup",
        json=signup_payload(password="weak-password"),
    )

    assert response.status_code == 422
    assert response.json()["code"] == "VALIDATION_ERROR"
    assert "password" in response.json()["field_errors"]


async def test_email_verification_token_is_single_use(
    client: AsyncClient,
    email_sender: CapturedEmail,
) -> None:
    await client.post("/api/v1/auth/signup", json=signup_payload())
    token = email_sender.verification_tokens["employee@dayflow.dev"]

    first = await client.post("/api/v1/auth/verify-email", json={"token": token})
    reused = await client.post("/api/v1/auth/verify-email", json={"token": token})

    assert first.status_code == 200
    assert reused.status_code == 400
    assert reused.json()["code"] == "INVALID_VERIFICATION_TOKEN"


async def test_login_requires_verification_and_rejects_invalid_credentials(
    client: AsyncClient,
    email_sender: CapturedEmail,
) -> None:
    await client.post("/api/v1/auth/signup", json=signup_payload())

    unverified = await client.post(
        "/api/v1/auth/login",
        json={"email": "employee@dayflow.dev", "password": "SecurePassword123!"},
    )
    wrong_password = await client.post(
        "/api/v1/auth/login",
        json={"email": "employee@dayflow.dev", "password": "WrongPassword123!"},
    )
    unknown_email = await client.post(
        "/api/v1/auth/login",
        json={"email": "unknown@dayflow.dev", "password": "WrongPassword123!"},
    )

    assert unverified.status_code == 401
    assert unverified.json()["code"] == "EMAIL_NOT_VERIFIED"
    assert wrong_password.status_code == 401
    assert wrong_password.json()["code"] == "INVALID_CREDENTIALS"
    assert unknown_email.status_code == 401
    assert unknown_email.json()["code"] == "INVALID_CREDENTIALS"
    assert email_sender.verification_tokens


async def test_login_and_current_user_flow(
    client: AsyncClient,
    email_sender: CapturedEmail,
) -> None:
    await register_and_verify(client, email_sender)
    token_response = await login(client)

    unauthenticated = await client.get("/api/v1/auth/me")
    authenticated = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token_response['access_token']}"},
    )

    assert unauthenticated.status_code == 401
    assert unauthenticated.json()["code"] == "AUTHENTICATION_REQUIRED"
    assert authenticated.status_code == 200
    assert authenticated.json()["email"] == "employee@dayflow.dev"
    refresh_cookie = client.cookies.get("dayflow_refresh_token")
    assert refresh_cookie is not None


async def test_refresh_cookie_uses_http_only_scoped_security_attributes(
    client: AsyncClient,
    email_sender: CapturedEmail,
) -> None:
    await register_and_verify(client, email_sender)
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "employee@dayflow.dev", "password": "SecurePassword123!"},
    )

    set_cookie = response.headers["set-cookie"]
    assert response.status_code == 200
    assert "dayflow_refresh_token=" in set_cookie
    assert "HttpOnly" in set_cookie
    assert "Path=/api/v1/auth" in set_cookie
    assert "SameSite=lax" in set_cookie


async def test_refresh_rotation_detects_reuse_and_revokes_token_family(
    client: AsyncClient,
    email_sender: CapturedEmail,
) -> None:
    await register_and_verify(client, email_sender)
    await login(client)
    original_refresh_token = client.cookies.get("dayflow_refresh_token")
    assert original_refresh_token is not None

    refreshed = await client.post("/api/v1/auth/refresh")
    rotated_refresh_token = client.cookies.get("dayflow_refresh_token")

    assert refreshed.status_code == 200
    assert rotated_refresh_token is not None
    assert rotated_refresh_token != original_refresh_token

    client.cookies.set(
        "dayflow_refresh_token",
        original_refresh_token,
        path="/api/v1/auth",
    )
    reused = await client.post("/api/v1/auth/refresh")
    assert reused.status_code == 401
    assert reused.json()["code"] == "INVALID_REFRESH_TOKEN"

    client.cookies.set(
        "dayflow_refresh_token",
        rotated_refresh_token,
        path="/api/v1/auth",
    )
    revoked_family = await client.post("/api/v1/auth/refresh")
    assert revoked_family.status_code == 401


async def test_logout_revokes_refresh_token(
    client: AsyncClient,
    email_sender: CapturedEmail,
) -> None:
    await register_and_verify(client, email_sender)
    await login(client)
    refresh_token = client.cookies.get("dayflow_refresh_token")
    assert refresh_token is not None

    logout_response = await client.post("/api/v1/auth/logout")
    assert logout_response.status_code == 204

    client.cookies.set("dayflow_refresh_token", refresh_token, path="/api/v1/auth")
    refresh_response = await client.post("/api/v1/auth/refresh")
    assert refresh_response.status_code == 401


async def test_forgot_and_reset_password_are_single_use_and_non_enumerating(
    client: AsyncClient,
    email_sender: CapturedEmail,
) -> None:
    await register_and_verify(client, email_sender)

    unknown = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "unknown@dayflow.dev"},
    )
    known = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "employee@dayflow.dev"},
    )

    assert unknown.status_code == known.status_code == 202
    assert unknown.json() == known.json()
    reset_token = email_sender.password_reset_tokens["employee@dayflow.dev"]

    reset = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "new_password": "NewSecurePassword456!"},
    )
    reused = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": reset_token, "new_password": "AnotherPassword789!"},
    )
    old_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "employee@dayflow.dev", "password": "SecurePassword123!"},
    )
    new_login = await client.post(
        "/api/v1/auth/login",
        json={"email": "employee@dayflow.dev", "password": "NewSecurePassword456!"},
    )

    assert reset.status_code == 200
    assert reused.status_code == 400
    assert old_login.status_code == 401
    assert new_login.status_code == 200


async def test_inactive_accounts_cannot_use_existing_access_tokens(
    application: FastAPI,
    client: AsyncClient,
    email_sender: CapturedEmail,
) -> None:
    await register_and_verify(client, email_sender)
    token_response = await login(client)

    async with application.state.database.session_factory.begin() as session:
        user = await UserRepository(session).get_by_email("employee@dayflow.dev")
        assert user is not None
        user.is_active = False

    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token_response['access_token']}"},
    )

    assert response.status_code == 401
    assert response.json()["code"] == "ACCOUNT_INACTIVE"


async def test_role_guard_enforces_employee_and_admin_access(
    application: FastAPI,
    client: AsyncClient,
    email_sender: CapturedEmail,
) -> None:
    AdminUser = Annotated[User, Depends(require_roles(UserRole.ADMIN, UserRole.HR))]

    @application.get("/test/admin-only")
    async def admin_only(current_user: AdminUser) -> dict[str, str]:
        return {"role": current_user.role.value}

    await register_and_verify(client, email_sender)
    employee_tokens = await login(client)
    employee_response = await client.get(
        "/test/admin-only",
        headers={"Authorization": f"Bearer {employee_tokens['access_token']}"},
    )

    async with application.state.database.session_factory.begin() as session:
        user = await UserRepository(session).get_by_email("employee@dayflow.dev")
        assert user is not None
        user.role = UserRole.ADMIN

    admin_tokens = await login(client)
    admin_response = await client.get(
        "/test/admin-only",
        headers={"Authorization": f"Bearer {admin_tokens['access_token']}"},
    )

    assert employee_response.status_code == 403
    assert employee_response.json()["code"] == "FORBIDDEN"
    assert admin_response.status_code == 200
    assert admin_response.json()["role"] == "ADMIN"
