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
