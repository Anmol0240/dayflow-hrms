# Database schema

PostgreSQL is the production database. SQLite is supported for local development and automated tests. UUID primary keys, deterministic constraint names, foreign keys, indexes, and UTC timestamps are shared across both engines.

## Identity and profiles

- `users` stores unique normalized employee IDs and emails, Argon2 password hashes, constrained roles, activation, verification, and timestamps.
- `employee_profiles` is a one-to-one extension containing personal and employment data, optional manager, and emergency contact JSON. Department, joining date, and manager are indexed.
- `refresh_tokens` stores only token hashes, expiry/revocation state, and rotation links.
- `one_time_tokens` stores hashed, expiring, single-use verification and password-reset tokens.

## HR domains

- `attendance_records` stores one row per employee/business date. Unique `(employee_id, attendance_date)` prevents duplicate check-ins. Check-out requires check-in; work duration is non-negative seconds.
- `leave_requests` stores inclusive date ranges, calculated days, constrained type/status, employee remarks, and reviewer decisions. The database validates date order; services serialize decisions and prevent approved overlaps.
- `payroll_records` stores effective-dated fixed-precision salary components, derived gross/net totals, ISO currency, and optional payslip URL. Monetary fields are non-negative and `(employee_id, effective_from)` is unique.
- `notifications` stores recipient-scoped messages and read state. Leave decisions and payroll publication create notifications in the same transaction.
- `audit_logs` preserves actor, action, entity, JSON metadata, and time for leave decisions and payroll changes. Actor deletion nulls the reference without deleting the event.

## Key invariants

- Employee IDs and normalized emails are unique.
- Employee self-service schemas cannot mutate employment or identity fields.
- Manager references must identify an active account and cannot reference self.
- Attendance check-in uniqueness is enforced by both service logic and a database constraint.
- Leave end dates cannot precede start dates; only pending requests may be decided or cancelled.
- Payroll uses `Numeric(14, 2)`; gross is basic plus allowances and net is gross minus deductions.
- Foreign-key deletion behavior is explicit: owned operational data cascades, reviewer/manager/audit actor references become null.

## Migration chain

The authoritative Alembic chain is:

1. `4b2cbe54bdc2` — identity and authentication
2. `93972583a7c4` — expanded employee profiles
3. `d30018a7321b` — attendance records
4. `2f6b7418ebe9` — leave, payroll, notifications, and audit logs

Alembic compares types, server defaults, and named checks. SQLite uses batch migrations; PostgreSQL remains the production target.

## Development seed

`python -m app.seed` loads deterministic, idempotent development/test records using stable identifiers and conflict-aware upserts. It validates seed password strength and refuses staging or production environments. Seeded attendance deliberately ends on the previous business day so an Employee can exercise today's check-in workflow after setup.
