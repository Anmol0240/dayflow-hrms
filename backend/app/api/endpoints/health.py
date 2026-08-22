import logging

from fastapi import APIRouter

from app.core.dependencies import DatabaseDependency, SettingsDependency
from app.core.exceptions import ServiceUnavailableError
from app.schemas.common import ErrorResponse
from app.schemas.health import HealthResponse, ReadinessResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["Health"])


@router.get(
    "/live",
    response_model=HealthResponse,
    summary="Check API process liveness",
)
async def liveness(settings: SettingsDependency) -> HealthResponse:
    return HealthResponse(
        service=settings.application_name,
        version=settings.application_version,
    )


@router.get(
    "/ready",
    response_model=ReadinessResponse,
    responses={503: {"model": ErrorResponse, "description": "Database is unavailable"}},
    summary="Check API and database readiness",
)
async def readiness(
    settings: SettingsDependency,
    database: DatabaseDependency,
) -> ReadinessResponse:
    try:
        await database.ping()
    except Exception as error:
        logger.warning("Database readiness check failed", exc_info=error)
        raise ServiceUnavailableError(
            detail="The service is not ready",
            code="DATABASE_UNAVAILABLE",
        ) from error

    return ReadinessResponse(
        service=settings.application_name,
        version=settings.application_version,
    )
