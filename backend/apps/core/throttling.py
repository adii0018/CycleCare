"""MongoDB-backed atomic rate limiter with TTL window expiry."""

import logging
from datetime import UTC, timedelta

from django.conf import settings
from rest_framework.exceptions import Throttled
from rest_framework.request import Request
from rest_framework.throttling import BaseThrottle

from infrastructure.mongodb import get_database

from .utils import get_client_ip, utc_now

logger = logging.getLogger(__name__)

RATE_LIMITS_COLLECTION = "rate_limits"


def check_rate_limit(
    key: str,
    limit: int,
    window_seconds: int,
    db=None,
) -> tuple[bool, int | None]:
    """Atomically evaluate whether a rate limit key has exceeded its threshold.

    Returns (is_allowed, retry_after_seconds).
    """
    database = db if db is not None else get_database()
    col = database[RATE_LIMITS_COLLECTION]
    now = utc_now()
    expires_at = now + timedelta(seconds=window_seconds)

    # Attempt to increment an existing active window
    doc = col.find_one_and_update(
        {"_id": key, "expires_at": {"$gt": now}},
        {"$inc": {"count": 1}},
        return_document=True,
    )

    if doc is None:
        # Window does not exist or has expired; initialize fresh window
        doc = col.find_one_and_update(
            {"_id": key},
            {"$set": {"count": 1, "expires_at": expires_at}},
            upsert=True,
            return_document=True,
        )

    current_count = doc.get("count", 1)
    if current_count > limit:
        doc_expiry = doc.get("expires_at", expires_at)
        if doc_expiry.tzinfo is None:
            doc_expiry = doc_expiry.replace(tzinfo=UTC)
        retry_after = max(1, int((doc_expiry - now).total_seconds()))
        logger.warning(
            "Rate limit exceeded for key %s (count=%d, limit=%d)",
            key,
            current_count,
            limit,
        )
        return False, retry_after

    return True, None


class RegistrationRateThrottle(BaseThrottle):
    """DRF Throttle for public repair registrations."""

    scope = "register"

    def allow_request(self, request: Request, view) -> bool:
        """Evaluate rate limit per client IP."""
        client_ip = get_client_ip(request)
        limit = getattr(settings, "RATE_LIMIT_REGISTER_PER_10MIN", 10)
        window_seconds = 600  # 10 minutes

        key = f"{self.scope}:{client_ip}"
        allowed, retry_after = check_rate_limit(key, limit, window_seconds)

        if not allowed:
            self.wait_seconds = retry_after
            raise Throttled(wait=retry_after)

        return True

    def wait(self) -> int | None:
        """Return estimated seconds to wait before retrying."""
        return getattr(self, "wait_seconds", None)
