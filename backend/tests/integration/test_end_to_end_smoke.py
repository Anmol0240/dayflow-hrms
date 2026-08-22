from datetime import date, timedelta

from app.models.user import User, UserRole
from sqlalchemy import update

PASSWORD = "SecurePassword123!"


async def _register(client, email_sender, email: str, employee_id: str) -> None:
    response = await client.post(
        "/api/v1/auth/signup",
        json={
            "employee_id": employee_id,
            "full_name": "Smoke Test User",
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


async def _login(client, email: str) -> dict[str, str]:
    response = await client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


async def test_employee_admin_leave_approval_smoke(client, application, email_sender) -> None:
    employee_email = "smoke-employee@dayflow.dev"
    admin_email = "smoke-admin@dayflow.dev"
    await _register(client, email_sender, employee_email, "SMK-EMP")
    await _register(client, email_sender, admin_email, "SMK-ADM")
    async with application.state.database.session_factory() as session:
        await session.execute(
            update(User).where(User.email == admin_email).values(role=UserRole.ADMIN)
        )
        await session.commit()

    employee = await _login(client, employee_email)
    dashboard = await client.get("/api/v1/dashboard/employee", headers=employee)
    check_in = await client.post("/api/v1/attendance/check-in", headers=employee)
    start = date.today() + timedelta(days=30)
    leave = await client.post(
        "/api/v1/leave-requests",
        headers=employee,
        json={
            "leave_type": "PAID",
            "start_date": start.isoformat(),
            "end_date": (start + timedelta(days=1)).isoformat(),
            "reason": "End-to-end workflow verification",
            "employee_remarks": "Submitted by the smoke test",
        },
    )

    admin = await _login(client, admin_email)
    pending = await client.get("/api/v1/leave-requests?status=PENDING", headers=admin)
    approval = await client.post(
        f"/api/v1/leave-requests/{leave.json()['id']}/approve",
        headers=admin,
        json={"reviewer_comment": "Approved through the smoke workflow"},
    )

    updated = await client.get("/api/v1/leave-requests/me", headers=employee)
    notifications = await client.get("/api/v1/notifications", headers=employee)

    assert dashboard.status_code == 200
    assert dashboard.json()["full_name"] == "Smoke Test User"
    assert check_in.status_code == 201
    assert leave.status_code == 201
    assert pending.status_code == 200
    assert any(item["id"] == leave.json()["id"] for item in pending.json()["items"])
    assert approval.status_code == 200
    assert approval.json()["status"] == "APPROVED"
    assert updated.status_code == 200
    assert updated.json()["items"][0]["status"] == "APPROVED"
    assert notifications.status_code == 200
    assert any(
        item["notification_type"] == "LEAVE" and "approved" in item["title"].lower()
        for item in notifications.json()["items"]
    )
