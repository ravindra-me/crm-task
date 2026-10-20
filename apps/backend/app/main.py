from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import contacts, health, tags
from app.config import get_settings
from app.errors import register_error_handlers
from app.request_logging import request_logger, setup_logging


def create_app() -> FastAPI:
    settings = get_settings()
    setup_logging(settings.log_level, show_sql=settings.db_echo)

    app = FastAPI(title="CRM Contact Workspace API", version="1.0.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )
    app.middleware("http")(request_logger)
    register_error_handlers(app)

    app.include_router(health.router)
    app.include_router(contacts.router, prefix="/api/v1")
    app.include_router(tags.router, prefix="/api/v1")
    return app


app = create_app()
