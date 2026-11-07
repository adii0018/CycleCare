"""Global exception handler providing a unified friendly error envelope."""

import logging
from typing import Any

from django.core.exceptions import RequestDataTooBig
from django.http import Http404, HttpResponse
from rest_framework import status
from rest_framework.exceptions import (
    AuthenticationFailed,
    NotAuthenticated,
    Throttled,
    ValidationError,
)
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


def build_error_response(
    code: str,
    message: str,
    status_code: int,
    fields: dict[str, list[str]] | None = None,
) -> Response:
    """Format and return the standardized JSON error envelope."""
    payload: dict[str, Any] = {
        "error": {
            "code": code,
            "message": message,
        }
    }
    if fields is not None:
        payload["error"]["fields"] = fields
    return Response(payload, status=status_code)


def _format_validation_fields(detail: Any) -> dict[str, list[str]]:
    """Normalize DRF validation error details into a dictionary of string lists."""
    formatted: dict[str, list[str]] = {}
    if isinstance(detail, dict):
        for field, messages in detail.items():
            if isinstance(messages, list):
                formatted[field] = [str(m) for m in messages]
            else:
                formatted[field] = [str(messages)]
    elif isinstance(detail, list):
        formatted["non_field_errors"] = [str(m) for m in detail]
    else:
        formatted["non_field_errors"] = [str(detail)]
    return formatted


def custom_exception_handler(exc: Exception, context: dict[str, Any]) -> HttpResponse | None:
    """DRF custom exception handler returning consistent friendly error structures."""
    # Handle Django's payload size exceeded error
    if isinstance(exc, RequestDataTooBig):
        logger.warning("Rejected payload exceeding memory limits")
        return build_error_response(
            code="payload_too_large",
            message="Uploaded photos or request data is too large. Each photo must be under 400 KB.",
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        )

    # Let DRF handle standard API exceptions first
    response = exception_handler(exc, context)

    if response is not None:
        if isinstance(exc, ValidationError):
            fields = _format_validation_fields(response.data)
            return build_error_response(
                code="validation_error",
                message="Please correct the errors in the submitted form.",
                status_code=status.HTTP_400_BAD_REQUEST,
                fields=fields,
            )

        if isinstance(exc, (AuthenticationFailed, NotAuthenticated)):
            detail_msg = "Authentication credentials were not provided or are invalid."
            if hasattr(exc, "detail") and exc.detail:
                detail_msg = str(exc.detail)
            code_name = (
                "authentication_failed"
                if isinstance(exc, AuthenticationFailed)
                else "not_authenticated"
            )
            return build_error_response(
                code=code_name,
                message=detail_msg,
                status_code=status.HTTP_401_UNAUTHORIZED,
            )

        if isinstance(exc, Throttled):
            wait_seconds = getattr(exc, "wait", None)
            wait_msg = f" Please try again in {wait_seconds} seconds." if wait_seconds else ""
            return build_error_response(
                code="rate_limited",
                message=f"Too many attempts.{wait_msg} Please wait before trying again.",
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        if isinstance(exc, Http404):
            return build_error_response(
                code="not_found",
                message="The requested resource was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )

        # Other standard DRF exceptions
        detail_msg = "An error occurred while processing your request."
        if isinstance(response.data, dict) and "detail" in response.data:
            detail_msg = str(response.data["detail"])
        elif isinstance(response.data, str):
            detail_msg = response.data

        code_name = getattr(exc, "default_code", "error")
        return build_error_response(
            code=code_name,
            message=detail_msg,
            status_code=response.status_code,
        )

    # Unhandled 500 exceptions
    logger.exception("Unhandled server exception encountered in API view")
    return build_error_response(
        code="server_error",
        message="A temporary system error occurred. Please try again shortly.",
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
