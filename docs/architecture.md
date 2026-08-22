# Dayflow architecture

## Architectural style

Dayflow is a modular monorepo with a React single-page application and a versioned FastAPI REST service. PostgreSQL is authoritative in production; SQLite is a supported development and test fallback. The design uses feature-oriented frontend modules and layered backend modules so that transport, business rules, and persistence can evolve independently.

```text
Browser -> React UI -> typed API client -> FastAPI endpoints
                                      -> services -> repositories -> database
                                                   -> notifications/audit
```

Authorization is defense in depth: the frontend hides inaccessible navigation, API dependencies authenticate and check coarse-grained roles, services enforce business permissions and state transitions, and repository queries remain scoped to the acting user where applicable.

## Main directories

### `frontend/`

The browser application. `src/app` owns composition, routing, and global providers. `src/features` contains domain modules such as authentication, attendance, and leave. Shared visual primitives live under `src/components`; cross-feature hooks, utilities, types, and global styles have dedicated directories. `tests` contains frontend test setup and integration-oriented component tests.

### `backend/`

The Python service. `app/api` is the HTTP boundary and keeps route handlers thin. `app/schemas` defines external request/response contracts. `app/services` holds authorization-aware workflows and business invariants. `app/repositories` owns database queries. `app/models` contains SQLAlchemy mappings. `app/core` contains settings, database lifecycle, security primitives, and reusable dependencies. `app/middleware` contains cross-cutting HTTP behavior, while `app/seed` contains development-only data loading. `migrations` is the Alembic history. Backend tests are split into focused unit and API/database integration suites.

### `docs/`

Living technical documentation: architectural decisions, versioned API contracts, the normalized data model, and reproducible setup instructions. Documentation must be updated in the same change as behavior it describes.

### `scripts/`

Small entry points for repeatable environment setup, seed loading, and test execution. Business logic must not live in shell scripts.

## Backend dependency rules

Dependencies point inward:

1. API endpoints depend on schemas, services, and authentication/authorization dependencies.
2. Services depend on repositories, domain models, and explicit infrastructure interfaces.
3. Repositories depend on SQLAlchemy models and database sessions.
4. Models and schemas do not import API endpoints.

Transactions are controlled at the service/use-case boundary. API handlers translate known domain failures into the standard API error envelope. Unexpected errors are logged with correlation context and sanitized before reaching clients.

## Frontend dependency rules

Feature modules may use shared components, hooks, types, and the API client. Shared components must not import feature modules. TanStack Query owns server state; transient view state stays local. React Hook Form and Zod own form state and client validation. Authorization decisions received from the server remain authoritative.

## Security baseline

- Short-lived access JWTs and rotating/revocable refresh tokens are planned; refresh tokens use HTTP-only, same-site cookies.
- Passwords are hashed with Argon2 and never logged or returned.
- Public signup cannot assign privileged roles in production.
- CORS is an explicit environment allowlist.
- Pydantic and database constraints validate data at multiple boundaries.
- Payroll and employee-owned queries are scoped before data leaves the repository.
- Sensitive mutations generate audit records.

## Scalability and operations

The stateless API can scale horizontally. Database pagination is cursor- or offset-based as appropriate, indexes follow measured query paths, and report export work can move to background jobs without changing public contracts. Structured logs, request IDs, health/readiness checks, and migration-based deployments are part of the backend foundation phase.

## Incremental delivery boundaries

The skeleton intentionally contains importable placeholders only. Each later phase must add its own migration, schemas, repositories, services, endpoints, UI, tests, and documentation together. A module is not complete until its authorization and failure paths are tested.
