from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from starlette.exceptions import HTTPException

from app.core.exceptions import ApplicationError, error_code_for_status
from app.schemas.common import ErrorResponse

logger = logging.getLogger(__name__)


def _response(
    *,
    status_code: int,
    detail: str,
    code: str,
    field_errors: dict[str, list[str]] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    content = ErrorResponse(
        detail=detail,
        code=code,
        field_errors=field_errors or {},
    ).model_dump(mode="json")
    return JSONResponse(status_code=status_code, content=content, headers=headers)


async def application_error_handler(_: Request, error: ApplicationError) -> JSONResponse:
    return _response(
        status_code=error.status_code,
        detail=error.detail,
        code=error.code,
        field_errors=error.field_errors,
        headers=error.headers,
    )


async def validation_error_handler(_: Request, error: RequestValidationError) -> JSONResponse:
    field_errors: dict[str, list[str]] = {}
    for issue in error.errors():
        location = issue.get("loc", ())
        field_name = ".".join(str(part) for part in location[1:]) or "request"
        field_errors.setdefault(field_name, []).append(str(issue.get("msg", "Invalid value")))

    return _response(
        status_code=422,
        detail="Request validation failed",
        code="VALIDATION_ERROR",
        field_errors=field_errors,
    )


async def http_error_handler(_: Request, error: HTTPException) -> JSONResponse:
    detail = error.detail if isinstance(error.detail, str) else "The request could not be completed"
    return _response(
        status_code=error.status_code,
        detail=detail,
        code=error_code_for_status(error.status_code),
        headers=error.headers,
    )


async def database_error_handler(request: Request, error: SQLAlchemyError) -> JSONResponse:
    logger.exception("Database operation failed for %s %s", request.method, request.url.path)
    return _response(
        status_code=503,
        detail="The database is temporarily unavailable",
        code="DATABASE_UNAVAILABLE",
    )


async def unexpected_error_handler(request: Request, error: Exception) -> JSONResponse:
    logger.exception("Unhandled error for %s %s", request.method, request.url.path)
    return _response(
        status_code=500,
        detail="An unexpected error occurred",
        code="INTERNAL_SERVER_ERROR",
    )


def register_exception_handlers(application: FastAPI) -> None:
    application.add_exception_handler(ApplicationError, application_error_handler)  # type: ignore[arg-type]
    application.add_exception_handler(RequestValidationError, validation_error_handler)  # type: ignore[arg-type]
    application.add_exception_handler(HTTPException, http_error_handler)  # type: ignore[arg-type]
    application.add_exception_handler(SQLAlchemyError, database_error_handler)  # type: ignore[arg-type]
    application.add_exception_handler(Exception, unexpected_error_handler)
