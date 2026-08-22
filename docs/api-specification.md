# API specification

Dayflow exposes JSON REST APIs under `/api/v1`. FastAPI publishes the authoritative OpenAPI schema at `/openapi.json` and interactive documentation at `/docs`.

## Conventions

- Bearer JWT access tokens protect APIs; renewal uses a rotating HTTP-only refresh cookie.
- Collections return `items` plus stable `page`, `page_size`, `total`, and `pages` metadata.
- Timestamps are ISO 8601; business dates use `YYYY-MM-DD`.
- Errors use `{ "detail", "code", "field_errors" }` and never expose stack traces.
- Role checks exist in dependencies and service methods; ownership checks occur in services.

## Authentication

`POST /auth/signup`, `/login`, `/refresh`, `/logout`, `/verify-email`, `/forgot-password`, `/reset-password`, and `GET /auth/me` implement registration, session renewal, verification, and recovery. Public signup cannot create Admin or HR accounts.

## HR endpoints

| Group | Endpoints | Authorization |
| --- | --- | --- |
| Employees | `GET/POST /employees`, `GET/PATCH/DELETE /employees/{employee_id}` | Admin/HR; role changes require Admin |
| Profile self-service | `GET/PATCH /employees/me` | Current user; picture, phone, address only |
| Attendance | `POST /attendance/check-in`, `/check-out`, `GET /attendance/me`, `/summary` | Current user, own scope |
| Attendance management | `GET /attendance`, `GET/PATCH /attendance/{record_id}` | Admin/HR; record GET also permits owner |
| Leave self-service | `POST /leave-requests`, `GET /leave-requests/me`, `GET /leave-requests/{id}`, `POST /{id}/cancel` | Current user, ownership enforced |
| Leave workflow | `GET /leave-requests`, `POST /leave-requests/{id}/approve`, `/{id}/reject` | Admin/HR |
| Payroll self-service | `GET /payroll/me` | Current user, read-only |
| Payroll management | `GET/POST /payroll`, `GET /payroll/{employee_id}`, `PATCH /payroll/{payroll_id}` | Admin/HR |
| Notifications | `GET /notifications`, `PATCH /notifications/{id}/read`, `/notifications/read-all` | Recipient scoped |
| Dashboards | `GET /dashboard/employee`, `/dashboard/admin` | Current user / Admin or HR |
| Reports | `GET /reports/attendance`, `/leave`, `/payroll`, `/export` | Admin/HR |

Attendance export is a downloadable CSV generated from stored records. Dashboard and report values use database aggregates rather than mocks.

## Health

`GET /health/live` confirms the process is serving. `GET /health/ready` executes a database ping and returns a safe `DATABASE_UNAVAILABLE` error on failure. All responses include `X-Request-ID`.
