# Database schema

PostgreSQL is the production database. SQLite is supported for local development and tests where PostgreSQL-specific behavior is not required.

## Planned normalized entities

- `users`: identity, employee ID, email, password hash, role, activation and verification state
- `employee_profiles`: one-to-one employment and personal profile data for a user
- `attendance_records`: one record per employee and attendance date
- `leave_requests`: dated employee requests and reviewer decisions
- `payroll_records`: effective-dated salary components and payslip reference
- `notifications`: recipient-scoped user messages and read state
- `audit_logs`: immutable actor/action metadata for sensitive changes

## Key invariants

- Employee IDs and normalized email addresses are unique.
- Profile ownership is one-to-one; manager references cannot silently orphan records.
- Attendance has a unique `(employee_id, attendance_date)` constraint.
- Leave end dates cannot precede start dates; services prevent approved overlaps transactionally.
- Salary components are non-negative and derived totals are calculated consistently.
- Foreign keys and indexes support recipient, employee, date, status, department, and effective-date query paths.
- All mutable domain rows have UTC `created_at` and `updated_at` timestamps.

The exact columns, relationships, constraint names, and indexes will be documented with the Phase 5 SQLAlchemy models and Alembic migrations. The migration history—not ORM auto-creation—will be authoritative.
