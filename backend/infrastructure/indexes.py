"""MongoDB index declarations and idempotent creation helpers."""

import logging

from pymongo import ASCENDING, DESCENDING, IndexModel
from pymongo.database import Database

from .mongodb import get_database

logger = logging.getLogger(__name__)


def get_repairs_indexes() -> list[IndexModel]:
    """Define indexes for the repairs collection."""
    return [
        IndexModel(
            [("repair_id", ASCENDING)],
            name="idx_repairs_repair_id_unique",
            unique=True,
        ),
        IndexModel(
            [("idempotency_key", ASCENDING)],
            name="idx_repairs_idempotency_key_unique_partial",
            unique=True,
            partialFilterExpression={"idempotency_key": {"$exists": True, "$type": "string"}},
        ),
        IndexModel(
            [("mobile", ASCENDING)],
            name="idx_repairs_mobile",
        ),
        IndexModel(
            [("search_name", ASCENDING)],
            name="idx_repairs_search_name",
        ),
        IndexModel(
            [("archived", ASCENDING), ("received_at", DESCENDING)],
            name="idx_repairs_archived_received_at",
        ),
    ]


def get_photos_indexes() -> list[IndexModel]:
    """Define indexes for the photos collection (including TTL auto-expiry)."""
    return [
        IndexModel(
            [("expires_at", ASCENDING)],
            name="idx_photos_expires_at_ttl",
            expireAfterSeconds=0,
        ),
    ]


def get_rate_limits_indexes() -> list[IndexModel]:
    """Define indexes for the rate_limits collection (including TTL auto-expiry)."""
    return [
        IndexModel(
            [("expires_at", ASCENDING)],
            name="idx_rate_limits_expires_at_ttl",
            expireAfterSeconds=0,
        ),
    ]


def ensure_all_indexes(db: Database | None = None) -> dict[str, list[str]]:
    """Idempotently create all defined indexes across collections.

    Returns a mapping of collection name to created index names.
    """
    database = db if db is not None else get_database()
    results = {}

    index_specs = {
        "repairs": get_repairs_indexes(),
        "photos": get_photos_indexes(),
        "rate_limits": get_rate_limits_indexes(),
    }

    for col_name, specs in index_specs.items():
        collection = database[col_name]
        created = collection.create_indexes(specs)
        results[col_name] = created
        logger.info("Ensured %d indexes on collection '%s'", len(created), col_name)

    return results
