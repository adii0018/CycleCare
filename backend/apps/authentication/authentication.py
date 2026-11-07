"""DRF Authentication class for cookie-based SHA-256 hashed admin sessions."""

import hashlib
import logging
from datetime import UTC

from django.conf import settings
from django.core.cache import cache
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.request import Request

from apps.core.utils import utc_now

from .models import AdminUser
from .repository import (
    delete_session_by_token_hash,
    find_admin_by_id,
    find_session_by_token_hash,
)

logger = logging.getLogger(__name__)


def hash_token(raw_token: str) -> str:
    """Compute SHA-256 hex digest of an opaque session token."""
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


class AdminSessionAuthentication(BaseAuthentication):
    """Authenticate requests via an HttpOnly session cookie containing an opaque token."""

    def authenticate_header(self, request: Request) -> str:
        """Return challenge string so unauthenticated requests receive HTTP 401 instead of 403."""
        return "Cookie"

    def authenticate(self, request: Request) -> tuple[AdminUser, dict] | None:
        cookie_name = getattr(settings, "SESSION_COOKIE_NAME", "cc_session")
        token = request.COOKIES.get(cookie_name)

        if not token:
            # Let DRF permission classes enforce authentication
            return None

        token_hash = hash_token(token)
        cache_key = f"admin_auth:{token_hash}"
        cached_auth = cache.get(cache_key)
        if cached_auth:
            return AdminUser(cached_auth["admin"]), cached_auth["session"]

        session = find_session_by_token_hash(token_hash)

        if not session:
            raise AuthenticationFailed("Invalid or expired session.")

        # In-code expiry check (TTL monitor in MongoDB is asynchronous)
        now = utc_now()
        expires_at = session.get("expires_at")
        if expires_at is not None:
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=UTC)
            if expires_at < now:
                logger.info("Session %s expired at %s; rejecting", session.get("_id"), expires_at)
                delete_session_by_token_hash(token_hash)
                raise AuthenticationFailed("Session has expired. Please log in again.")

        # Verify active admin record
        admin_doc = find_admin_by_id(session["admin_id"])
        if not admin_doc or not admin_doc.get("is_active", True):
            logger.warning(
                "Admin %s inactive or missing; rejecting session", session.get("admin_id")
            )
            raise AuthenticationFailed("Admin account is inactive or disabled.")

        # Cache verified auth in RAM for 120s to eliminate redundant Atlas lookups
        cache.set(cache_key, {"admin": admin_doc, "session": session}, timeout=120)

        return AdminUser(admin_doc), session
