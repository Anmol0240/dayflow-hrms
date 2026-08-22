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

## Implemented identity schema

### `users`

Stores UUID identity, unique normalized `employee_id` and `email`, Argon2 password hash, constrained `ADMIN`/`HR`/`EMPLOYEE` role, activation state, email-verification state, and timestamps.

### `employee_profiles`

Currently stores the one-to-one user relationship and required signup `full_name`. Phase 5 extends the same normalized table with personal and employment profile fields and APIs.

### `refresh_tokens`

Stores only a unique SHA-256 token hash, owning user, creation/expiry/revocation timestamps, and the replacement token reference used to track rotation. User deletion cascades to tokens.

### `one_time_tokens`

Stores hashed email-verification and password-reset tokens with a constrained purpose, expiry, consumption timestamp, and owning user. Purpose/user and expiry indexes support validation and cleanup.

## Key invariants

- Employee IDs and normalized email addresses are unique.
- Profile ownership is one-to-one; manager references cannot silently orphan records.
- Attendance has a unique `(employee_id, attendance_date)` constraint.
- Leave end dates cannot precede start dates; services prevent approved overlaps transactionally.
- Salary components are non-negative and derived totals are calculated consistently.
- Foreign keys and indexes support recipient, employee, date, status, department, and effective-date query paths.
- All mutable domain rows have UTC `created_at` and `updated_at` timestamps.

## Migration foundation

`app.core.database.Base` is the shared declarative base. Its metadata applies deterministic Alembic naming conventions for primary keys, foreign keys, unique constraints, checks, and indexes. Reusable mixins provide UUID primary keys and database-generated timezone-aware creation/update timestamps.

The Alembic environment reads `DAYFLOW_DATABASE_URL`, imports model metadata, compares column types and server defaults, and enables batch rendering for SQLite compatibility. There are no domain revisions yet because Phase 3 intentionally contains no domain tables.

The identity columns and constraints are authoritative in migration `4b2cbe54bdc2`. Remaining HR entities and the expanded profile schema will be documented with their Phase 5 models and migrations. The migration history—not ORM auto-creation—remains authoritative.
