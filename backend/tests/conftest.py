"""Pytest configuration and safety fixtures for CycleCare tests."""

import os

import pytest
from django.conf import settings
from rest_framework.test import APIClient

from infrastructure.indexes import ensure_all_indexes
from infrastructure.mongodb import close_mongo_client, get_database, get_mongo_client

# Force test database name
TEST_DB_NAME = "cyclecare_test"
os.environ["MONGODB_DATABASE"] = TEST_DB_NAME
settings.MONGODB_DATABASE = TEST_DB_NAME

# Safety check
assert "test" in settings.MONGODB_DATABASE, (
    f"SAFETY ERROR: Test database name must contain 'test'. Got: {settings.MONGODB_DATABASE}"
)


@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    """Verify test database safety and ensure indexes are initialized."""
    client = get_mongo_client()
    db = client[TEST_DB_NAME]
    assert "test" in db.name, f"Refusing to touch non-test database: {db.name}"

    # Drop test database once at session start
    client.drop_database(TEST_DB_NAME)

    # Create indexes
    ensure_all_indexes(db)

    yield db

    # Teardown: drop test database and close client
    assert "test" in db.name, "Refusing to drop non-test database!"
    client.drop_database(TEST_DB_NAME)
    close_mongo_client()


@pytest.fixture(autouse=True)
def clear_collections():
    """Clear collection data between tests to ensure test isolation."""
    db = get_database(TEST_DB_NAME)
    for col in ["repairs", "photos", "counters", "rate_limits", "admins", "admin_sessions"]:
        db[col].delete_many({})
    yield


@pytest.fixture
def test_db():
    """Provide the isolated test database instance."""
    return get_database(TEST_DB_NAME)


@pytest.fixture
def api_client():
    """Provide a DRF APIClient instance."""
    return APIClient()


@pytest.fixture
def valid_jpeg_bytes() -> bytes:
    """Return valid JPEG binary data with proper magic bytes."""
    return b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x00\x00\x01\x00\x01\x00\x00\xff\xdb\x00C\x00\xff\xd9"


@pytest.fixture
def valid_png_bytes() -> bytes:
    """Return valid PNG binary data with proper magic bytes."""
    return (
        b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00"
        b"\x1f\x15c4\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82"
    )


@pytest.fixture
def valid_webp_bytes() -> bytes:
    """Return valid WebP binary data with proper magic bytes."""
    return b"RIFF\x1a\x00\x00\x00WEBPVP8 \x0e\x00\x00\x00\x30\x01\x00\x9d\x01\x2a\x01\x00\x01\x00\x02\x00\x34\x25\xa4\x00"


def make_uploaded_file(data: bytes, filename: str, content_type: str):
    """Helper to construct an UploadedFile from bytes."""
    from django.core.files.uploadedfile import SimpleUploadedFile

    return SimpleUploadedFile(filename, data, content_type=content_type)
