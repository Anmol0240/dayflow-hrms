from __future__ import annotations

import asyncio
import os
from dataclasses import dataclass
from datetime import UTC, date, datetime, time, timedelta
from decimal import Decimal
from uuid import UUID, uuid5

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.database import Database
from app.core.security import hash_password
from app.models.attendance import AttendanceRecord, AttendanceStatus
from app.models.audit import AuditLog
from app.models.employee import EmployeeProfile, EmploymentType, Gender
from app.models.leave import LeaveRequest, LeaveStatus, LeaveType
from app.models.notification import Notification, NotificationType
from app.models.payroll import PayrollRecord
from app.models.user import User, UserRole
from app.schemas.auth import validate_password_strength

SEED_NAMESPACE = UUID("c3cedf6c-2c51-4d2d-a32e-188cd20c124a")


@dataclass(frozen=True)
class SeedPerson:
    employee_id: str
    full_name: str
    email: str
    role: UserRole
    department: str
    job_title: str
    gender: Gender
    date_of_birth: date
    joining_date: date
    phone: str
    address: str


def _id(entity: str, key: str) -> UUID:
    return uuid5(SEED_NAMESPACE, f"{entity}:{key}")


def _seed_people(admin_email: str, hr_email: str) -> tuple[SeedPerson, ...]:
    return (
        SeedPerson(
            "DF-ADMIN",
            "Dev Admin",
            admin_email,
            UserRole.ADMIN,
            "People Operations",
            "System Administrator",
            Gender.PREFER_NOT_TO_SAY,
            date(1988, 2, 14),
            date(2021, 1, 4),
            "+91-9000000001",
            "Bengaluru, Karnataka",
        ),
        SeedPerson(
            "DF-HR",
            "Mira Shah",
            hr_email,
            UserRole.HR,
            "People Operations",
            "HR Business Partner",
            Gender.FEMALE,
            date(1990, 7, 19),
            date(2022, 3, 7),
            "+91-9000000002",
            "Pune, Maharashtra",
        ),
        SeedPerson(
            "DF-1001",
            "Asha Rao",
            "asha.rao@dayflow.dev",
            UserRole.EMPLOYEE,
            "Engineering",
            "Senior Frontend Engineer",
            Gender.FEMALE,
            date(1994, 5, 8),
            date(2023, 2, 13),
            "+91-9000000011",
            "Bengaluru, Karnataka",
        ),
        SeedPerson(
            "DF-1002",
            "Kabir Mehta",
            "kabir.mehta@dayflow.dev",
            UserRole.EMPLOYEE,
            "Engineering",
            "Backend Engineer",
            Gender.MALE,
            date(1992, 11, 23),
            date(2022, 8, 1),
            "+91-9000000012",
            "Ahmedabad, Gujarat",
        ),
        SeedPerson(
            "DF-1003",
            "Isha Nair",
            "isha.nair@dayflow.dev",
            UserRole.EMPLOYEE,
            "Design",
            "Product Designer",
            Gender.FEMALE,
            date(1996, 3, 17),
            date(2024, 1, 8),
            "+91-9000000013",
            "Kochi, Kerala",
        ),
        SeedPerson(
            "DF-1004",
            "Arjun Singh",
            "arjun.singh@dayflow.dev",
            UserRole.EMPLOYEE,
            "Finance",
            "Financial Analyst",
            Gender.MALE,
            date(1991, 9, 4),
            date(2021, 11, 15),
            "+91-9000000014",
            "Gurugram, Haryana",
        ),
        SeedPerson(
            "DF-1005",
            "Neha Kulkarni",
            "neha.kulkarni@dayflow.dev",
            UserRole.EMPLOYEE,
            "Customer Success",
            "Customer Success Manager",
            Gender.FEMALE,
            date(1993, 12, 29),
            date(2023, 6, 5),
            "+91-9000000015",
            "Mumbai, Maharashtra",
        ),
    )


def _passwords() -> tuple[str, str, str]:
    admin = os.getenv("DAYFLOW_SEED_ADMIN_PASSWORD", "DayflowDemo123!")
    hr = os.getenv("DAYFLOW_SEED_HR_PASSWORD", "DayflowDemo123!")
    employee = os.getenv("DAYFLOW_SEED_EMPLOYEE_PASSWORD", "DayflowDemo123!")
    for password in (admin, hr, employee):
        validate_password_strength(password)
    return admin, hr, employee


async def _upsert_people(session: AsyncSession, people: tuple[SeedPerson, ...]) -> dict[str, User]:
    admin_password, hr_password, employee_password = _passwords()
    password_by_role = {
        UserRole.ADMIN: admin_password,
        UserRole.HR: hr_password,
        UserRole.EMPLOYEE: employee_password,
    }
    hashes = {
        role: await asyncio.to_thread(hash_password, password)
        for role, password in password_by_role.items()
    }
    users: dict[str, User] = {}
    for person in people:
        user = await session.scalar(
            select(User).where(
                or_(User.employee_id == person.employee_id, User.email == person.email.lower())
            )
        )
        if user is not None and user.employee_id != person.employee_id:
            raise RuntimeError(f"Seed email {person.email} belongs to another employee")
        if user is None:
            user = User(
                id=_id("user", person.employee_id),
                employee_id=person.employee_id,
                email=person.email.lower(),
                hashed_password=hashes[person.role],
                role=person.role,
                is_active=True,
                is_email_verified=True,
            )
            session.add(user)
        else:
            user.email = person.email.lower()
            user.hashed_password = hashes[person.role]
            user.role = person.role
            user.is_active = True
            user.is_email_verified = True

        profile = (
            user.profile
            if user.profile is not None
            else EmployeeProfile(
                id=_id("profile", person.employee_id), user_id=user.id, full_name=person.full_name
            )
        )
        if user.profile is None:
            user.profile = profile
        profile.full_name = person.full_name
        profile.phone = person.phone
        profile.address = person.address
        profile.date_of_birth = person.date_of_birth
        profile.gender = person.gender
        profile.department = person.department
        profile.job_title = person.job_title
        profile.employment_type = EmploymentType.FULL_TIME
        profile.joining_date = person.joining_date
        profile.emergency_contact = {
            "name": "Dayflow Emergency Contact",
            "phone": "+91-9111111111",
            "relationship": "Family",
        }
        users[person.employee_id] = user
    await session.flush()
    hr_id = users["DF-HR"].id
    for employee_id, user in users.items():
        if employee_id.startswith("DF-1"):
            user.profile.manager_id = hr_id
    return users


def _working_days(today: date, count: int) -> list[date]:
    days: list[date] = []
    cursor = today
    while len(days) < count:
        if cursor.weekday() < 5:
            days.append(cursor)
        cursor -= timedelta(days=1)
    return sorted(days)


async def _upsert_attendance(session: AsyncSession, users: dict[str, User], today: date) -> int:
    days = _working_days(today - timedelta(days=1), 10)
    leave_days = frozenset(days[-4:-2])
    count = 0
    for employee_index, employee_id in enumerate(f"DF-100{index}" for index in range(1, 6)):
        user = users[employee_id]
        for day_index, attendance_date in enumerate(days):
            status = AttendanceStatus.PRESENT
            if employee_id == "DF-1002" and attendance_date in leave_days:
                status = AttendanceStatus.LEAVE
            elif employee_index == 2 and day_index == 2:
                status = AttendanceStatus.ABSENT
            elif employee_index == 4 and day_index == 6:
                status = AttendanceStatus.HALF_DAY

            check_in = None
            check_out = None
            duration = 0
            if status in {AttendanceStatus.PRESENT, AttendanceStatus.HALF_DAY}:
                check_in = datetime.combine(attendance_date, time(9, 15), UTC)
                hours = 4 if status == AttendanceStatus.HALF_DAY else 8
                minutes = 0 if status == AttendanceStatus.HALF_DAY else 30
                check_out = check_in + timedelta(hours=hours, minutes=minutes)
                duration = int((check_out - check_in).total_seconds())

            record = await session.scalar(
                select(AttendanceRecord).where(
                    AttendanceRecord.employee_id == user.id,
                    AttendanceRecord.attendance_date == attendance_date,
                )
            )
            if record is None:
                record = AttendanceRecord(
                    id=_id("attendance", f"{employee_id}:{attendance_date.isoformat()}"),
                    employee_id=user.id,
                    attendance_date=attendance_date,
                )
                session.add(record)
            record.status = status
            record.check_in_time = check_in
            record.check_out_time = check_out
            record.work_duration = duration
            record.remarks = "Seeded development record"
            count += 1
    return count


async def _upsert_leave(
    session: AsyncSession, users: dict[str, User], today: date
) -> list[LeaveRequest]:
    recent_days = _working_days(today, 10)
    definitions = (
        (
            "pending",
            "DF-1001",
            LeaveType.PAID,
            today + timedelta(days=9),
            today + timedelta(days=10),
            LeaveStatus.PENDING,
            None,
            None,
        ),
        (
            "approved",
            "DF-1002",
            LeaveType.SICK,
            recent_days[-4],
            recent_days[-3],
            LeaveStatus.APPROVED,
            "Approved. Take care and recover well.",
            users["DF-HR"].id,
        ),
        (
            "rejected",
            "DF-1003",
            LeaveType.PAID,
            today + timedelta(days=14),
            today + timedelta(days=16),
            LeaveStatus.REJECTED,
            "Quarterly design review requires coverage on these dates.",
            users["DF-HR"].id,
        ),
        (
            "cancelled",
            "DF-1004",
            LeaveType.UNPAID,
            today + timedelta(days=20),
            today + timedelta(days=20),
            LeaveStatus.CANCELLED,
            None,
            None,
        ),
    )
    requests: list[LeaveRequest] = []
    for (
        key,
        employee_id,
        leave_type,
        start_date,
        end_date,
        status,
        comment,
        reviewer,
    ) in definitions:
        record_id = _id("leave", key)
        request = await session.get(LeaveRequest, record_id)
        if request is None:
            request = LeaveRequest(id=record_id, employee_id=users[employee_id].id)
            session.add(request)
        request.leave_type = leave_type
        request.start_date = start_date
        request.end_date = end_date
        request.number_of_days = (end_date - start_date).days + 1
        request.reason = {
            "pending": "Family event outside the city",
            "approved": "Medical recovery and rest",
            "rejected": "Personal travel",
            "cancelled": "Personal appointment",
        }[key]
        request.status = status
        request.employee_remarks = "Created as realistic development seed data"
        request.reviewer_comment = comment
        request.reviewed_by = reviewer
        request.reviewed_at = datetime.now(UTC) - timedelta(days=1) if reviewer else None
        requests.append(request)
    return requests


async def _upsert_payroll(session: AsyncSession, users: dict[str, User], today: date) -> int:
    effective_from = today.replace(day=1)
    count = 0
    for index, employee_id in enumerate(f"DF-100{value}" for value in range(1, 6)):
        basic = Decimal(70000 + index * 8500)
        allowances = (basic * Decimal("0.18")).quantize(Decimal("0.01"))
        deductions = (basic * Decimal("0.07")).quantize(Decimal("0.01"))
        record = await session.scalar(
            select(PayrollRecord).where(
                PayrollRecord.employee_id == users[employee_id].id,
                PayrollRecord.effective_from == effective_from,
            )
        )
        if record is None:
            record = PayrollRecord(
                id=_id("payroll", f"{employee_id}:{effective_from.isoformat()}"),
                employee_id=users[employee_id].id,
                effective_from=effective_from,
            )
            session.add(record)
        record.basic_salary = basic
        record.allowances = allowances
        record.deductions = deductions
        record.gross_salary = basic + allowances
        record.net_salary = record.gross_salary - deductions
        record.currency = "INR"
        record.payslip_url = f"https://example.invalid/payslips/{employee_id.lower()}.pdf"
        count += 1
    return count


async def _upsert_notifications(
    session: AsyncSession, users: dict[str, User], leave: list[LeaveRequest]
) -> int:
    definitions = (
        (
            "welcome-1001",
            "DF-1001",
            "Welcome to Dayflow",
            "Your employee workspace is ready.",
            NotificationType.SYSTEM,
            True,
        ),
        (
            "leave-1002",
            "DF-1002",
            "Leave request approved",
            "Your sick leave request was approved.",
            NotificationType.LEAVE,
            False,
        ),
        (
            "leave-1003",
            "DF-1003",
            "Leave request rejected",
            "Review HR's comment and choose different dates.",
            NotificationType.LEAVE,
            False,
        ),
        (
            "payroll-1004",
            "DF-1004",
            "Payroll updated",
            "Your latest salary record is available.",
            NotificationType.PAYROLL,
            False,
        ),
        (
            "payroll-1005",
            "DF-1005",
            "Payslip available",
            "Your latest payroll information is ready.",
            NotificationType.PAYROLL,
            True,
        ),
        (
            "pending-hr",
            "DF-HR",
            "Leave review needed",
            "Asha Rao submitted a pending leave request.",
            NotificationType.LEAVE,
            False,
        ),
    )
    for key, recipient, title, message, notification_type, is_read in definitions:
        record_id = _id("notification", key)
        notification = await session.get(Notification, record_id)
        if notification is None:
            notification = Notification(id=record_id, recipient_id=users[recipient].id)
            session.add(notification)
        notification.title = title
        notification.message = message
        notification.notification_type = notification_type.value
        notification.is_read = is_read

    for action, request in (("LEAVE_APPROVED", leave[1]), ("LEAVE_REJECTED", leave[2])):
        audit_id = _id("audit", action)
        audit = await session.get(AuditLog, audit_id)
        if audit is None:
            audit = AuditLog(id=audit_id, actor_id=users["DF-HR"].id)
            session.add(audit)
        audit.action = action
        audit.entity_type = "LeaveRequest"
        audit.entity_id = str(request.id)
        audit.metadata_ = {"source": "development_seed"}
    return len(definitions)


async def seed_database(settings: Settings | None = None) -> dict[str, int]:
    active_settings = settings or get_settings()
    if active_settings.environment not in {"development", "test"}:
        raise RuntimeError("Seed data is restricted to development and test environments")

    people = _seed_people(
        os.getenv("DAYFLOW_SEED_ADMIN_EMAIL", "admin@dayflow.dev").lower(),
        os.getenv("DAYFLOW_SEED_HR_EMAIL", "hr@dayflow.dev").lower(),
    )
    database = Database(active_settings)
    try:
        async with database.session_factory() as session, session.begin():
            users = await _upsert_people(session, people)
            attendance_count = await _upsert_attendance(session, users, date.today())
            leave = await _upsert_leave(session, users, date.today())
            payroll_count = await _upsert_payroll(session, users, date.today())
            notification_count = await _upsert_notifications(session, users, leave)
        return {
            "users": len(users),
            "attendance_records": attendance_count,
            "leave_requests": len(leave),
            "payroll_records": payroll_count,
            "notifications": notification_count,
        }
    finally:
        await database.dispose()


def main() -> None:
    counts = asyncio.run(seed_database())
    summary = ", ".join(f"{name}={count}" for name, count in counts.items())
    print(f"Dayflow development seed complete: {summary}")
