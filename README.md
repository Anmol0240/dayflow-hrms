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

- Node.js 22.12+ with Corepack and pnpm 11.19.0
- Python 3.12+
- PostgreSQL 17+ for production-like development, or SQLite for a lightweight local run
- Docker Engine with Docker Compose (optional)

## Run locally on Windows with SQLite

Run these commands from PowerShell. SQLite is the simplest local option and does not require Docker or PostgreSQL.

### 1. Configure the environment

```powershell
cd D:\Dayflow
Copy-Item .env.example .env
```

In `.env`, set the development database URL to:

```env
DAYFLOW_DATABASE_URL=sqlite+aiosqlite:///./data/dayflow.db
```

Do not commit `.env`; it is already excluded by `.gitignore`.

### 2. Install dependencies

```powershell
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1

python -m pip install --upgrade pip
python -m pip install -e ".\backend[dev]"

corepack install --global pnpm@11.19.0
corepack enable pnpm
pnpm --version
pnpm --dir frontend install --frozen-lockfile
```

`pnpm --version` must print `11.19.0`. With older Corepack releases, use `corepack prepare pnpm@11.19.0 --activate` instead.

### 3. Initialize and seed the database

```powershell
New-Item -ItemType Directory -Force data

Push-Location backend
python -m alembic upgrade head
python -m app.seed
Pop-Location
```

The seed command is safe to rerun and creates verified Admin, HR, and Employee development accounts.

### 4. Start the backend

Open the first PowerShell terminal:

```powershell
cd D:\Dayflow
.\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

Wait for `Application startup complete` before starting the frontend.

### 5. Start the frontend

Open a second PowerShell terminal:

```powershell
cd D:\Dayflow
$env:VITE_API_BASE_URL="http://localhost:8000/api/v1"
pnpm --dir frontend run dev
```

Open the following URLs:

- Dayflow: <http://localhost:5173>
- API documentation: <http://localhost:8000/docs>
- API readiness: <http://localhost:8000/api/v1/health/ready>

Keep both terminals open while using Dayflow. Press `Ctrl+C` in each terminal to stop the services.

## Run with Docker and PostgreSQL

After installing Docker Desktop and creating `.env` from `.env.example`:

```powershell
cd D:\Dayflow
docker compose up --build
docker compose exec backend python -m app.seed
```

Compose applies Alembic migrations before starting the API. Stop the stack with `docker compose down`.

The browser keeps access JWTs only in memory. Session restoration and renewal use the backend's rotating HTTP-only refresh cookie; Dayflow does not persist authentication tokens in browser storage.

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
