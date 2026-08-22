# Dayflow

Dayflow is a production-oriented Human Resource Management System monorepo. The current revision includes the complete backend domain API and the data-backed React experience for authentication, employee and HR dashboards, profiles, attendance, leave, payroll, notifications, and reports.

## Implemented capabilities

- Secure authentication and defense-in-depth role authorization for Admin/HR and Employee users
- Employee onboarding and profile management with separate self-service and HR permissions
- Attendance check-in/out, personal history, summaries, and HR corrections
- Leave application, cancellation, filtering, approval/rejection comments, and decision notifications
- Private employee payroll access and HR-managed salary records with server-calculated totals
- Live employee and HR dashboards, notifications, Recharts analytics, and authenticated CSV export
- Responsive role-specific navigation, accessible forms/dialogs, loading/empty/error states, and toasts
- FastAPI REST API with PostgreSQL in production and a SQLite development/test fallback
- Responsive React client with accessible components and server-state management

## Architecture and stack

- **Frontend:** React, TypeScript, Vite, React Router, Tailwind CSS, TanStack Query, React Hook Form, Zod, Recharts, and Lucide
- **Backend:** Python, FastAPI, SQLAlchemy 2, Alembic, Pydantic 2, PostgreSQL, JWT authentication, and Pytest
- **Tooling:** Docker Compose, ESLint, Prettier, Ruff, Black, Pytest, Playwright, and Make

See [docs/architecture.md](docs/architecture.md) for boundaries and dependency rules.

## Repository layout

```text
frontend/   React client and frontend tests
backend/    FastAPI service, migrations, and backend tests
docs/       Architecture, API, database, and setup documentation
scripts/    Portable developer workflow helpers
```

## Prerequisites

- Node.js 22.12+ with Corepack/pnpm 11
- Python 3.12+
- PostgreSQL 17+ for production-like development, or SQLite for a lightweight local run
- Docker Engine with Docker Compose (optional)

## Quick start

1. Copy `.env.example` to `.env` and replace every development secret before using a shared environment.
2. Follow [docs/setup.md](docs/setup.md) for local or Docker setup.
3. Start the API and client in separate terminals.

```bash
make install
make dev-backend
make dev-frontend
```

The frontend defaults to <http://localhost:5173>. The API defaults to <http://localhost:8000>, with OpenAPI documentation at <http://localhost:8000/docs>.

The browser keeps access JWTs only in memory. Session restoration and renewal use the backend's rotating HTTP-only refresh cookie; Dayflow does not persist authentication tokens in browser storage.

## Common commands

```bash
make install          # install backend and frontend dependencies
make lint             # run backend and frontend static checks
make test             # run backend and frontend tests
make build            # create the frontend production bundle
make migrate          # apply Alembic migrations
make seed             # load development seed data
make test-e2e         # run the real browser employee/Admin smoke workflow
docker compose up --build
```

Alembic migrations, idempotent development seeding, backend tests, frontend interaction tests, a Playwright browser smoke workflow, and production bundling are operational.

## Environment variables

All supported variables and safe development examples are listed in `.env.example`. Secrets must never be committed. Production deployments must provide a strong JWT secret, restricted CORS origins, secure cookie settings, and a PostgreSQL connection string.

## Development credentials

After `make migrate && make seed`, the default dummy accounts are:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@dayflow.dev` | `DayflowDemo123!` |
| HR | `hr@dayflow.dev` | `DayflowDemo123!` |
| Employee | `asha.rao@dayflow.dev` | `DayflowDemo123!` |

Four additional Employee accounts are seeded for realistic dashboards and reports. Every credential is configurable through the `DAYFLOW_SEED_*` environment variables. The seed command is restricted to development and test environments; never reuse these dummy values on a shared or production deployment.

## Status and known limitations

Phases 1–9 are complete. The complete migration chain and idempotent seed were rehearsed from a clean SQLite database. Automated coverage includes backend domain/integration tests, frontend component and route tests, and a real-browser Employee-to-Admin leave approval workflow. Route-level code splitting keeps Recharts and feature screens out of the initial bundle. Docker Compose applies migrations through a one-shot service before starting the API, but Docker execution cannot be verified on hosts without Docker installed. Development email delivery remains an abstraction; production deployments must provide a real mail or queue adapter. Internet-facing deployments should also provide distributed rate limiting at the gateway or service layer.

## Future enhancements

- SSO/OIDC and multi-factor authentication
- Configurable leave policies and holiday calendars
- Payroll provider integrations and signed payslips
- Event-driven notifications and scheduled reports
- Multi-tenant organization support
