"""Repository layer containing all MongoDB queries for admins and admin_sessions."""

from datetime import datetime
from typing import Any
from pymongo.database import Database
from infrastructure.mongodb import get_database

ADMINS_COLLECTION = "admins"
ADMIN_SESSIONS_COLLECTION = "admin_sessions"


def get_db(db: Database | None = None) -> Database:
    """Return database instance if provided, else get active singleton."""
    return db if db is not None else get_database()


def find_admin_by_mobile(mobile: str, db: Database | None = None) -> dict[str, Any] | None:
    """Find an admin document by unique normalized mobile."""
    database = get_db(db)
    return database[ADMINS_COLLECTION].find_one({"mobile": mobile})


def find_admin_by_id(admin_id: str, db: Database | None = None) -> dict[str, Any] | None:
    """Find an admin document by string _id."""
    database = get_db(db)
    return database[ADMINS_COLLECTION].find_one({"_id": admin_id})


def insert_admin(admin_doc: dict[str, Any], db: Database | None = None) -> None:
    """Insert a new admin record into the admins collection."""
    database = get_db(db)
    database[ADMINS_COLLECTION].insert_one(admin_doc)


def update_admin_password(admin_id: str, password_hash: str, db: Database | None = None) -> None:
    """Update password_hash for an admin document."""
    database = get_db(db)
    database[ADMINS_COLLECTION].update_one(
        {"_id": admin_id},
        {"$set": {"password_hash": password_hash}},
    )


def update_admin_last_login(
    admin_id: str, last_login_at: datetime, db: Database | None = None
) -> None:
    """Update last_login_at timestamp for an admin document."""
    database = get_db(db)
    database[ADMINS_COLLECTION].update_one(
        {"_id": admin_id},
        {"$set": {"last_login_at": last_login_at}},
    )


def insert_session(session_doc: dict[str, Any], db: Database | None = None) -> None:
    """Store a hashed admin session document in admin_sessions."""
    database = get_db(db)
    database[ADMIN_SESSIONS_COLLECTION].insert_one(session_doc)


def find_session_by_token_hash(
    token_hash: str, db: Database | None = None
) -> dict[str, Any] | None:
    """Lookup an active session by SHA-256 token hash."""
    database = get_db(db)
    return database[ADMIN_SESSIONS_COLLECTION].find_one({"token_hash": token_hash})


def delete_session_by_token_hash(token_hash: str, db: Database | None = None) -> int:
    """Revoke a single session by its SHA-256 token hash."""
    database = get_db(db)
    result = database[ADMIN_SESSIONS_COLLECTION].delete_one({"token_hash": token_hash})
    return result.deleted_count


def delete_sessions_for_admin(admin_id: str, db: Database | None = None) -> int:
    """Revoke all sessions belonging to a specific admin."""
    database = get_db(db)
    result = database[ADMIN_SESSIONS_COLLECTION].delete_many({"admin_id": admin_id})
    return result.deleted_count
