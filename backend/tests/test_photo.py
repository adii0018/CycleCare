"""Tests for photo validation, magic bytes inspection, and get_photo service function."""

import uuid
from datetime import timedelta
from unittest.mock import patch

import pytest
from django.core.exceptions import RequestDataTooBig
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status
from rest_framework.exceptions import ValidationError

from apps.core.utils import utc_now
from apps.repairs.photo_validation import (
    detect_magic_bytes_type,
    validate_photo_file,
)
from apps.repairs.repository import insert_photo
from apps.repairs.services import get_photo, validate_and_prepare_photos


def test_detect_magic_bytes(valid_jpeg_bytes, valid_png_bytes, valid_webp_bytes):
    """Verify magic bytes detection matches standard image formats."""
    assert detect_magic_bytes_type(valid_jpeg_bytes) == "image/jpeg"
    assert detect_magic_bytes_type(valid_png_bytes) == "image/png"
    assert detect_magic_bytes_type(valid_webp_bytes) == "image/webp"
    assert detect_magic_bytes_type(b"NOT_AN_IMAGE_FILE_HEADER") is None


def test_empty_photo_file_rejected():
    """An empty 0-byte file must raise ValidationError."""
    file_obj = SimpleUploadedFile("empty.jpg", b"", content_type="image/jpeg")
    with pytest.raises(ValidationError, match="Photo file is empty"):
        validate_photo_file(file_obj)


def test_photo_exceeding_400kb_rejected(valid_jpeg_bytes):
    """A photo file strictly exceeding 400 KB must be rejected."""
    oversized_data = valid_jpeg_bytes + (b"\x00" * (400 * 1024 + 1))
    file_obj = SimpleUploadedFile("large.jpg", oversized_data, content_type="image/jpeg")
    with pytest.raises(ValidationError, match="exceeds the maximum allowed size"):
        validate_photo_file(file_obj)


def test_unsupported_declared_content_type():
    """Unsupported content types such as PDF or GIF must be rejected."""
    file_obj = SimpleUploadedFile("doc.pdf", b"%PDF-1.4...", content_type="application/pdf")
    with pytest.raises(ValidationError, match="Unsupported file format"):
        validate_photo_file(file_obj)


def test_fake_extension_and_mismatched_magic_bytes(valid_png_bytes):
    """A PNG file declared as image/jpeg must be rejected."""
    fake_file = SimpleUploadedFile("fake.jpg", valid_png_bytes, content_type="image/jpeg")
    with pytest.raises(ValidationError, match="does not match declared type"):
        validate_photo_file(fake_file)


def test_more_than_three_photos_rejected(valid_jpeg_bytes):
    """Attempting to upload 4 photos must be rejected."""
    files = [
        SimpleUploadedFile(f"photo{i}.jpg", valid_jpeg_bytes, content_type="image/jpeg")
        for i in range(4)
    ]
    with pytest.raises(ValidationError) as exc_info:
        validate_and_prepare_photos(files)
    assert "photos" in exc_info.value.detail


def test_get_photo_active(test_db, valid_jpeg_bytes):
    """get_photo returns bytes and content_type for valid active photos."""
    photo_id = str(uuid.uuid4())
    now = utc_now()
    expires_at = now + timedelta(days=30)

    insert_photo(
        photo_id=photo_id,
        content_type="image/jpeg",
        size_bytes=len(valid_jpeg_bytes),
        data=valid_jpeg_bytes,
        uploaded_at=now,
        expires_at=expires_at,
        db=test_db,
    )

    data, content_type, status = get_photo(photo_id, db=test_db)
    assert status == "active"
    assert data == valid_jpeg_bytes
    assert content_type == "image/jpeg"


def test_get_photo_expired_past_expires_at(test_db, valid_png_bytes):
    """get_photo returns 'expired' even if document still exists in DB."""
    photo_id = str(uuid.uuid4())
    past = utc_now() - timedelta(days=1)
    insert_photo(
        photo_id=photo_id,
        content_type="image/png",
        size_bytes=len(valid_png_bytes),
        data=valid_png_bytes,
        uploaded_at=past - timedelta(days=30),
        expires_at=past,
        db=test_db,
    )

    data, content_type, status = get_photo(photo_id, db=test_db)
    assert status == "expired"
    assert data is None
    assert content_type is None


def test_get_photo_not_found(test_db):
    """get_photo returns 'not_found' for unknown photo ID."""
    data, content_type, status = get_photo(str(uuid.uuid4()), db=test_db)
    assert status == "not_found"
    assert data is None
    assert content_type is None


def test_oversized_payload_returns_413(api_client):
    """Oversized request payload triggering RequestDataTooBig returns friendly 413 error envelope."""
    with patch(
        "apps.repairs.views.CustomerRegistrationView.initial",
        side_effect=RequestDataTooBig("Payload too large"),
    ):
        response = api_client.post("/api/repairs/", data={}, format="multipart")
        assert response.status_code == status.HTTP_413_REQUEST_ENTITY_TOO_LARGE
        data = response.json()
        assert "error" in data
        assert data["error"]["code"] == "payload_too_large"
        assert "under 400 KB" in data["error"]["message"]
