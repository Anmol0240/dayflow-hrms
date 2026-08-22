.PHONY: install install-backend install-frontend dev-backend dev-frontend lint format test test-e2e build migrate seed

install: install-backend install-frontend

install-backend:
	python -m pip install -e "./backend[dev]"

install-frontend:
	corepack enable
	pnpm --dir frontend install --frozen-lockfile

dev-backend:
	python -m uvicorn app.main:app --app-dir backend --reload --port 8000

dev-frontend:
	pnpm --dir frontend run dev

lint:
	python -m ruff check backend
	python -m black --check backend
	pnpm --dir frontend run lint
	pnpm --dir frontend run format:check

format:
	python -m ruff check --fix backend
	python -m black backend
	pnpm --dir frontend run format

test:
	python -m pytest backend/tests
	pnpm --dir frontend run test

test-e2e:
	pnpm --dir frontend run test:e2e

build:
	pnpm --dir frontend run build

migrate:
	cd backend && python -m alembic upgrade head

seed:
	cd backend && python -m app.seed
