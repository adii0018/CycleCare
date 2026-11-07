"""MongoDB client management with lazy process-safe connection pooling."""

import logging
import os

from django.conf import settings
from pymongo import MongoClient
from pymongo.database import Database

logger = logging.getLogger(__name__)

# Global per-process cache
_client: MongoClient | None = None
_client_pid: int | None = None


def get_mongo_client() -> MongoClient:
    """Return a lazy per-process MongoClient instance.

    Guarantees thread-safe connection pooling and forks-safety across Gunicorn workers.
    """
    global _client, _client_pid
    current_pid = os.getpid()

    # Re-instantiate if client does not exist or if process was forked
    if _client is None or _client_pid != current_pid:
        mongo_uri = getattr(settings, "MONGODB_URI", "")
        if not mongo_uri:
            raise ValueError("MONGODB_URI is not configured in settings.")

        timeout_ms = getattr(settings, "MONGODB_TIMEOUT_MS", 5000)
        max_pool = getattr(settings, "MONGODB_MAX_POOL_SIZE", 50)
        min_pool = getattr(settings, "MONGODB_MIN_POOL_SIZE", 5)

        _client = MongoClient(
            mongo_uri,
            serverSelectionTimeoutMS=timeout_ms,
            connectTimeoutMS=timeout_ms,
            maxPoolSize=max_pool,
            minPoolSize=min_pool,
            retryWrites=True,
            uuidRepresentation="standard",
        )
        _client_pid = current_pid
        logger.info("Initialized MongoClient for PID %d", current_pid)

    return _client


def get_database(db_name: str | None = None) -> Database:
    """Return the configured MongoDB Database instance."""
    client = get_mongo_client()
    target_db = db_name or getattr(settings, "MONGODB_DATABASE", "cyclecare")
    return client[target_db]


def close_mongo_client() -> None:
    """Close the active MongoClient connection, primarily for test cleanup."""
    global _client, _client_pid
    if _client is not None:
        _client.close()
        _client = None
        _client_pid = None
