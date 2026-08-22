from typing import Protocol

from app.models.user import User, UserRole
from fastapi import FastAPI
from httpx import AsyncClient
from sqlalchemy import update


class CapturedEmail(Protocol):
    verification_tokens: dict[str, str]


PASSWORD = "SecurePassword123!"


async def register_and_verify(
    client: AsyncClient,
    email_sender: CapturedEmail,
    *,
    email: str,
    employee_id: str,
) -> None:
    response = await client.post(
        "/api/v1/auth/signup",
        json={
            "employee_id": employee_id,
            "full_name": f"Employee {employee_id}",
            "email": email,
            "password": PASSWORD,
            "role": "EMPLOYEE",
        },
    )
    assert response.status_code == 201
    verification = await client.post(
        "/api/v1/auth/verify-email",
        json={"token": email_sender.verification_tokens[email]},
    )
    assert verification.status_code == 200


async def login_headers(client: AsyncClient, email: str) -> dict[str, str]:
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": PASSWORD},
    )
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


async def admin_headers(
    client: AsyncClient,
    application: FastAPI,
    email_sender: CapturedEmail,
) -> dict[str, str]:
    email = "admin@dayflow.dev"
    await register_and_verify(
        client,
        email_sender,
        email=email,
        employee_id="ADM-001",
    )
    async with application.state.database.session_factory() as session:
        await session.execute(update(User).where(User.email == email).values(role=UserRole.ADMIN))
        await session.commit()
    return await login_headers(client, email)


def employee_payload(
    *,
    employee_id: str = "EMP-101",
    email: str = "employee101@dayflow.dev",
    role: str = "EMPLOYEE",
) -> dict[str, object]:
    return {
        "employee_id": employee_id,
        "full_name": "Nila Shah",
        "email": email,
        "password": PASSWORD,
        "role": role,
        "phone": "+91 9876543210",
        "department": "Engineering",
        "job_title": "Software Engineer",
        "employment_type": "FULL_TIME",
        "joining_date": "2025-01-06",
        "emergency_contact": {
            "name": "Ravi Shah",
            "phone": "+91 9876500000",
            "relationship": "Parent",
        },
    }


async def test_admin_can_create_list_filter_and_update_employee(
    client: AsyncClient,
    application: FastAPI,
    email_sender: CapturedEmail,
) -> None:
    headers = await admin_headers(client, application, email_sender)

    created = await client.post("/api/v1/employees", headers=headers, json=employee_payload())
    listed = await client.get(
        "/api/v1/employees",
        headers=headers,
        params={"search": "Nila", "department": "Engineering", "page_size": 1},
    )
    updated = await client.patch(
        "/api/v1/employees/EMP-101",
        headers=headers,
        json={"job_title": "Senior Engineer", "department": "Platform"},
    )

    assert created.status_code == 201
    assert created.json()["is_email_verified"] is True
    assert created.json()["emergency_contact"]["name"] == "Ravi Shah"
    assert listed.status_code == 200
    assert listed.json()["pagination"] == {
        "page": 1,
        "page_size": 1,
        "total": 1,
        "pages": 1,
    }
    assert listed.json()["items"][0]["employee_id"] == "EMP-101"
    assert updated.status_code == 200
    assert updated.json()["job_title"] == "Senior Engineer"
    assert updated.json()["department"] == "Platform"


async def test_employee_can_only_update_permitted_personal_fields(
    client: AsyncClient,
    email_sender: CapturedEmail,
) -> None:
    email = "self@dayflow.dev"
    await register_and_verify(client, email_sender, email=email, employee_id="EMP-201")
    headers = await login_headers(client, email)

    profile = await client.get("/api/v1/employees/me", headers=headers)
    allowed = await client.patch(
        "/api/v1/employees/me",
        headers=headers,
        json={"phone": "+91 9000000000", "address": "12 Lake Road"},
    )
    forbidden_field = await client.patch(
        "/api/v1/employees/me",
        headers=headers,
        json={"department": "Finance"},
    )
    all_employees = await client.get("/api/v1/employees", headers=headers)

    assert profile.status_code == 200
    assert profile.json()["employee_id"] == "EMP-201"
    assert allowed.status_code == 200
    assert allowed.json()["phone"] == "+91 9000000000"
    assert forbidden_field.status_code == 422
    assert forbidden_field.json()["code"] == "VALIDATION_ERROR"
    assert all_employees.status_code == 403


async def test_employee_identity_conflicts_and_admin_role_assignment_are_rejected(
    client: AsyncClient,
    application: FastAPI,
    email_sender: CapturedEmail,
) -> None:
    headers = await admin_headers(client, application, email_sender)
    first = await client.post("/api/v1/employees", headers=headers, json=employee_payload())
    duplicate_email = await client.post(
        "/api/v1/employees",
        headers=headers,
        json=employee_payload(employee_id="EMP-102"),
    )
    duplicate_id = await client.post(
        "/api/v1/employees",
        headers=headers,
        json=employee_payload(email="other@dayflow.dev"),
    )
    admin_creation = await client.post(
        "/api/v1/employees",
        headers=headers,
        json=employee_payload(employee_id="ADM-002", email="admin2@dayflow.dev", role="ADMIN"),
    )

    assert first.status_code == 201
    assert duplicate_email.status_code == 409
    assert duplicate_email.json()["code"] == "EMAIL_ALREADY_REGISTERED"
    assert duplicate_id.status_code == 409
    assert duplicate_id.json()["code"] == "EMPLOYEE_ID_ALREADY_REGISTERED"
    assert admin_creation.status_code == 403


async def test_admin_can_deactivate_employee_and_deactivated_access_is_blocked(
    client: AsyncClient,
    application: FastAPI,
    email_sender: CapturedEmail,
) -> None:
    headers = await admin_headers(client, application, email_sender)
    email = "deactivate@dayflow.dev"
    created = await client.post(
        "/api/v1/employees",
        headers=headers,
        json=employee_payload(employee_id="EMP-301", email=email),
    )
    employee_headers = await login_headers(client, email)
    deactivated = await client.delete("/api/v1/employees/EMP-301", headers=headers)
    after_deactivation = await client.get("/api/v1/employees/me", headers=employee_headers)
    self_deactivation = await client.delete("/api/v1/employees/ADM-001", headers=headers)

    assert created.status_code == 201
    assert deactivated.status_code == 200
    assert deactivated.json()["is_active"] is False
    assert after_deactivation.status_code == 401
    assert after_deactivation.json()["code"] == "ACCOUNT_INACTIVE"
    assert self_deactivation.status_code == 409
    assert self_deactivation.json()["code"] == "SELF_DEACTIVATION"


async def test_manager_must_be_active_and_employee_cannot_manage_self(
    client: AsyncClient,
    application: FastAPI,
    email_sender: CapturedEmail,
) -> None:
    headers = await admin_headers(client, application, email_sender)
    created = await client.post("/api/v1/employees", headers=headers, json=employee_payload())
    employee_user_id = created.json()["id"]

    self_manager = await client.patch(
        "/api/v1/employees/EMP-101",
        headers=headers,
        json={"manager_id": employee_user_id},
    )
    missing_manager = await client.patch(
        "/api/v1/employees/EMP-101",
        headers=headers,
        json={"manager_id": "00000000-0000-0000-0000-000000000001"},
    )

    assert self_manager.status_code == 409
    assert self_manager.json()["code"] == "INVALID_MANAGER"
    assert missing_manager.status_code == 409
    assert missing_manager.json()["code"] == "INVALID_MANAGER"
