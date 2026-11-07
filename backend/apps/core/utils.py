"""Core utility functions for client IP parsing and UTC timestamps."""

from datetime import UTC, datetime

from django.conf import settings
from django.http import HttpRequest


def utc_now() -> datetime:
    """Return the current timezone-aware UTC datetime."""
    return datetime.now(UTC)


def to_iso_z(dt: datetime) -> str:
    """Format a datetime to ISO8601 string with Z suffix."""
    dt = dt.replace(tzinfo=UTC) if dt.tzinfo is None else dt.astimezone(UTC)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def get_client_ip(request: HttpRequest) -> str:
    """Safely extract the client IP address behind reverse proxies.

    Inspects X-Forwarded-For using the configured TRUSTED_PROXY_HOPS setting.
    If TRUSTED_PROXY_HOPS=1, Render's proxy adds the last entry, so the client IP
    is the entry immediately preceding it (-2). If the header is absent or has
    fewer hops, falls back safely to the available IP or REMOTE_ADDR.
    """
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if not x_forwarded_for:
        return request.META.get("REMOTE_ADDR", "127.0.0.1")

    # Split and clean all IP entries
    ips = [ip.strip() for ip in x_forwarded_for.split(",") if ip.strip()]
    if not ips:
        return request.META.get("REMOTE_ADDR", "127.0.0.1")

    hops = getattr(settings, "TRUSTED_PROXY_HOPS", 1)

    # If there are enough entries to step back behind trusted proxies:
    target_index = -1 - hops
    if abs(target_index) <= len(ips):
        return ips[target_index]

    # If chain is shorter than expected hops, safely fall back to the socket IP (REMOTE_ADDR)
    return request.META.get("REMOTE_ADDR", "127.0.0.1")
