"""Business logic services for customer repair registration and photo retrieval."""

import logging
import uuid
from datetime import UTC, timedelta
from typing import Any

from django.core.files.uploadedfile import UploadedFile
from pymongo.errors import DuplicateKeyError
from rest_framework.exceptions import ValidationError

from apps.core.utils import to_iso_z, utc_now
from infrastructure.repair_id import generate_repair_id

from .constants import MAX_PHOTOS_PER_REGISTRATION, PHOTO_RETENTION_DAYS
from .photo_validation import ValidatedPhoto, validate_photo_file
from .repository import (
    delete_photos,
    find_photo_by_id,
    find_repair_by_idempotency_key,
    insert_photos_batch,
    insert_repair,
)

logger = logging.getLogger(__name__)


def validate_and_prepare_photos(files: list[UploadedFile]) -> list[ValidatedPhoto]:
    """Validate uploaded photo files against size, MIME, and magic bytes rules."""
    if len(files) > MAX_PHOTOS_PER_REGISTRATION:
        raise ValidationError(
            {"photos": [f"You can upload at most {MAX_PHOTOS_PER_REGISTRATION} photos."]}
        )
    return [validate_photo_file(f) for f in files]


def build_fake_honeypot_response(customer_name: str) -> dict[str, str]:
    """Return a believable confirmation payload for bot submissions without storing anything."""
    return {
        "repair_id": "CC-2026-00000",
        "customer_name": customer_name,
        "received_at": to_iso_z(utc_now()),
    }


def register_customer_repair(
    validated_data: dict[str, Any],
    photo_files: list[UploadedFile],
    db=None,
) -> tuple[dict[str, str], bool]:
    """Process a customer registration submission.

    Returns:
        tuple[dict, bool]: (confirmation_data, is_created)
    """
    # 1. Honeypot check
    if validated_data.get("website"):
        logger.info("Honeypot field triggered. Discarding submission silently.")
        return build_fake_honeypot_response(validated_data["customer_name"]), True

    # 2. Server-side photo validation
    validated_photos = validate_and_prepare_photos(photo_files)

    # 3. Idempotency check: if already processed, return original without saving new photos
    idempotency_key = validated_data["idempotency_key"]
    existing = find_repair_by_idempotency_key(idempotency_key, db=db)
    if existing:
        logger.info("Idempotent submission matched existing repair %s", existing["repair_id"])
        return {
            "repair_id": existing["repair_id"],
            "customer_name": existing["customer_name"],
            "received_at": to_iso_z(existing["received_at"]),
        }, False

    # 4. Generate unique atomic Repair ID
    repair_id = generate_repair_id(db=db)

    # 5. Prepare photo documents
    now = utc_now()
    expires_at = now + timedelta(days=PHOTO_RETENTION_DAYS)
    photo_docs = []
    photo_metadata_list = []
    created_photo_ids = []

    for photo in validated_photos:
        photo_id = str(uuid.uuid4())
        created_photo_ids.append(photo_id)
        photo_docs.append(
            {
                "_id": photo_id,
                "content_type": photo.content_type,
                "size_bytes": photo.size_bytes,
                "data": photo.data,
                "uploaded_at": now,
                "expires_at": expires_at,
            }
        )
        photo_metadata_list.append(
            {
                "photo_id": photo_id,
                "uploaded_at": now,
                "expires_at": expires_at,
            }
        )

    # 6. Insert photos batch into MongoDB
    if photo_docs:
        insert_photos_batch(photo_docs, db=db)

    # 7. Prepare repair document
    repair_doc = {
        "repair_id": repair_id,
        "customer_name": validated_data["customer_name"],
        "search_name": validated_data["customer_name"].lower(),
        "mobile": validated_data["mobile"],
        "repair_problems": validated_data["repair_problems"],
        "other_problem_text": validated_data["other_problem_text"],
        "additional_details": validated_data["additional_details"],
        "photos": photo_metadata_list,
        "source": "customer",
        "idempotency_key": idempotency_key,
        "received_at": now,
        "archived": False,
        "archived_at": None,
    }

    # 8. Insert repair with rollback protection and collision retry
    try:
        insert_repair(repair_doc, db=db)
    except DuplicateKeyError as e:
        # Check if error was due to an idempotency key race
        if "idempotency_key" in str(e):
            logger.info("Concurrent duplicate on idempotency_key detected; rolling back photos")
            delete_photos(created_photo_ids, db=db)
            original = find_repair_by_idempotency_key(idempotency_key, db=db)
            if original:
                return {
                    "repair_id": original["repair_id"],
                    "customer_name": original["customer_name"],
                    "received_at": to_iso_z(original["received_at"]),
                }, False
            raise

        # Check if error was due to a Repair ID collision: execute one controlled retry
        if "repair_id" in str(e):
            logger.warning("Repair ID collision on %s. Retrying once.", repair_id)
            repair_id_retry = generate_repair_id(db=db)
            repair_doc["repair_id"] = repair_id_retry
            try:
                insert_repair(repair_doc, db=db)
                repair_id = repair_id_retry
            except Exception:
                delete_photos(created_photo_ids, db=db)
                raise
        else:
            delete_photos(created_photo_ids, db=db)
            raise
    except Exception:
        # Any unexpected failure rolls back inserted photos
        delete_photos(created_photo_ids, db=db)
        raise

    logger.info("Successfully registered repair %s", repair_id)
    return {
        "repair_id": repair_id,
        "customer_name": repair_doc["customer_name"],
        "received_at": to_iso_z(now),
    }, True


def get_photo(photo_id: str, db=None) -> tuple[bytes | None, str | None, str]:
    """Retrieve photo bytes and content_type or return expired/missing status.

    Returns:
        tuple[data_bytes, content_type, status]:
        - (data, content_type, "active") if photo exists and has not expired.
        - (None, None, "expired") if photo exists but expires_at < now.
        - (None, None, "not_found") if photo does not exist.
    """
    doc = find_photo_by_id(photo_id, db=db)
    if not doc:
        return None, None, "not_found"

    expires_at = doc.get("expires_at")
    now = utc_now()
    if expires_at is not None:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=UTC)
        if expires_at < now:
            return None, None, "expired"

    binary_data = doc.get("data")
    data_bytes = bytes(binary_data) if binary_data is not None else b""
    content_type = doc.get("content_type", "image/jpeg")

    return data_bytes, content_type, "active"
