# Setup guide

## Local development

1. Install Python 3.12+, Node.js 22.12+, and PostgreSQL 17+.
2. Copy `.env.example` to `.env` and update secrets.
3. Create and activate a Python virtual environment.
4. Enable Corepack and install dependencies.

```bash
python -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -e "./backend[dev]"
corepack enable
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend exec playwright install chromium
```

On Windows PowerShell, activate the environment with `.venv\Scripts\Activate.ps1`.

Start the services in separate terminals:

```bash
python -m uvicorn app.main:app --app-dir backend --reload --port 8000
pnpm --dir frontend run dev
```

For SQLite fallback, set `DAYFLOW_DATABASE_URL=sqlite+aiosqlite:///./data/dayflow.db`.

Verify the running backend:

```bash
curl http://localhost:8000/api/v1/health/live
curl http://localhost:8000/api/v1/health/ready
```

Public signup creates an unverified Employee account. Development email delivery is intentionally an abstraction and does not log secret tokens; automated tests replace it with an in-memory capture adapter. The seed command creates verified Admin, HR, and Employee accounts for local development.

## Docker Compose

```bash
docker compose up --build
docker compose exec backend python -m app.seed
docker compose down
```

The Compose stack applies Alembic migrations through a one-shot `migrate` service before FastAPI starts, then exposes PostgreSQL on 5432, FastAPI on 8000, and the frontend on 5173. Run `docker compose run --rm migrate` to apply migrations independently. Replace the sample database password and JWT secret before using a shared host.

## Quality checks

```bash
python -m ruff check backend
python -m black --check backend
python -m pytest backend/tests
pnpm --dir frontend run lint
pnpm --dir frontend run format:check
pnpm --dir frontend run test
pnpm --dir frontend run test:e2e
pnpm --dir frontend run build
```

## Migrations and seed data

Apply the complete Alembic migration chain before starting Dayflow, then load the idempotent development dataset if desired:

```bash
cd backend && python -m alembic upgrade head
python -m alembic check
python -m app.seed
```

The seed creates one Admin, one HR account, five Employees, 50 recent attendance records, pending/approved/rejected/cancelled leave requests, payroll, notifications, and representative audit events. It can be rerun safely and refuses staging or production environments.

Default dummy credentials are `admin@dayflow.dev`, `hr@dayflow.dev`, and `asha.rao@dayflow.dev`, all using `DayflowDemo123!`. Override them through the `DAYFLOW_SEED_*` variables before seeding.

The browser smoke test starts isolated temporary backend/frontend servers and a fresh SQLite database, then removes the database after the test run. It signs in as an Employee, opens the dashboard, checks in, applies for leave, signs in as Admin, approves the request, and verifies the Employee sees the approved status. Set `DAYFLOW_E2E_BROWSER_CHANNEL=msedge` to use an installed Edge browser or install Playwright Chromium with the command above. `DAYFLOW_E2E_PYTHON` and `DAYFLOW_E2E_PNPM` can point to nonstandard executables.

## Troubleshooting

- If port 5432, 8000, or 5173 is in use, stop the conflicting service or adjust the port mapping.
- If PostgreSQL is unavailable, use the documented SQLite URL for non-production work.
- If browser API requests fail, verify `DAYFLOW_CORS_ORIGINS` and `VITE_API_BASE_URL` match the URLs actually in use.
- Node.js and Docker are external prerequisites; the repository does not install system software.
- If Playwright cannot find a browser, install Chromium or set `DAYFLOW_E2E_BROWSER_CHANNEL` to an installed Chrome/Edge channel.
- A readiness failure with `DATABASE_UNAVAILABLE` means the API is running but cannot open a database connection; verify the URL, credentials, host, and migration service.
