"""Business logic services for admin authentication, sessions, and credential management."""

import hashlib
import logging
import secrets
import uuid
from datetime import UTC, timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from rest_framework.exceptions import AuthenticationFailed, Throttled, ValidationError

from apps.core.throttling import check_rate_limit
from apps.core.utils import utc_now
from apps.repairs.serializers import MOBILE_PATTERN, normalize_mobile
from infrastructure.mongodb import get_database

from .authentication import hash_token
from .repository import (
    delete_session_by_token_hash,
    delete_sessions_for_admin,
    find_admin_by_mobile,
    insert_admin,
    insert_session,
    update_admin_last_login,
    update_admin_password,
)

logger = logging.getLogger(__name__)

# Precomputed standard PBKDF2 dummy hash for timing-safe password verification
DUMMY_PASSWORD_HASH = (
    "pbkdf2_sha256$720000$dummy_salt$dummy_hash_for_constant_time_comparison_1234567890="
)
ADMIN_PASSWORD_MIN_LENGTH = 10


def record_failed_mobile_login(mobile: str, window_seconds: int = 900, db=None) -> None:
    """Increment failed login counter for a specific mobile number."""
    database = db if db is not None else get_database()
    col = database["rate_limits"]
    key = f"login_mobile_failed:{mobile}"
    now = utc_now()
    expires_at = now + timedelta(seconds=window_seconds)

    doc = col.find_one_and_update(
        {"_id": key, "expires_at": {"$gt": now}},
        {"$inc": {"count": 1}},
        return_document=True,
    )
    if doc is None:
        col.find_one_and_update(
            {"_id": key},
            {"$set": {"count": 1, "expires_at": expires_at}},
            upsert=True,
            return_document=True,
        )


def clear_failed_mobile_login(mobile: str, db=None) -> None:
    """Clear failed login counter upon successful authentication."""
    database = db if db is not None else get_database()
    database["rate_limits"].delete_one({"_id": f"login_mobile_failed:{mobile}"})


def check_mobile_rate_limit(mobile: str, limit: int = 5, db=None) -> None:
    """Check if the mobile number is currently rate-limited due to repeated failures."""
    database = db if db is not None else get_database()
    doc = database["rate_limits"].find_one({"_id": f"login_mobile_failed:{mobile}"})
    if doc:
        now = utc_now()
        expires_at = doc.get("expires_at")
        if expires_at is not None:
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=UTC)
            if expires_at > now and doc.get("count", 0) >= limit:
                retry_after = max(1, int((expires_at - now).total_seconds()))
                raise Throttled(
                    wait=retry_after,
                    detail="Too many failed login attempts for this number. Please wait before retrying.",
                )


def login_admin(
    mobile: str,
    raw_password: str,
    client_ip: str,
    db=None,
) -> tuple[dict, str]:
    """Authenticate an administrator and create an active session.

    Returns:
        tuple[admin_doc, opaque_session_token]
    """
    # 1. Rate limit by client IP
    ip_limit = getattr(settings, "RATE_LIMIT_LOGIN_IP_PER_15MIN", 10)
    allowed, retry_after = check_rate_limit(
        key=f"login_ip:{client_ip}",
        limit=ip_limit,
        window_seconds=900,
        db=db,
    )
    if not allowed:
        raise Throttled(wait=retry_after)

    # 2. Rate limit by targeted mobile number
    mobile_limit = getattr(settings, "RATE_LIMIT_LOGIN_MOBILE_PER_15MIN", 5)
    check_mobile_rate_limit(mobile, limit=mobile_limit, db=db)

    # 3. Lookup admin by mobile
    admin_doc = find_admin_by_mobile(mobile, db=db)

    # If mobile doesn't exist or is inactive, run dummy password check for timing-attack safety
    if not admin_doc or not admin_doc.get("is_active", True):
        check_password(raw_password, DUMMY_PASSWORD_HASH)
        record_failed_mobile_login(mobile, db=db)
        raise AuthenticationFailed("Mobile number or password is incorrect.")

    # 4. Verify password
    if not check_password(raw_password, admin_doc["password_hash"]):
        record_failed_mobile_login(mobile, db=db)
        raise AuthenticationFailed("Mobile number or password is incorrect.")

    # 5. Success: clear failed counter and update last_login_at
    clear_failed_mobile_login(mobile, db=db)
    now = utc_now()
    update_admin_last_login(admin_doc["_id"], now, db=db)

    # 6. Generate opaque random token and store SHA-256 session
    raw_token = secrets.token_urlsafe(32)
    token_digest = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    session_days = getattr(settings, "ADMIN_SESSION_DAYS", 14)
    expires_at = now + timedelta(days=session_days)

    session_doc = {
        "_id": str(uuid.uuid4()),
        "token_hash": token_digest,
        "admin_id": admin_doc["_id"],
        "created_at": now,
        "expires_at": expires_at,
    }
    insert_session(session_doc, db=db)
    logger.info("Admin %s logged in successfully", admin_doc["_id"])

    return admin_doc, raw_token


def logout_admin(raw_token: str, db=None) -> None:
    """Revoke active session token."""
    token_digest = hash_token(raw_token)
    deleted = delete_session_by_token_hash(token_digest, db=db)
    logger.info("Revoked %d admin session(s)", deleted)


def create_admin_account(
    mobile: str,
    raw_password: str,
    db=None,
) -> dict:
    """Create a new admin account strictly via management commands."""
    normalized_mobile = normalize_mobile(mobile)
    if not MOBILE_PATTERN.match(normalized_mobile):
        raise ValidationError(
            "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."
        )

    if len(raw_password) < ADMIN_PASSWORD_MIN_LENGTH:
        raise ValidationError(f"Password must be at least {ADMIN_PASSWORD_MIN_LENGTH} characters.")

    existing = find_admin_by_mobile(normalized_mobile, db=db)
    if existing:
        raise ValidationError(f"Admin with mobile '{normalized_mobile}' already exists.")

    admin_doc = {
        "_id": str(uuid.uuid4()),
        "mobile": normalized_mobile,
        "password_hash": make_password(raw_password),
        "is_active": True,
        "created_at": utc_now(),
        "last_login_at": None,
    }
    insert_admin(admin_doc, db=db)
    logger.info("Created new admin account for mobile %s", normalized_mobile)
    return admin_doc


def set_admin_new_password(
    mobile: str,
    new_password: str,
    db=None,
) -> None:
    """Set new password for an existing admin and revoke all active sessions."""
    normalized_mobile = normalize_mobile(mobile)
    admin_doc = find_admin_by_mobile(normalized_mobile, db=db)
    if not admin_doc:
        raise ValidationError(f"Admin with mobile '{normalized_mobile}' does not exist.")

    if len(new_password) < ADMIN_PASSWORD_MIN_LENGTH:
        raise ValidationError(f"Password must be at least {ADMIN_PASSWORD_MIN_LENGTH} characters.")

    # Update hash and revoke all sessions
    new_hash = make_password(new_password)
    update_admin_password(admin_doc["_id"], new_hash, db=db)
    delete_sessions_for_admin(admin_doc["_id"], db=db)
    logger.info("Updated password and revoked all sessions for admin %s", admin_doc["_id"])
