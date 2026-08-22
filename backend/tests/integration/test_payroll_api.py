from app.models.user import User, UserRole
from sqlalchemy import update

PASSWORD = "SecurePassword123!"


async def admin(client, application, email_sender):
    email = "pay-admin@dayflow.dev"
    await client.post(
        "/api/v1/auth/signup",
        json={
            "employee_id": "PAY-ADM",
            "full_name": "Payroll Admin",
            "email": email,
            "password": PASSWORD,
            "role": "EMPLOYEE",
        },
    )
    await client.post(
        "/api/v1/auth/verify-email", json={"token": email_sender.verification_tokens[email]}
    )
    async with application.state.database.session_factory() as session:
        await session.execute(update(User).where(User.email == email).values(role=UserRole.ADMIN))
        await session.commit()
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


async def setup_employee(client, headers):
    response = await client.post(
        "/api/v1/employees",
        headers=headers,
        json={
            "employee_id": "PAY-001",
            "full_name": "Payroll Employee",
            "email": "payroll@dayflow.dev",
            "password": PASSWORD,
            "role": "EMPLOYEE",
        },
    )
    return response.json()


async def test_payroll_calculation_and_employee_access_isolation(
    client, application, email_sender
) -> None:
    admin_headers = await admin(client, application, email_sender)
    employee = await setup_employee(client, admin_headers)
    created = await client.post(
        "/api/v1/payroll",
        headers=admin_headers,
        json={
            "employee_id": employee["id"],
            "effective_from": "2026-08-01",
            "basic_salary": "80000.00",
            "allowances": "10000.00",
            "deductions": "5000.00",
            "currency": "inr",
        },
    )
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "payroll@dayflow.dev", "password": PASSWORD},
    )
    employee_headers = {"Authorization": f"Bearer {login.json()['access_token']}"}
    own = await client.get("/api/v1/payroll/me", headers=employee_headers)
    notifications = await client.get("/api/v1/notifications", headers=employee_headers)
    notification_id = notifications.json()["items"][0]["id"]
    marked_read = await client.patch(
        f"/api/v1/notifications/{notification_id}/read", headers=employee_headers
    )
    all_records = await client.get("/api/v1/payroll", headers=employee_headers)
    create_attempt = await client.post(
        "/api/v1/payroll",
        headers=employee_headers,
        json={
            "employee_id": employee["id"],
            "effective_from": "2026-09-01",
            "basic_salary": 1,
        },
    )

    assert created.status_code == 201
    assert created.json()["gross_salary"] == "90000.00"
    assert created.json()["net_salary"] == "85000.00"
    assert created.json()["currency"] == "INR"
    assert own.status_code == 200
    assert own.json()["pagination"]["total"] == 1
    assert notifications.status_code == 200
    assert notifications.json()["unread_count"] == 1
    assert marked_read.status_code == 200
    assert marked_read.json()["is_read"] is True
    assert all_records.status_code == 403
    assert create_attempt.status_code == 403


async def test_negative_and_invalid_net_salary_are_rejected(
    client, application, email_sender
) -> None:
    headers = await admin(client, application, email_sender)
    employee = await setup_employee(client, headers)
    negative = await client.post(
        "/api/v1/payroll",
        headers=headers,
        json={
            "employee_id": employee["id"],
            "effective_from": "2026-08-01",
            "basic_salary": -1,
        },
    )
    excessive = await client.post(
        "/api/v1/payroll",
        headers=headers,
        json={
            "employee_id": employee["id"],
            "effective_from": "2026-08-01",
            "basic_salary": 100,
            "deductions": 101,
        },
    )
    assert negative.status_code == 422
    assert excessive.status_code == 409
    assert excessive.json()["code"] == "INVALID_SALARY"
