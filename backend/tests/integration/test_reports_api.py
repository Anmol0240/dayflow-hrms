from app.models.user import User, UserRole
from sqlalchemy import update

PASSWORD = "SecurePassword123!"


async def account(client, application, email_sender, role="EMPLOYEE"):
    email = f"report-{role.lower()}@dayflow.dev"
    await client.post(
        "/api/v1/auth/signup",
        json={
            "employee_id": f"RPT-{role}",
            "full_name": "Report User",
            "email": email,
            "password": PASSWORD,
            "role": "EMPLOYEE",
        },
    )
    await client.post(
        "/api/v1/auth/verify-email", json={"token": email_sender.verification_tokens[email]}
    )
    if role != "EMPLOYEE":
        async with application.state.database.session_factory() as session:
            await session.execute(
                update(User).where(User.email == email).values(role=UserRole(role))
            )
            await session.commit()
    login = await client.post("/api/v1/auth/login", json={"email": email, "password": PASSWORD})
    return {"Authorization": f"Bearer {login.json()['access_token']}"}


async def test_dashboards_and_reports_use_database_aggregates(
    client, application, email_sender
) -> None:
    employee = await account(client, application, email_sender)
    admin = await account(client, application, email_sender, "ADMIN")
    await client.post("/api/v1/attendance/check-in", headers=employee)

    employee_dashboard = await client.get("/api/v1/dashboard/employee", headers=employee)
    admin_dashboard = await client.get("/api/v1/dashboard/admin", headers=admin)
    attendance = await client.get("/api/v1/reports/attendance", headers=admin)
    leave = await client.get("/api/v1/reports/leave", headers=admin)
    payroll = await client.get("/api/v1/reports/payroll", headers=admin)
    exported = await client.get("/api/v1/reports/export", headers=admin)
    forbidden = await client.get("/api/v1/reports/payroll", headers=employee)

    assert employee_dashboard.status_code == 200
    assert employee_dashboard.json()["checked_in_today"] is True
    assert admin_dashboard.status_code == 200
    assert admin_dashboard.json()["total_employees"] == 2
    assert admin_dashboard.json()["present_today"] == 1
    assert attendance.json()["present"] == 1
    assert leave.json()["pending"] == 0
    assert payroll.json()["record_count"] == 0
    assert exported.status_code == 200
    assert exported.headers["content-type"].startswith("text/csv")
    assert "work_duration_seconds" in exported.text
    assert forbidden.status_code == 403
