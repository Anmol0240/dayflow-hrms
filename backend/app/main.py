from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.error_handlers import register_exception_handlers
from app.api.router import api_router
from app.core.config import Settings, get_settings
from app.core.database import Database
from app.core.logging import configure_logging
from app.middleware.request_context import REQUEST_ID_HEADER, RequestContextMiddleware
from app.services.email import LoggingEmailSender


def create_application(settings: Settings | None = None) -> FastAPI:
    active_settings = settings or get_settings()
    configure_logging(active_settings.log_level)

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        try:
            yield
        finally:
            await application.state.database.dispose()

    application = FastAPI(
        title=active_settings.application_name,
        summary="Human resource management system API",
        version=active_settings.application_version,
        debug=active_settings.debug,
        lifespan=lifespan,
    )
    application.state.settings = active_settings
    application.state.database = Database(active_settings)
    application.state.email_sender = LoggingEmailSender()

    register_exception_handlers(application)
    application.add_middleware(RequestContextMiddleware)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=active_settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Accept", "Authorization", "Content-Type", REQUEST_ID_HEADER],
        expose_headers=[REQUEST_ID_HEADER],
        max_age=600,
    )
    application.include_router(api_router, prefix=active_settings.api_v1_prefix)
    return application


app = create_application()
