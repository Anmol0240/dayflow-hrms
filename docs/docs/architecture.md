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

### Frontend composition and sessions

`AppProviders` composes one TanStack Query client, the authentication boundary, and accessible toast delivery. The typed API client attaches bearer credentials, includes the backend-owned refresh cookie, coalesces concurrent renewals, retries an unauthorized request at most once, and preserves structured API field errors. Access tokens exist only in memory; neither access nor refresh tokens are written to `localStorage` or `sessionStorage`.

The route graph separates public-only, authenticated, Employee-only, and Admin/HR branches. Guards control navigation and presentation only; backend dependencies and services remain authoritative. A responsive application layout derives navigation from the authenticated role and supplies mobile navigation, breadcrumbs, session controls, loading states, route errors, and keyboard-visible focus behavior.

Reusable UI primitives live in `components/ui`; accessible form composition lives in `components/forms`; domain-specific components remain inside their feature. Foundation tests use a memory router and explicit authentication context so redirects and role navigation are verified independently of feature screens.

## Security baseline

- Short-lived access JWTs and rotating/revocable refresh tokens are implemented; refresh tokens use HTTP-only, same-site cookies and are stored only as SHA-256 hashes.
- Passwords are hashed with Argon2 and never logged or returned.
- Public signup cannot assign privileged roles in any environment.
- CORS is an explicit environment allowlist.
- Pydantic and database constraints validate data at multiple boundaries.
- Payroll and employee-owned queries are scoped before data leaves the repository.
- Leave decisions and payroll mutations create immutable audit events.

### Authentication boundaries

Authentication endpoints delegate to `AuthService`, which owns account-state checks and token transitions. `UserRepository` and `AuthTokenRepository` contain identity queries and row-locking intent. Access JWTs carry a user ID, role, unique token ID, issuer, audience, issue time, and expiry; every protected request reloads the user so deactivation and role changes take effect immediately.

Refresh tokens are opaque 256-bit values. Only their hashes are stored, tokens rotate on every renewal, and reuse of a revoked token revokes the active token family. Password resets revoke all refresh tokens. Email-verification and password-reset tokens are also random, hashed, expiring, and single-use.

Email delivery is represented by an interface. The development adapter records only that delivery was requested and never logs raw tokens. A production mail or queue adapter can replace it without changing authentication business logic.

## Backend foundation

The FastAPI application factory owns validated settings and a `Database` instance through application state. Database engines are therefore created per application, dependencies resolve sessions from the active application, and the lifespan hook disposes the connection pool during shutdown. Production uses `postgresql+asyncpg`; `sqlite+aiosqlite` is supported for development and isolated tests.

SQLAlchemy models inherit shared UUID primary-key and UTC timestamp mixins. Metadata uses deterministic names for indexes, unique constraints, checks, foreign keys, and primary keys so generated Alembic migrations remain stable across databases. Alembic imports the same metadata and settings and runs through an async engine in both PostgreSQL and SQLite environments.

Cross-cutting HTTP behavior includes:

- an explicit CORS allowlist with credentials and restricted methods and headers;
- generated or validated request IDs propagated through `X-Request-ID`;
- JSON structured logging with request correlation;
- centralized handlers for application, validation, HTTP, database, and unexpected failures;
- separate liveness and database-readiness endpoints.

Every API error is serialized as `detail`, `code`, and `field_errors`. Validation responses omit submitted values, and unexpected exceptions are logged server-side without returning internal details.

## Scalability and operations

The stateless API can scale horizontally. Database pagination is cursor- or offset-based as appropriate, indexes follow measured query paths, and report export work can move to background jobs without changing public contracts. Structured logs, request IDs, health/readiness checks, and migration-based deployments are part of the backend foundation phase.

## Incremental delivery boundaries

The backend foundation, authentication, HR domains, reports, and frontend foundation are implemented. Phase 7 replaces the deliberately explicit foundation screens with data-backed feature screens. Each feature must add its queries, forms, accessible states, authorization tests, and documentation together; no placeholder screen represents a completed feature.
