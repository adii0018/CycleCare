"""Comprehensive tests for customer bicycle repair registration."""

import uuid
from datetime import timedelta
from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from pymongo.errors import PyMongoError
from rest_framework import status

from apps.repairs.services import register_customer_repair


def test_valid_registration_with_zero_photos(api_client, test_db):
    """Registering with 0 photos returns 201 with only allowed response fields."""
    payload = {
        "customer_name": "Rohan Gupta",
        "mobile": "9876543210",
        "repair_problems": ["puncture_tyre", "brake"],
        "additional_details": "Front tyre valve issue",
        "idempotency_key": str(uuid.uuid4()),
    }
    response = api_client.post("/api/repairs/", data=payload, format="multipart")
    assert response.status_code == status.HTTP_201_CREATED

    data = response.json()
    # Response fields check: only repair_id, customer_name, received_at
    assert set(data.keys()) == {"repair_id", "customer_name", "received_at"}
    assert data["repair_id"].startswith("CC-")
    assert data["customer_name"] == "Rohan Gupta"

    # Database state verification
    doc = test_db["repairs"].find_one({"repair_id": data["repair_id"]})
    assert doc is not None
    assert doc["mobile"] == "9876543210"
    assert doc["search_name"] == "rohan gupta"
    assert doc["photos"] == []
    assert doc["archived"] is False
    assert doc["archived_at"] is None
    assert doc["source"] == "customer"


def test_valid_registration_with_three_photos(
    api_client, test_db, valid_jpeg_bytes, valid_png_bytes, valid_webp_bytes
):
    """Registering with 3 valid photos creates repair and photo records with 30-day expiry."""
    photo1 = SimpleUploadedFile("bike1.jpg", valid_jpeg_bytes, content_type="image/jpeg")
    photo2 = SimpleUploadedFile("bike2.png", valid_png_bytes, content_type="image/png")
    photo3 = SimpleUploadedFile("bike3.webp", valid_webp_bytes, content_type="image/webp")

    payload = {
        "customer_name": "Aarav Patel",
        "mobile": "+91 9988776655",
        "repair_problems": ["chain", "gear"],
        "idempotency_key": str(uuid.uuid4()),
        "photos": [photo1, photo2, photo3],
    }

    response = api_client.post("/api/repairs/", data=payload, format="multipart")
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()

    # Never leak mobile, _id, or photo identifiers in response
    assert set(data.keys()) == {"repair_id", "customer_name", "received_at"}

    # Verify photos collection
    repair_doc = test_db["repairs"].find_one({"repair_id": data["repair_id"]})
    assert len(repair_doc["photos"]) == 3
    assert repair_doc["mobile"] == "9988776655"

    for meta in repair_doc["photos"]:
        p_doc = test_db["photos"].find_one({"_id": meta["photo_id"]})
        assert p_doc is not None
        assert p_doc["data"] is not None
        # Requirement 12: expires_at is exactly uploaded_at + 30 days
        expected_expiry = meta["uploaded_at"] + timedelta(days=30)
        assert abs((meta["expires_at"] - expected_expiry).total_seconds()) < 1


def test_customer_name_validation(api_client):
    """Name must be 2-60 chars, support Devanagari, and reject special characters."""
    # 1 char -> Bad
    resp = api_client.post(
        "/api/repairs/",
        data={
            "customer_name": "A",
            "mobile": "9876543210",
            "repair_problems": ["brake"],
            "idempotency_key": str(uuid.uuid4()),
        },
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "customer_name" in resp.json()["error"]["fields"]

    # Devanagari name -> Valid
    resp = api_client.post(
        "/api/repairs/",
        data={
            "customer_name": "राहुल शर्मा",
            "mobile": "9876543210",
            "repair_problems": ["brake"],
            "idempotency_key": str(uuid.uuid4()),
        },
    )
    assert resp.status_code == status.HTTP_201_CREATED
    assert resp.json()["customer_name"] == "राहुल शर्मा"

    # Name with numbers / invalid characters -> Bad
    resp = api_client.post(
        "/api/repairs/",
        data={
            "customer_name": "User123!",
            "mobile": "9876543210",
            "repair_problems": ["brake"],
            "idempotency_key": str(uuid.uuid4()),
        },
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


def test_mobile_number_normalization_and_validation(api_client):
    """Test mobile normalization (+91, spaces, 0) and rejection of invalid numbers."""
    # Valid formats with prefix, spaces, dashes
    valid_numbers = [
        "+91 9876543210",
        "91-9876543210",
        "09876543210",
        "98765 43210",
    ]
    for num in valid_numbers:
        resp = api_client.post(
            "/api/repairs/",
            data={
                "customer_name": "Test User",
                "mobile": num,
                "repair_problems": ["brake"],
                "idempotency_key": str(uuid.uuid4()),
            },
        )
        assert resp.status_code == status.HTTP_201_CREATED

    # Invalid mobile numbers
    invalid_numbers = [
        "987654321",  # 9 digits
        "5876543210",  # Starts with 5
        "98765432101",  # 11 digits
        "9876543abc",  # Letters
    ]
    for num in invalid_numbers:
        resp = api_client.post(
            "/api/repairs/",
            data={
                "customer_name": "Test User",
                "mobile": num,
                "repair_problems": ["brake"],
                "idempotency_key": str(uuid.uuid4()),
            },
        )
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "mobile" in resp.json()["error"]["fields"]


def test_repair_problems_validation(api_client):
    """Test required problems, unknown problem code, and 'other' text requirement."""
    # No problems selected
    resp = api_client.post(
        "/api/repairs/",
        data={
            "customer_name": "Test User",
            "mobile": "9876543210",
            "repair_problems": [],
            "idempotency_key": str(uuid.uuid4()),
        },
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST

    # Unknown problem code
    resp = api_client.post(
        "/api/repairs/",
        data={
            "customer_name": "Test User",
            "mobile": "9876543210",
            "repair_problems": ["engine_problem"],
            "idempotency_key": str(uuid.uuid4()),
        },
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST

    # 'other' selected without other_problem_text
    resp = api_client.post(
        "/api/repairs/",
        data={
            "customer_name": "Test User",
            "mobile": "9876543210",
            "repair_problems": ["other"],
            "idempotency_key": str(uuid.uuid4()),
        },
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "other_problem_text" in resp.json()["error"]["fields"]

    # 'other' with text -> Success
    resp = api_client.post(
        "/api/repairs/",
        data={
            "customer_name": "Test User",
            "mobile": "9876543210",
            "repair_problems": ["other"],
            "other_problem_text": "Handlebar bell broken",
            "idempotency_key": str(uuid.uuid4()),
        },
    )
    assert resp.status_code == status.HTTP_201_CREATED


def test_idempotency_key_twice_returns_200_and_does_not_save_new_photos(
    api_client, test_db, valid_jpeg_bytes
):
    """Same idempotency_key returns original confirmation with 200 and saves no duplicate photos."""
    idem_key = str(uuid.uuid4())
    photo1 = SimpleUploadedFile("p1.jpg", valid_jpeg_bytes, content_type="image/jpeg")

    # First call -> 201
    resp1 = api_client.post(
        "/api/repairs/",
        data={
            "customer_name": "Initial Customer",
            "mobile": "9876543210",
            "repair_problems": ["brake"],
            "idempotency_key": idem_key,
            "photos": [photo1],
        },
        format="multipart",
    )
    assert resp1.status_code == status.HTTP_201_CREATED
    data1 = resp1.json()

    initial_photo_count = test_db["photos"].count_documents({})
    assert initial_photo_count == 1

    # Second call with same idempotency_key and different photo -> 200
    photo2 = SimpleUploadedFile("p2.jpg", valid_jpeg_bytes, content_type="image/jpeg")
    resp2 = api_client.post(
        "/api/repairs/",
        data={
            "customer_name": "Initial Customer",
            "mobile": "9876543210",
            "repair_problems": ["brake"],
            "idempotency_key": idem_key,
            "photos": [photo2],
        },
        format="multipart",
    )
    assert resp2.status_code == status.HTTP_200_OK
    data2 = resp2.json()

    assert data1["repair_id"] == data2["repair_id"]
    assert data1["received_at"] == data2["received_at"]

    # Photo count must NOT increase
    assert test_db["photos"].count_documents({}) == initial_photo_count
    # Repair count must remain 1
    assert test_db["repairs"].count_documents({"idempotency_key": idem_key}) == 1


def test_honeypot_field_returns_fake_success_and_saves_nothing(
    api_client, test_db, valid_jpeg_bytes
):
    """When the honeypot website field is filled, return success but save zero records or photos."""
    photo = SimpleUploadedFile("bot.jpg", valid_jpeg_bytes, content_type="image/jpeg")
    resp = api_client.post(
        "/api/repairs/",
        data={
            "customer_name": "Bot Spammer",
            "mobile": "9876543210",
            "repair_problems": ["brake"],
            "website": "http://spam-link.com",
            "idempotency_key": str(uuid.uuid4()),
            "photos": [photo],
        },
        format="multipart",
    )
    assert resp.status_code == status.HTTP_201_CREATED
    data = resp.json()
    assert data["customer_name"] == "Bot Spammer"

    # Confirm nothing was saved in DB
    assert test_db["repairs"].count_documents({"customer_name": "Bot Spammer"}) == 0
    assert test_db["photos"].count_documents({}) == 0


def test_rollback_on_repair_insertion_failure(test_db, valid_jpeg_bytes):
    """If repair document insertion fails, newly uploaded photos must be rolled back."""
    photo = SimpleUploadedFile("rollback.jpg", valid_jpeg_bytes, content_type="image/jpeg")
    validated_data = {
        "customer_name": "Test User",
        "mobile": "9876543210",
        "repair_problems": ["brake"],
        "other_problem_text": None,
        "additional_details": None,
        "idempotency_key": str(uuid.uuid4()),
        "website": "",
    }

    # Simulate database error during repair insertion
    with (
        patch(
            "apps.repairs.services.insert_repair", side_effect=PyMongoError("Simulated DB failure")
        ),
        pytest.raises(PyMongoError),
    ):
        register_customer_repair(validated_data, [photo], db=test_db)

    # Photos collection must have 0 documents (cleaned up by rollback)
    assert test_db["photos"].count_documents({}) == 0
    assert test_db["repairs"].count_documents({}) == 0
