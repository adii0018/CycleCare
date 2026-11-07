"""Repository layer containing all direct MongoDB database queries."""

import logging
from typing import Any

from bson.binary import Binary
from pymongo.database import Database

from infrastructure.mongodb import get_database

logger = logging.getLogger(__name__)

REPAIRS_COLLECTION = "repairs"
PHOTOS_COLLECTION = "photos"


def get_db(db: Database | None = None) -> Database:
    """Return database instance if provided, else get active singleton."""
    return db if db is not None else get_database()


def find_repair_by_idempotency_key(
    idempotency_key: str, db: Database | None = None
) -> dict[str, Any] | None:
    """Look up an existing repair record by idempotency_key."""
    database = get_db(db)
    return database[REPAIRS_COLLECTION].find_one(
        {"idempotency_key": idempotency_key},
        projection={"repair_id": 1, "customer_name": 1, "received_at": 1, "_id": 0},
    )


def insert_photo(
    photo_id: str,
    content_type: str,
    size_bytes: int,
    data: bytes,
    uploaded_at,
    expires_at,
    db: Database | None = None,
) -> None:
    """Insert a single photo document into the photos collection."""
    database = get_db(db)
    doc = {
        "_id": photo_id,
        "content_type": content_type,
        "size_bytes": size_bytes,
        "data": Binary(data),
        "uploaded_at": uploaded_at,
        "expires_at": expires_at,
    }
    database[PHOTOS_COLLECTION].insert_one(doc)


def insert_photos_batch(photo_docs: list[dict[str, Any]], db: Database | None = None) -> None:
    """Insert multiple photo documents in a single batch."""
    if not photo_docs:
        return
    database = get_db(db)
    # Ensure binary data is correctly wrapped
    prepared = []
    for p in photo_docs:
        doc = dict(p)
        if isinstance(doc["data"], bytes):
            doc["data"] = Binary(doc["data"])
        prepared.append(doc)
    database[PHOTOS_COLLECTION].insert_many(prepared, ordered=False)


def delete_photos(photo_ids: list[str], db: Database | None = None) -> int:
    """Delete photos by their string _ids (used during rollback or cleanup)."""
    if not photo_ids:
        return 0
    database = get_db(db)
    result = database[PHOTOS_COLLECTION].delete_many({"_id": {"$in": photo_ids}})
    logger.info("Deleted %d photo documents during cleanup", result.deleted_count)
    return result.deleted_count


def insert_repair(repair_doc: dict[str, Any], db: Database | None = None) -> None:
    """Insert a new repair document into the repairs collection."""
    database = get_db(db)
    database[REPAIRS_COLLECTION].insert_one(repair_doc)


def find_photo_by_id(photo_id: str, db: Database | None = None) -> dict[str, Any] | None:
    """Retrieve a photo document by its string _id."""
    database = get_db(db)
    return database[PHOTOS_COLLECTION].find_one({"_id": photo_id})
