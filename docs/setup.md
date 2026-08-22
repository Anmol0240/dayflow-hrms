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
```

On Windows PowerShell, activate the environment with `.venv\Scripts\Activate.ps1`.

Start the services in separate terminals:

```bash
python -m uvicorn app.main:app --app-dir backend --reload --port 8000
pnpm --dir frontend run dev
```

For SQLite fallback, set `DAYFLOW_DATABASE_URL=sqlite+aiosqlite:///./data/dayflow.db`.

## Docker Compose

```bash
docker compose up --build
docker compose down
```

The Compose stack exposes PostgreSQL on 5432, FastAPI on 8000, and the frontend on 5173. Replace the sample database password and JWT secret before using a shared host.

## Quality checks

```bash
python -m ruff check backend
python -m black --check backend
python -m pytest backend/tests
pnpm --dir frontend run lint
pnpm --dir frontend run format:check
pnpm --dir frontend run test
pnpm --dir frontend run build
```

## Migrations and seed data

These commands become operational after their implementation phases:

```bash
cd backend && python -m alembic upgrade head
python -m app.seed
```

## Troubleshooting

- If port 5432, 8000, or 5173 is in use, stop the conflicting service or adjust the port mapping.
- If PostgreSQL is unavailable, use the documented SQLite URL for non-production work.
- If browser API requests fail, verify `DAYFLOW_CORS_ORIGINS` and `VITE_API_BASE_URL` match the URLs actually in use.
- Node.js and Docker are external prerequisites; the repository does not install system software.
