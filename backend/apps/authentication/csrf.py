"""Origin/Referer and Content-Type enforcement protecting cookie-authenticated state-changing APIs."""

from urllib.parse import urlparse
from django.conf import settings
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission
from rest_framework.request import Request


def get_allowed_origins() -> set[str]:
    """Retrieve normalized set of allowed origins from settings."""
    allowed = set()
    frontend_url = getattr(settings, "FRONTEND_URL", "")
    for url in frontend_url.split(","):
        cleaned = url.strip()
        if cleaned:
            allowed.add(cleaned.rstrip("/"))

    # Standard testing and dev origin aliases
    if getattr(settings, "DEBUG", False):
        allowed.add("http://localhost:5173")
        allowed.add("http://127.0.0.1:5173")
        allowed.add("http://localhost:8000")
        allowed.add("http://127.0.0.1:8000")
        allowed.add("http://testserver")

    return allowed


def verify_request_origin(request: Request) -> None:
    """Validate request Origin or Referer against configured frontend origins."""
    allowed = get_allowed_origins()
    origin = request.META.get("HTTP_ORIGIN")

    if not origin:
        # Fall back to Referer
        referer = request.META.get("HTTP_REFERER")
        if referer:
            parsed = urlparse(referer)
            origin = f"{parsed.scheme}://{parsed.netloc}"

    if not origin or origin.rstrip("/") not in allowed:
        raise PermissionDenied("Request origin is forbidden or not recognized.")

    # Validate safe Content-Type header on state-changing bodies
    content_type = request.META.get("CONTENT_TYPE", "").lower()
    allowed_content_types = (
        "application/json",
        "multipart/form-data",
        "application/x-www-form-urlencoded",
    )
    if content_type and not any(content_type.startswith(t) for t in allowed_content_types):
        raise PermissionDenied("Unsupported or unsafe Content-Type header.")


class AdminOriginCheckPermission(BasePermission):
    """Permission enforcing Origin/Referer check on state-changing admin actions."""

    def has_permission(self, request: Request, view) -> bool:
        if request.method in ("POST", "PATCH", "DELETE", "PUT"):
            verify_request_origin(request)
        return True
