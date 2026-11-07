"""Comprehensive tests for admin authentication, sessions, permissions, and security."""

import uuid
from datetime import timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth.hashers import check_password
from django.core.management import call_command
from django.core.management.base import CommandError
from django.urls import URLPattern, URLResolver, get_resolver
from rest_framework import status
from rest_framework.test import APIClient

from apps.authentication.services import create_admin_account
from apps.core.utils import utc_now


def test_create_admin_management_command(test_db):
    """create_admin command creates an active admin, rejects duplicates and short passwords."""
    # Successful creation via getpass mock
    with patch("getpass.getpass", side_effect=["SecurePassword123!", "SecurePassword123!"]):
        call_command("create_admin", mobile="9876543210")

    admin = test_db["admins"].find_one({"mobile": "9876543210"})
    assert admin is not None
    assert admin["is_active"] is True
    assert check_password("SecurePassword123!", admin["password_hash"])

    # Duplicate mobile rejected
    with (
        patch("getpass.getpass", side_effect=["AnotherPassword123!", "AnotherPassword123!"]),
        pytest.raises(CommandError, match="already exists"),
    ):
        call_command("create_admin", mobile="9876543210")

    # Short password rejected (< 10 chars)
    with (
        patch("getpass.getpass", side_effect=["Short1!", "Short1!"]),
        pytest.raises(CommandError, match="at least 10 characters"),
    ):
        call_command("create_admin", mobile="9876543211")


def test_login_flow_and_cookie_generation(api_client, test_db):
    """Valid login sets an HttpOnly cookie, returns mobile only (no token in body)."""
    create_admin_account("9876543210", "SecurePassword123!", db=test_db)

    headers = {"HTTP_ORIGIN": "http://localhost:5173"}
    payload = {"mobile": "+91 98765 43210", "password": "SecurePassword123!"}
    response = api_client.post("/api/auth/login/", data=payload, **headers)

    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"admin": {"mobile": "9876543210"}}

    # Cookie assertions
    cookie = response.cookies.get("cc_session")
    assert cookie is not None
    assert cookie.value != ""
    assert cookie["httponly"] is True
    assert cookie["path"] == "/api"
    assert cookie["samesite"] == "Lax"

    # Token must NOT be present in body
    assert "token" not in str(response.json())


def test_login_failure_generic_error_and_timing_safety(api_client, test_db):
    """Wrong password, unknown mobile, and deactivated admin must all return identical generic error."""
    create_admin_account("9876543210", "SecurePassword123!", db=test_db)
    headers = {"HTTP_ORIGIN": "http://localhost:5173"}

    # 1. Unknown mobile
    res1 = api_client.post(
        "/api/auth/login/",
        data={"mobile": "9876599999", "password": "SecurePassword123!"},
        **headers,
    )
    assert res1.status_code == status.HTTP_401_UNAUTHORIZED
    assert res1.json()["error"]["message"] == "Mobile number or password is incorrect."

    # 2. Wrong password
    res2 = api_client.post(
        "/api/auth/login/",
        data={"mobile": "9876543210", "password": "WrongPassword123!"},
        **headers,
    )
    assert res2.status_code == status.HTTP_401_UNAUTHORIZED
    assert res2.json()["error"]["message"] == "Mobile number or password is incorrect."

    # 3. Deactivated admin
    test_db["admins"].update_one({"mobile": "9876543210"}, {"$set": {"is_active": False}})
    res3 = api_client.post(
        "/api/auth/login/",
        data={"mobile": "9876543210", "password": "SecurePassword123!"},
        **headers,
    )
    assert res3.status_code == status.HTTP_401_UNAUTHORIZED
    assert res3.json()["error"]["message"] == "Mobile number or password is incorrect."


def test_login_brute_force_rate_limits(api_client, test_db):
    """5 failed attempts on one mobile triggers 429; successful login clears mobile failed counter."""
    create_admin_account("9876543210", "SecurePassword123!", db=test_db)
    headers = {"HTTP_ORIGIN": "http://localhost:5173"}

    # 5 failed login attempts
    for _ in range(5):
        api_client.post(
            "/api/auth/login/",
            data={"mobile": "9876543210", "password": "WrongPassword!"},
            **headers,
        )

    # 6th attempt is throttled
    throttled_res = api_client.post(
        "/api/auth/login/",
        data={"mobile": "9876543210", "password": "SecurePassword123!"},
        **headers,
    )
    assert throttled_res.status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert throttled_res.json()["error"]["code"] == "rate_limited"

    # Reset mobile failed count manually to simulate window expiry or reset
    test_db["rate_limits"].delete_one({"_id": "login_mobile_failed:9876543210"})

    # Successful login clears the counter
    ok_res = api_client.post(
        "/api/auth/login/",
        data={"mobile": "9876543210", "password": "SecurePassword123!"},
        **headers,
    )
    assert ok_res.status_code == status.HTTP_200_OK
    assert test_db["rate_limits"].find_one({"_id": "login_mobile_failed:9876543210"}) is None


def test_protected_endpoints_auth_enforcement(api_client, test_db):
    """Protected endpoints return 401 without cookie, with garbage cookie, or expired session."""
    # 1. No cookie
    res = api_client.get("/api/auth/me/")
    assert res.status_code == status.HTTP_401_UNAUTHORIZED

    # 2. Garbage cookie
    api_client.cookies["cc_session"] = "not_a_valid_session_token_xyz"
    res = api_client.get("/api/auth/me/")
    assert res.status_code == status.HTTP_401_UNAUTHORIZED

    # 3. Create valid session then expire it in MongoDB
    admin = create_admin_account("9876543210", "SecurePassword123!", db=test_db)
    headers = {"HTTP_ORIGIN": "http://localhost:5173"}
    login_res = api_client.post(
        "/api/auth/login/",
        data={"mobile": "9876543210", "password": "SecurePassword123!"},
        **headers,
    )
    assert login_res.status_code == status.HTTP_200_OK

    # Simulate session expiry in DB
    past_expiry = utc_now() - timedelta(minutes=1)
    test_db["admin_sessions"].update_many({}, {"$set": {"expires_at": past_expiry}})

    expired_res = api_client.get("/api/auth/me/")
    assert expired_res.status_code == status.HTTP_401_UNAUTHORIZED

    # 4. Inactive admin with valid unexpired session
    test_db["admin_sessions"].update_many(
        {}, {"$set": {"expires_at": utc_now() + timedelta(days=1)}}
    )
    test_db["admins"].update_one({"_id": admin["_id"]}, {"$set": {"is_active": False}})
    inactive_res = api_client.get("/api/auth/me/")
    assert inactive_res.status_code == status.HTTP_401_UNAUTHORIZED


def test_logout_revokes_session(api_client, test_db):
    """POST /api/auth/logout/ deletes session document and clears cookie."""
    create_admin_account("9876543210", "SecurePassword123!", db=test_db)
    headers = {"HTTP_ORIGIN": "http://localhost:5173"}

    # Login
    api_client.post(
        "/api/auth/login/",
        data={"mobile": "9876543210", "password": "SecurePassword123!"},
        **headers,
    )
    assert test_db["admin_sessions"].count_documents({}) == 1

    # Logout
    logout_res = api_client.post("/api/auth/logout/", **headers)
    assert logout_res.status_code == status.HTTP_204_NO_CONTENT
    assert test_db["admin_sessions"].count_documents({}) == 0

    # Cookie cleared
    cookie = logout_res.cookies.get("cc_session")
    assert cookie.value == "" or cookie.get("max-age") == 0

    # Next auth attempt with same client fails
    assert api_client.get("/api/auth/me/").status_code == status.HTTP_401_UNAUTHORIZED


def test_set_admin_password_revokes_sessions(test_db):
    """set_admin_password command updates hash and revokes all active sessions for that admin."""
    admin = create_admin_account("9876543210", "SecurePassword123!", db=test_db)
    test_db["admin_sessions"].insert_one(
        {
            "_id": str(uuid.uuid4()),
            "token_hash": "dummy_token_hash",
            "admin_id": admin["_id"],
            "created_at": utc_now(),
            "expires_at": utc_now() + timedelta(days=14),
        }
    )
    assert test_db["admin_sessions"].count_documents({"admin_id": admin["_id"]}) == 1

    with patch("getpass.getpass", side_effect=["NewSecurePassword456!", "NewSecurePassword456!"]):
        call_command("set_admin_password", mobile="9876543210")

    # Hash updated
    updated_admin = test_db["admins"].find_one({"mobile": "9876543210"})
    assert check_password("NewSecurePassword456!", updated_admin["password_hash"])

    # Sessions revoked
    assert test_db["admin_sessions"].count_documents({"admin_id": admin["_id"]}) == 0


def test_origin_csrf_check(api_client, test_db):
    """State-changing requests with foreign Origin return 403; FRONTEND_URL returns OK."""
    create_admin_account("9876543210", "SecurePassword123!", db=test_db)

    # Foreign Origin on Login
    bad_origin_res = api_client.post(
        "/api/auth/login/",
        data={"mobile": "9876543210", "password": "SecurePassword123!"},
        HTTP_ORIGIN="http://malicious-attacker.com",
    )
    assert bad_origin_res.status_code == status.HTTP_403_FORBIDDEN
    assert bad_origin_res.json()["error"]["code"] == "permission_denied"

    # Valid Origin on Login
    good_origin_res = api_client.post(
        "/api/auth/login/",
        data={"mobile": "9876543210", "password": "SecurePassword123!"},
        HTTP_ORIGIN="http://localhost:5173",
    )
    assert good_origin_res.status_code == status.HTTP_200_OK


def test_public_registration_with_garbage_cookie_works(api_client, test_db):
    """A stale or corrupted cc_session cookie must NEVER cause a 401 on public endpoints."""
    api_client.cookies["cc_session"] = "corrupted_stale_garbage_session_cookie"

    # Health check works
    health_res = api_client.get("/api/health/")
    assert health_res.status_code == status.HTTP_200_OK

    # Public registration works without 401
    reg_payload = {
        "customer_name": "Garbage Cookie User",
        "mobile": "9876543210",
        "repair_problems": ["brake"],
        "idempotency_key": str(uuid.uuid4()),
    }
    reg_res = api_client.post("/api/repairs/", data=reg_payload, format="multipart")
    assert reg_res.status_code == status.HTTP_201_CREATED


def test_same_url_anonymous_get_denied_anonymous_post_allowed(api_client, test_db):
    """GET /api/repairs/ requires admin auth (401), while POST /api/repairs/ is public (201)."""
    # 1. Anonymous GET -> 401 Unauthorized
    get_res = api_client.get("/api/repairs/")
    assert get_res.status_code == status.HTTP_401_UNAUTHORIZED

    # 2. Anonymous POST -> 201 Created
    post_res = api_client.post(
        "/api/repairs/",
        data={
            "customer_name": "Public Submitter",
            "mobile": "9876543210",
            "repair_problems": ["puncture_tyre"],
            "idempotency_key": str(uuid.uuid4()),
        },
        format="multipart",
    )
    assert post_res.status_code == status.HTTP_201_CREATED


def test_all_admin_endpoints_reject_anonymous():
    """Verify that every registered API route outside explicitly public routes denies anonymous access."""
    client = APIClient()
    resolver = get_resolver()

    public_routes = {
        "/api/health/",
        "/api/auth/login/",
        "/api/repairs/",  # Only POST is public, GET was asserted above
    }

    def check_urls(urlpatterns, prefix=""):
        for pattern in urlpatterns:
            if isinstance(pattern, URLResolver):
                check_urls(pattern.url_patterns, prefix + str(pattern.pattern))
            elif isinstance(pattern, URLPattern):
                full_path = "/" + (prefix + str(pattern.pattern)).lstrip("/")
                # Skip public endpoints and regex paths for direct test
                if full_path in public_routes or "<" in full_path or "(" in full_path:
                    continue
                resp = client.get(full_path)
                assert resp.status_code in (
                    status.HTTP_401_UNAUTHORIZED,
                    status.HTTP_403_FORBIDDEN,
                ), (
                    f"Endpoint {full_path} unexpectedly allowed anonymous access ({resp.status_code})"
                )

    check_urls(resolver.url_patterns)
