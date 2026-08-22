# API specification

Dayflow exposes JSON REST APIs under `/api/v1`. FastAPI will publish the authoritative OpenAPI schema at `/openapi.json` and interactive documentation at `/docs`.

## Conventions

- Authentication uses a bearer access token; token renewal uses a secure HTTP-only cookie.
- Collection endpoints use explicit pagination and return stable metadata.
- Timestamps are ISO 8601 UTC values; business dates use `YYYY-MM-DD`.
- Mutations return the resulting resource where useful and use standard HTTP status codes.
- The common error shape is:

```json
{
  "detail": "Human-readable error message",
  "code": "ERROR_CODE",
  "field_errors": {}
}
```

## Planned endpoint groups

| Group | Prefix | Access |
| --- | --- | --- |
| Authentication | `/api/v1/auth` | Public and authenticated |
| Dashboards | `/api/v1/dashboard` | Role-specific |
| Employees | `/api/v1/employees` | Self-service or Admin/HR |
| Attendance | `/api/v1/attendance` | Self-service or Admin/HR |
| Leave | `/api/v1/leave-requests` | Self-service and approval workflow |
| Payroll | `/api/v1/payroll` | Self read-only or Admin/HR |
| Notifications | `/api/v1/notifications` | Recipient-scoped |
| Reports | `/api/v1/reports` | Admin/HR |

Detailed request and response schemas will be added alongside each implemented module so this document never advertises fake endpoints.

## Implemented foundation endpoints

### `GET /api/v1/health/live`

Confirms that the API process can serve requests. It does not access the database and returns the service name and application version.

### `GET /api/v1/health/ready`

Executes `SELECT 1` through the configured async SQLAlchemy engine. It returns HTTP 200 with `database: reachable`, or HTTP 503 with code `DATABASE_UNAVAILABLE`. These endpoints are public and intended for orchestrator health checks; they expose no configuration or credentials.

All responses include `X-Request-ID`. A safe caller-supplied value is preserved; missing or malformed values are replaced.

## Implemented authentication endpoints

| Method | Path | Behavior |
| --- | --- | --- |
| POST | `/api/v1/auth/signup` | Creates an unverified Employee account; privileged public roles are rejected |
| POST | `/api/v1/auth/login` | Verifies credentials and account state, returns an access JWT, and sets a refresh cookie |
| POST | `/api/v1/auth/refresh` | Rotates the refresh token and returns a renewed access JWT |
| POST | `/api/v1/auth/logout` | Revokes the presented refresh token and clears its cookie |
| GET | `/api/v1/auth/me` | Returns the active, verified user represented by a bearer access token |
| POST | `/api/v1/auth/verify-email` | Consumes a single-use email-verification token |
| POST | `/api/v1/auth/forgot-password` | Returns a non-enumerating accepted response and requests reset delivery when eligible |
| POST | `/api/v1/auth/reset-password` | Consumes a reset token, changes the password, and revokes active refresh tokens |

Access tokens are returned only in response bodies and should be held in memory by browser clients. Refresh tokens are never returned in JSON; they use an HTTP-only cookie scoped to `/api/v1/auth`. Authentication failures use `WWW-Authenticate: Bearer` and the standard error envelope.
