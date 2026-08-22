from app.models.user import User, UserRole
from sqlalchemy import update

PASSWORD = "SecurePassword123!"


async def account(client, email_sender, application, email, employee_id, role="EMPLOYEE"):
    await client.post(
        "/api/v1/auth/signup",
        json={
            "employee_id": employee_id,
            "full_name": "Leave User",
            "email": email,
            "password": PASSWORD,
            "role": "EMPLOYEE",
        },
    )
    await client.post(
        "/api/v1/auth/verify-email",
        json={"token": email_sender.verification_tokens[email]},
    )
    if role != "EMPLOYEE":
        async with application.state.database.session_factory() as session:
            await session.execute(
                update(User).where(User.email == email).values(role=UserRole(role))
            )
            await session.commit()
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


def leave_payload(start="2026-09-01", end="2026-09-03"):
    return {
        "leave_type": "PAID",
        "start_date": start,
        "end_date": end,
        "reason": "Family commitment",
        "employee_remarks": "Available by phone",
    }


async def test_leave_creation_calculates_days_and_validates_range(
    client, application, email_sender
) -> None:
    employee = await account(client, email_sender, application, "leave@dayflow.dev", "LEV-001")
    created = await client.post("/api/v1/leave-requests", headers=employee, json=leave_payload())
    invalid = await client.post(
        "/api/v1/leave-requests",
        headers=employee,
        json=leave_payload("2026-09-03", "2026-09-01"),
    )
    own = await client.get("/api/v1/leave-requests/me", headers=employee)

    assert created.status_code == 201
    assert created.json()["number_of_days"] == 3
    assert created.json()["status"] == "PENDING"
    assert invalid.status_code == 422
    assert own.json()["pagination"]["total"] == 1


async def test_admin_approval_rejection_and_nonpending_protection(
    client, application, email_sender
) -> None:
    employee = await account(client, email_sender, application, "leave@dayflow.dev", "LEV-001")
    admin = await account(
        client, email_sender, application, "leave-admin@dayflow.dev", "LEV-ADM", "ADMIN"
    )
    first = await client.post("/api/v1/leave-requests", headers=employee, json=leave_payload())
    second = await client.post(
        "/api/v1/leave-requests",
        headers=employee,
        json=leave_payload("2026-10-01", "2026-10-01"),
    )

    approved = await client.post(
        f"/api/v1/leave-requests/{first.json()['id']}/approve",
        headers=admin,
        json={"reviewer_comment": "Approved"},
    )
    second_rejected = await client.post(
        f"/api/v1/leave-requests/{second.json()['id']}/reject",
        headers=admin,
        json={"reviewer_comment": "Project deadline"},
    )
    repeat = await client.post(
        f"/api/v1/leave-requests/{first.json()['id']}/reject",
        headers=admin,
        json={"reviewer_comment": "Changed"},
    )

    assert approved.status_code == 200
    assert approved.json()["status"] == "APPROVED"
    assert second_rejected.status_code == 200
    assert second_rejected.json()["status"] == "REJECTED"
    assert repeat.status_code == 409
    assert repeat.json()["code"] == "LEAVE_NOT_PENDING"


async def test_overlapping_approved_leave_is_prevented(client, application, email_sender) -> None:
    employee = await account(client, email_sender, application, "leave@dayflow.dev", "LEV-001")
    admin = await account(
        client, email_sender, application, "leave-admin@dayflow.dev", "LEV-ADM", "ADMIN"
    )
    first = await client.post("/api/v1/leave-requests", headers=employee, json=leave_payload())
    overlap = await client.post(
        "/api/v1/leave-requests",
        headers=employee,
        json=leave_payload("2026-09-02", "2026-09-04"),
    )
    await client.post(
        f"/api/v1/leave-requests/{first.json()['id']}/approve", headers=admin, json={}
    )
    response = await client.post(
        f"/api/v1/leave-requests/{overlap.json()['id']}/approve", headers=admin, json={}
    )

    assert response.status_code == 409
    assert response.json()["code"] == "OVERLAPPING_APPROVED_LEAVE"
