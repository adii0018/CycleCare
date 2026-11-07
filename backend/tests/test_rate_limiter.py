"""Tests for MongoDB-backed atomic rate limiting."""

from datetime import timedelta

from rest_framework import status

from apps.core.throttling import check_rate_limit
from apps.core.utils import utc_now


def test_check_rate_limit_counter_and_window(test_db):
    """Verify rate limit increments and blocks upon reaching threshold."""
    key = "test_rate_limit_key"
    limit = 3
    window = 60

    # 1st request -> Allowed
    allowed, retry = check_rate_limit(key, limit, window, db=test_db)
    assert allowed is True
    assert retry is None

    # 2nd request -> Allowed
    allowed, retry = check_rate_limit(key, limit, window, db=test_db)
    assert allowed is True

    # 3rd request -> Allowed
    allowed, retry = check_rate_limit(key, limit, window, db=test_db)
    assert allowed is True

    # 4th request -> Blocked (count is now 4 > limit 3)
    allowed, retry = check_rate_limit(key, limit, window, db=test_db)
    assert allowed is False
    assert retry is not None
    assert retry > 0


def test_rate_limiter_resets_after_window_expires(test_db):
    """When the window expires, counter resets back to 1."""
    key = "test_expired_window_key"
    limit = 2
    window = 60

    # Fill limit
    check_rate_limit(key, limit, window, db=test_db)
    check_rate_limit(key, limit, window, db=test_db)
    allowed, _ = check_rate_limit(key, limit, window, db=test_db)
    assert allowed is False

    # Simulate window expiry in MongoDB document
    past_expiry = utc_now() - timedelta(seconds=1)
    test_db["rate_limits"].update_one(
        {"_id": key},
        {"$set": {"expires_at": past_expiry}},
    )

    # Next request must reset count and be allowed
    allowed, retry = check_rate_limit(key, limit, window, db=test_db)
    assert allowed is True
    assert retry is None

    doc = test_db["rate_limits"].find_one({"_id": key})
    assert doc["count"] == 1


def test_registration_view_rate_limit_blocks_with_429(api_client, test_db):
    """Verify HTTP 429 response envelope when endpoint limit is exceeded."""
    url = "/api/repairs/"
    # Manually seed rate limit document for test client IP (127.0.0.1)
    test_db["rate_limits"].update_one(
        {"_id": "register:127.0.0.1"},
        {"$set": {"count": 15, "expires_at": utc_now() + timedelta(minutes=5)}},
        upsert=True,
    )

    response = api_client.post(
        url,
        data={
            "customer_name": "Test Customer",
            "mobile": "9876543210",
            "repair_problems": ["puncture_tyre"],
            "idempotency_key": "11111111-1111-1111-1111-111111111111",
        },
        format="multipart",
    )

    assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "rate_limited"
    assert "Too many attempts" in data["error"]["message"]
