import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class AppError(Exception):
    status_code = 400
    code = "bad_request"

    def __init__(self, message: str, details: Any = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class EmailTakenError(AppError):
    status_code = 409
    code = "email_taken"


class VersionConflictError(AppError):
    status_code = 409
    code = "version_conflict"


def error_body(code: str, message: str, details: Any = None) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, "details": details}}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def handle_app_error(_: Request, error: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=error.status_code,
            content=error_body(error.code, error.message, error.details),
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_: Request, error: RequestValidationError) -> JSONResponse:
        fields = []
        for item in error.errors():
            location = [str(part) for part in item["loc"][1:]] or [str(item["loc"][0])]
            message = item["msg"].removeprefix("Value error, ")
            fields.append({"field": ".".join(location), "message": message})
        return JSONResponse(
            status_code=422, content=error_body("validation_error", "Invalid input", fields)
        )

    @app.exception_handler(Exception)
    async def handle_unexpected(request: Request, error: Exception) -> JSONResponse:
        logger.error("Unhandled error on %s %s", request.method, request.url.path, exc_info=error)
        return JSONResponse(
            status_code=500, content=error_body("internal_error", "Something went wrong")
        )
