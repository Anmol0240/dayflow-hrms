from typing import Protocol

from app.models.user import User, UserRole
from fastapi import FastAPI
from httpx import AsyncClient
from sqlalchemy import update

PASSWORD = "SecurePassword123!"


class CapturedEmail(Protocol):
    verification_tokens: dict[str, str]


async def identity(
    client: AsyncClient,
    email_sender: CapturedEmail,
    *,
    email: str = "attendance@dayflow.dev",
    employee_id: str = "ATT-001",
) -> dict[str, str]:
    signup = await client.post(
        "/api/v1/auth/signup",
        json={
            "employee_id": employee_id,
            "full_name": "Attendance User",
            "email": email,
            "password": PASSWORD,
            "role": "EMPLOYEE",
        },
    )
    assert signup.status_code == 201
    await client.post(
        "/api/v1/auth/verify-email",
        json={"token": email_sender.verification_tokens[email]},
    )
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


async def test_check_in_duplicate_check_in_and_check_out(client, email_sender) -> None:
    headers = await identity(client, email_sender)

    check_in = await client.post("/api/v1/attendance/check-in", headers=headers)
    duplicate = await client.post("/api/v1/attendance/check-in", headers=headers)
    check_out = await client.post("/api/v1/attendance/check-out", headers=headers)
    duplicate_out = await client.post("/api/v1/attendance/check-out", headers=headers)

    assert check_in.status_code == 201
    assert duplicate.status_code == 409
    assert duplicate.json()["code"] == "DUPLICATE_CHECK_IN"
    assert check_out.status_code == 200
    assert check_out.json()["check_out_time"] is not None
    assert check_out.json()["work_duration"] >= 0
    assert duplicate_out.status_code == 409
    assert duplicate_out.json()["code"] == "DUPLICATE_CHECK_OUT"


async def test_checkout_before_checkin_is_rejected(client, email_sender) -> None:
    headers = await identity(client, email_sender)
    response = await client.post("/api/v1/attendance/check-out", headers=headers)
    assert response.status_code == 409
    assert response.json()["code"] == "CHECK_IN_REQUIRED"


async def test_employee_sees_only_own_attendance(client, email_sender) -> None:
    first = await identity(client, email_sender)
    await client.post("/api/v1/attendance/check-in", headers=first)
    second = await identity(
        client,
        email_sender,
        email="attendance2@dayflow.dev",
        employee_id="ATT-002",
    )
    own = await client.get("/api/v1/attendance/me", headers=second)
    all_records = await client.get("/api/v1/attendance", headers=second)
    assert own.status_code == 200
    assert own.json()["pagination"]["total"] == 0
    assert all_records.status_code == 403


async def test_admin_can_list_and_correct_attendance(
    client: AsyncClient,
    application: FastAPI,
    email_sender: CapturedEmail,
) -> None:
    headers = await identity(client, email_sender)
    checked_in = await client.post("/api/v1/attendance/check-in", headers=headers)
    async with application.state.database.session_factory() as session:
        await session.execute(
            update(User).where(User.email == "attendance@dayflow.dev").values(role=UserRole.ADMIN)
        )
        await session.commit()
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "attendance@dayflow.dev", "password": PASSWORD},
    )
    admin = {"Authorization": f"Bearer {login.json()['access_token']}"}

    listed = await client.get("/api/v1/attendance", headers=admin)
    corrected = await client.patch(
        f"/api/v1/attendance/{checked_in.json()['id']}",
        headers=admin,
        json={"status": "HALF_DAY", "remarks": "Approved correction"},
    )
    summary = await client.get("/api/v1/attendance/summary", headers=admin)

    assert listed.status_code == 200
    assert listed.json()["pagination"]["total"] == 1
    assert corrected.status_code == 200
    assert corrected.json()["status"] == "HALF_DAY"
    assert summary.status_code == 200
    assert summary.json()["half_day"] == 1
