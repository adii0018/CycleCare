"""Tests for index management and TTL index verification."""

from infrastructure.indexes import ensure_all_indexes


def test_ensure_indexes_is_idempotent(test_db):
    """Running ensure_all_indexes multiple times must succeed without error."""
    res1 = ensure_all_indexes(test_db)
    res2 = ensure_all_indexes(test_db)

    assert "repairs" in res1 and "repairs" in res2
    assert "photos" in res1 and "photos" in res2
    assert "rate_limits" in res1 and "rate_limits" in res2


def test_ttl_indexes_exist_with_expire_after_seconds_zero(test_db):
    """Verify TTL indexes on photos and rate_limits have expireAfterSeconds=0."""
    ensure_all_indexes(test_db)

    # Photos TTL index
    photos_indexes = test_db["photos"].index_information()
    assert "idx_photos_expires_at_ttl" in photos_indexes
    assert photos_indexes["idx_photos_expires_at_ttl"]["expireAfterSeconds"] == 0

    # Rate limits TTL index
    rate_limits_indexes = test_db["rate_limits"].index_information()
    assert "idx_rate_limits_expires_at_ttl" in rate_limits_indexes
    assert rate_limits_indexes["idx_rate_limits_expires_at_ttl"]["expireAfterSeconds"] == 0


def test_unique_indexes_exist(test_db):
    """Verify unique indexes on repair_id and partial unique on idempotency_key."""
    ensure_all_indexes(test_db)
    repairs_indexes = test_db["repairs"].index_information()

    assert "idx_repairs_repair_id_unique" in repairs_indexes
    assert repairs_indexes["idx_repairs_repair_id_unique"].get("unique") is True

    assert "idx_repairs_idempotency_key_unique_partial" in repairs_indexes
    assert repairs_indexes["idx_repairs_idempotency_key_unique_partial"].get("unique") is True
    assert (
        "partialFilterExpression" in repairs_indexes["idx_repairs_idempotency_key_unique_partial"]
    )
