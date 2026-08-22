from fastapi import FastAPI
from httpx import AsyncClient


async def test_openapi_metadata_is_available(client: AsyncClient) -> None:
    response = await client.get("/openapi.json")

    assert response.status_code == 200
    assert response.json()["info"]["title"] == "Dayflow API"


async def test_liveness_returns_version_and_request_id(client: AsyncClient) -> None:
    response = await client.get(
        "/api/v1/health/live",
        headers={"X-Request-ID": "test-request-123"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "Dayflow API",
        "version": "0.1.0",
    }
    assert response.headers["X-Request-ID"] == "test-request-123"


async def test_invalid_request_id_is_replaced(client: AsyncClient) -> None:
    response = await client.get(
        "/api/v1/health/live",
        headers={"X-Request-ID": "unsafe request id"},
    )

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] != "unsafe request id"
    assert len(response.headers["X-Request-ID"]) == 36


async def test_readiness_checks_database(client: AsyncClient) -> None:
    response = await client.get("/api/v1/health/ready")

    assert response.status_code == 200
    assert response.json()["database"] == "reachable"


async def test_readiness_returns_sanitized_error_when_database_fails(
    application: FastAPI,
    client: AsyncClient,
) -> None:
    async def failing_ping() -> None:
        raise RuntimeError("database password must not leak")

    application.state.database.ping = failing_ping

    response = await client.get("/api/v1/health/ready")

    assert response.status_code == 503
    assert response.json() == {
        "detail": "The service is not ready",
        "code": "DATABASE_UNAVAILABLE",
        "field_errors": {},
    }
    assert "password" not in response.text


async def test_not_found_uses_standard_error_shape(client: AsyncClient) -> None:
    response = await client.get("/api/v1/does-not-exist")

    assert response.status_code == 404
    assert response.json() == {
        "detail": "Not Found",
        "code": "RESOURCE_NOT_FOUND",
        "field_errors": {},
    }


async def test_validation_errors_include_field_details(
    application: FastAPI,
    client: AsyncClient,
) -> None:
    @application.get("/test/validation")
    async def validation_route(page: int) -> dict[str, int]:
        return {"page": page}

    response = await client.get("/test/validation?page=invalid")

    assert response.status_code == 422
    body = response.json()
    assert body["detail"] == "Request validation failed"
    assert body["code"] == "VALIDATION_ERROR"
    assert "page" in body["field_errors"]
    assert "invalid" not in response.text


async def test_unexpected_errors_do_not_expose_exception_details(
    application: FastAPI,
    client: AsyncClient,
) -> None:
    @application.get("/test/unexpected")
    async def unexpected_route() -> None:
        raise RuntimeError("sensitive internal context")

    response = await client.get("/test/unexpected")

    assert response.status_code == 500
    assert response.json() == {
        "detail": "An unexpected error occurred",
        "code": "INTERNAL_SERVER_ERROR",
        "field_errors": {},
    }
    assert "sensitive" not in response.text


async def test_configured_cors_origin_is_allowed(client: AsyncClient) -> None:
    response = await client.options(
        "/api/v1/health/live",
        headers={
            "Origin": "https://dayflow.test",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "X-Request-ID",
        },
    )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "https://dayflow.test"
    assert response.headers["access-control-allow-credentials"] == "true"
