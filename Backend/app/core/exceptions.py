from __future__ import annotations


class ApplicationError(Exception):
    def __init__(
        self,
        detail: str,
        code: str,
        status_code: int,
        field_errors: dict[str, list[str]] | None = None,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(detail)
        self.detail = detail
        self.code = code
        self.status_code = status_code
        self.field_errors = field_errors or {}
        self.headers = headers


class ResourceNotFoundError(ApplicationError):
    def __init__(self, detail: str = "The requested resource was not found") -> None:
        super().__init__(detail=detail, code="RESOURCE_NOT_FOUND", status_code=404)


class ConflictError(ApplicationError):
    def __init__(self, detail: str, code: str = "RESOURCE_CONFLICT") -> None:
        super().__init__(detail=detail, code=code, status_code=409)


class ServiceUnavailableError(ApplicationError):
    def __init__(self, detail: str, code: str = "SERVICE_UNAVAILABLE") -> None:
        super().__init__(detail=detail, code=code, status_code=503)


def error_code_for_status(status_code: int) -> str:
    return {
        400: "BAD_REQUEST",
        401: "UNAUTHENTICATED",
        403: "FORBIDDEN",
        404: "RESOURCE_NOT_FOUND",
        405: "METHOD_NOT_ALLOWED",
        409: "RESOURCE_CONFLICT",
        422: "VALIDATION_ERROR",
        429: "RATE_LIMITED",
        503: "SERVICE_UNAVAILABLE",
    }.get(status_code, "HTTP_ERROR")
