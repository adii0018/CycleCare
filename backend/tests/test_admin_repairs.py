"""Tests for admin repair APIs: stats, list/search, detail, archive, manual, and photo streaming."""

import uuid
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from apps.authentication.services import create_admin_account
from apps.core.utils import utc_now
from apps.repairs.repository import insert_photo
from apps.repairs.services import (
    get_ist_day_boundaries,
    register_customer_repair,
)


def auth_headers(api_client, test_db, mobile="9876543210"):
    """Helper to create an admin, log in, and return headers."""
    create_admin_account(mobile, "SecurePassword123!", db=test_db)
    login_headers = {"HTTP_ORIGIN": "http://localhost:5173"}
    resp = api_client.post(
        "/api/auth/login/",
        data={"mobile": mobile, "password": "SecurePassword123!"},
        **login_headers,
    )
    assert resp.status_code == status.HTTP_200_OK
    return login_headers


def test_admin_stats_counts_and_ist_boundaries(api_client, test_db):
    """Stats calculates total, today (in IST), archived, and expired_photos correctly."""
    headers = auth_headers(api_client, test_db)

    now = utc_now()
    # 1. Create active record today
    register_customer_repair(
        {
            "customer_name": "Today Active",
            "mobile": "9876543211",
            "repair_problems": ["puncture_tyre"],
            "other_problem_text": None,
            "additional_details": None,
            "idempotency_key": str(uuid.uuid4()),
        },
        photo_files=[],
        db=test_db,
    )

    # 2. Create archived record
    _, _ = register_customer_repair(
        {
            "customer_name": "Archived User",
            "mobile": "9876543212",
            "repair_problems": ["brake"],
            "other_problem_text": None,
            "additional_details": None,
            "idempotency_key": str(uuid.uuid4()),
        },
        photo_files=[],
        db=test_db,
    )
    test_db["repairs"].update_one(
        {"customer_name": "Archived User"},
        {"$set": {"archived": True, "archived_at": now}},
    )

    # 3. Create record with expired photos (all photos past expires_at)
    expired_time = now - timedelta(days=35)
    test_db["repairs"].insert_one(
        {
            "repair_id": "CC-2026-99999",
            "customer_name": "Expired Photo User",
            "search_name": "expired photo user",
            "mobile": "9876543213",
            "repair_problems": ["chain"],
            "photos": [
                {
                    "photo_id": "p-exp-1",
                    "uploaded_at": expired_time - timedelta(days=30),
                    "expires_at": expired_time,
                }
            ],
            "source": "customer",
            "idempotency_key": str(uuid.uuid4()),
            "received_at": expired_time,
            "archived": False,
            "archived_at": None,
        }
    )

    resp = api_client.get("/api/repairs/stats/", **headers)
    assert resp.status_code == status.HTTP_200_OK
    stats = resp.json()

    assert stats["total"] == 3
    assert stats["today"] == 2
    assert stats["archived"] == 1
    assert stats["expired_photos"] == 1

    # Verify IST boundary rollover (18:29:59 UTC is 23:59:59 IST, 18:30:00 UTC is next day 00:00:00 IST)
    dt_ist_night = datetime(2026, 12, 31, 18, 29, 59, tzinfo=UTC)
    start_utc, end_utc = get_ist_day_boundaries(dt_ist_night)
    ist_zone = ZoneInfo("Asia/Kolkata")
    assert start_utc.astimezone(ist_zone).day == 31
    assert end_utc.astimezone(ist_zone).day == 31

    dt_ist_next_day = datetime(2026, 12, 31, 18, 30, 0, tzinfo=UTC)
    start_utc2, end_utc2 = get_ist_day_boundaries(dt_ist_next_day)
    assert start_utc2.astimezone(ist_zone).day == 1
    assert start_utc2.astimezone(ist_zone).year == 2027


def test_admin_repair_list_and_pagination(api_client, test_db):
    """Repair list supports pagination, max page_size cap of 50, and newest first sorting."""
    headers = auth_headers(api_client, test_db)

    # Insert 25 dummy records
    for i in range(25):
        test_db["repairs"].insert_one(
            {
                "repair_id": f"CC-2026-{i + 1:05d}",
                "customer_name": f"Customer {i + 1}",
                "search_name": f"customer {i + 1}",
                "mobile": f"98765{i + 1:05d}",
                "repair_problems": ["puncture_tyre"],
                "other_problem_text": None,
                "photos": [],
                "source": "customer",
                "received_at": utc_now() + timedelta(minutes=i),
                "archived": False,
                "archived_at": None,
            }
        )

    # Page 1, page_size 10
    res = api_client.get("/api/repairs/?page=1&page_size=10", **headers)
    assert res.status_code == status.HTTP_200_OK
    data = res.json()
    assert data["total"] == 25
    assert data["total_pages"] == 3
    assert data["page"] == 1
    assert data["page_size"] == 10
    assert len(data["results"]) == 10

    # Newest first sorting: first result should be Customer 25
    assert data["results"][0]["repair_id"] == "CC-2026-00025"

    # page_size cap at 50
    res_cap = api_client.get("/api/repairs/?page_size=100", **headers)
    assert res_cap.json()["page_size"] == 50


def test_admin_search_queries(api_client, test_db):
    """Test safe query builder across repair_id, 10-digit mobile, mobile prefix, and name."""
    headers = auth_headers(api_client, test_db)

    # Seed records
    test_db["repairs"].insert_many(
        [
            {
                "repair_id": "CC-2026-00001",
                "customer_name": "Rohan Sharma",
                "search_name": "rohan sharma",
                "mobile": "9876543210",
                "repair_problems": ["brake"],
                "photos": [],
                "source": "customer",
                "received_at": utc_now(),
                "archived": False,
            },
            {
                "repair_id": "CC-2026-00002",
                "customer_name": "राहुल वर्मा",
                "search_name": "राहुल वर्मा",
                "mobile": "9876511111",
                "repair_problems": ["gear"],
                "photos": [],
                "source": "customer",
                "received_at": utc_now(),
                "archived": False,
            },
        ]
    )

    # 1. Search by exact repair_id
    res1 = api_client.get("/api/repairs/?q=CC-2026-00001", **headers)
    assert res1.json()["total"] == 1
    assert res1.json()["results"][0]["customer_name"] == "Rohan Sharma"

    # 2. Search by exact 10-digit mobile
    res2 = api_client.get("/api/repairs/?q=9876511111", **headers)
    assert res2.json()["total"] == 1
    assert res2.json()["results"][0]["repair_id"] == "CC-2026-00002"

    # 3. Search by mobile prefix
    res3 = api_client.get("/api/repairs/?q=98765", **headers)
    assert res3.json()["total"] == 2

    # 4. Search by Devanagari Hindi name
    res4 = api_client.get("/api/repairs/?q=राहुल", **headers)
    assert res4.json()["total"] == 1
    assert res4.json()["results"][0]["repair_id"] == "CC-2026-00002"

    # 5. Regex special characters must not crash or cause ReDoS
    res5 = api_client.get("/api/repairs/?q=.*+?^${}()|[]\\", **headers)
    assert res5.status_code == status.HTTP_200_OK
    assert res5.json()["total"] == 0

    # 6. Overlong query safely truncated
    long_q = "a" * 100
    res6 = api_client.get(f"/api/repairs/?q={long_q}", **headers)
    assert res6.status_code == status.HTTP_200_OK


def test_admin_repair_detail_and_photos(api_client, test_db, valid_jpeg_bytes):
    """GET /api/repairs/<repair_id>/ returns complete detail, computes photo expiration."""
    headers = auth_headers(api_client, test_db)
    now = utc_now()
    photo_id_active = str(uuid.uuid4())
    photo_id_expired = str(uuid.uuid4())

    insert_photo(
        photo_id=photo_id_active,
        content_type="image/jpeg",
        size_bytes=len(valid_jpeg_bytes),
        data=valid_jpeg_bytes,
        uploaded_at=now,
        expires_at=now + timedelta(days=30),
        db=test_db,
    )
    insert_photo(
        photo_id=photo_id_expired,
        content_type="image/jpeg",
        size_bytes=len(valid_jpeg_bytes),
        data=valid_jpeg_bytes,
        uploaded_at=now - timedelta(days=35),
        expires_at=now - timedelta(days=5),
        db=test_db,
    )

    test_db["repairs"].insert_one(
        {
            "repair_id": "CC-2026-00010",
            "customer_name": "Detail Test User",
            "search_name": "detail test user",
            "mobile": "9876543210",
            "repair_problems": ["puncture_tyre"],
            "other_problem_text": None,
            "additional_details": "Front tyre issue",
            "photos": [
                {
                    "photo_id": photo_id_active,
                    "uploaded_at": now,
                    "expires_at": now + timedelta(days=30),
                },
                {
                    "photo_id": photo_id_expired,
                    "uploaded_at": now - timedelta(days=35),
                    "expires_at": now - timedelta(days=5),
                },
            ],
            "source": "customer",
            "received_at": now,
            "archived": False,
            "archived_at": None,
        }
    )

    res = api_client.get("/api/repairs/CC-2026-00010/", **headers)
    assert res.status_code == status.HTTP_200_OK
    detail = res.json()

    assert detail["repair_id"] == "CC-2026-00010"
    assert detail["customer_name"] == "Detail Test User"
    assert len(detail["photos"]) == 2

    active_photo = next(p for p in detail["photos"] if p["id"] == photo_id_active)
    expired_photo = next(p for p in detail["photos"] if p["id"] == photo_id_expired)

    assert active_photo["expired"] is False
    assert active_photo["url"] == f"/api/repairs/CC-2026-00010/photos/{photo_id_active}/"

    assert expired_photo["expired"] is True

    # 404 for unknown repair ID
    assert (
        api_client.get("/api/repairs/CC-2026-99999/", **headers).status_code
        == status.HTTP_404_NOT_FOUND
    )


def test_admin_photo_streaming(api_client, test_db, valid_jpeg_bytes):
    """GET /api/repairs/<repair_id>/photos/<photo_id>/ streams binary bytes or returns 410 / 404."""
    headers = auth_headers(api_client, test_db)
    now = utc_now()
    photo_id_active = str(uuid.uuid4())
    photo_id_expired = str(uuid.uuid4())
    unrelated_photo_id = str(uuid.uuid4())

    insert_photo(
        photo_id=photo_id_active,
        content_type="image/jpeg",
        size_bytes=len(valid_jpeg_bytes),
        data=valid_jpeg_bytes,
        uploaded_at=now,
        expires_at=now + timedelta(days=30),
        db=test_db,
    )
    insert_photo(
        photo_id=photo_id_expired,
        content_type="image/jpeg",
        size_bytes=len(valid_jpeg_bytes),
        data=valid_jpeg_bytes,
        uploaded_at=now - timedelta(days=35),
        expires_at=now - timedelta(days=5),
        db=test_db,
    )

    test_db["repairs"].insert_one(
        {
            "repair_id": "CC-2026-00020",
            "customer_name": "Stream Test",
            "mobile": "9876543210",
            "photos": [
                {
                    "photo_id": photo_id_active,
                    "uploaded_at": now,
                    "expires_at": now + timedelta(days=30),
                },
                {
                    "photo_id": photo_id_expired,
                    "uploaded_at": now - timedelta(days=35),
                    "expires_at": now - timedelta(days=5),
                },
            ],
            "received_at": now,
        }
    )

    # 1. Active photo streams successfully with proper headers
    res = api_client.get(f"/api/repairs/CC-2026-00020/photos/{photo_id_active}/", **headers)
    assert res.status_code == status.HTTP_200_OK
    assert res["Content-Type"] == "image/jpeg"
    assert "private, max-age=300" in res["Cache-Control"]
    assert res["X-Content-Type-Options"] == "nosniff"
    assert res.content == valid_jpeg_bytes

    # 2. Expired photo returns 410 Gone with friendly error envelope
    res_exp = api_client.get(f"/api/repairs/CC-2026-00020/photos/{photo_id_expired}/", **headers)
    assert res_exp.status_code == status.HTTP_410_GONE
    assert res_exp.json()["error"]["code"] == "photo_expired"
    assert res_exp.json()["error"]["message"] == "Photo Expired"

    # 3. Photo belonging to another record returns 404
    res_unrel = api_client.get(
        f"/api/repairs/CC-2026-00020/photos/{unrelated_photo_id}/", **headers
    )
    assert res_unrel.status_code == status.HTTP_404_NOT_FOUND


def test_manual_repair_registration(api_client, test_db, valid_jpeg_bytes):
    """POST /api/repairs/manual/ creates record with source='admin' and shared validation."""
    headers = auth_headers(api_client, test_db)
    photo = SimpleUploadedFile("bike.jpg", valid_jpeg_bytes, content_type="image/jpeg")

    payload = {
        "customer_name": "Manual Walk-in Customer",
        "mobile": "9876543210",
        "repair_problems": ["brake", "wheel"],
        "idempotency_key": str(uuid.uuid4()),
        "photos": [photo],
    }

    res = api_client.post("/api/repairs/manual/", data=payload, format="multipart", **headers)
    assert res.status_code == status.HTTP_201_CREATED
    data = res.json()
    assert data["repair_id"].startswith("CC-")

    # Document check
    doc = test_db["repairs"].find_one({"repair_id": data["repair_id"]})
    assert doc is not None
    assert doc["source"] == "admin"
    assert len(doc["photos"]) == 1


def test_archive_and_unarchive_repair(api_client, test_db):
    """PATCH /api/repairs/<repair_id>/archive/ updates archived and archived_at without touching photos."""
    headers = auth_headers(api_client, test_db)
    now = utc_now()
    test_db["repairs"].insert_one(
        {
            "repair_id": "CC-2026-00030",
            "customer_name": "Archive Test",
            "mobile": "9876543210",
            "photos": [
                {"photo_id": "p1", "uploaded_at": now, "expires_at": now + timedelta(days=30)}
            ],
            "archived": False,
            "archived_at": None,
        }
    )

    # Archive
    res_arch = api_client.patch(
        "/api/repairs/CC-2026-00030/archive/",
        data={"archived": True},
        format="json",
        **headers,
    )
    assert res_arch.status_code == status.HTTP_200_OK
    data_arch = res_arch.json()
    assert data_arch["archived"] is True
    assert data_arch["archived_at"] is not None

    # Unarchive
    res_unarch = api_client.patch(
        "/api/repairs/CC-2026-00030/archive/",
        data={"archived": False},
        format="json",
        **headers,
    )
    assert res_unarch.status_code == status.HTTP_200_OK
    data_unarch = res_unarch.json()
    assert data_unarch["archived"] is False
    assert data_unarch["archived_at"] is None

    # Idempotent re-unarchive is fine
    res_again = api_client.patch(
        "/api/repairs/CC-2026-00030/archive/",
        data={"archived": False},
        format="json",
        **headers,
    )
    assert res_again.status_code == status.HTTP_200_OK

    # 404 for unknown repair
    res_404 = api_client.patch(
        "/api/repairs/CC-2026-99999/archive/",
        data={"archived": True},
        format="json",
        **headers,
    )
    assert res_404.status_code == status.HTTP_404_NOT_FOUND
