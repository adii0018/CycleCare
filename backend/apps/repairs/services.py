"""Business logic services for customer repair registration and photo retrieval."""

import logging
import re
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo

from django.core.files.uploadedfile import UploadedFile
from pymongo.errors import DuplicateKeyError
from rest_framework.exceptions import ValidationError

from apps.core.utils import to_iso_z, utc_now
from infrastructure.repair_id import generate_repair_id

from .constants import (
    MAX_PHOTOS_PER_REGISTRATION,
    PHOTO_RETENTION_DAYS,
    PROBLEM_CODE_SHORT_NAMES,
)
from .photo_validation import ValidatedPhoto, validate_photo_file
from .repository import (
    delete_photos,
    find_photo_by_id,
    find_repair_by_id,
    find_repair_by_idempotency_key,
    insert_photos_batch,
    insert_repair,
    update_repair_archive_status,
)
from .serializers import normalize_mobile

logger = logging.getLogger(__name__)
IST_ZONE = ZoneInfo("Asia/Kolkata")


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


def save_repair_with_photos(
    validated_data: dict[str, Any],
    photo_files: list[UploadedFile],
    source: str = "customer",
    db=None,
) -> tuple[dict[str, str], bool]:
    """Shared core registration logic for both customer and admin manual submissions."""
    # 1. Server-side photo validation
    validated_photos = validate_and_prepare_photos(photo_files)

    # 2. Idempotency check: if already processed, return original confirmation without storing photos
    idempotency_key = validated_data["idempotency_key"]
    existing = find_repair_by_idempotency_key(idempotency_key, db=db)
    if existing:
        logger.info("Idempotent submission matched existing repair %s", existing["repair_id"])
        return {
            "repair_id": existing["repair_id"],
            "customer_name": existing["customer_name"],
            "received_at": to_iso_z(existing["received_at"]),
        }, False

    # 3. Generate unique atomic Repair ID
    repair_id = generate_repair_id(db=db)

    # 4. Prepare photo documents
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

    # 5. Insert photos batch into MongoDB
    if photo_docs:
        insert_photos_batch(photo_docs, db=db)

    # 6. Prepare repair document
    repair_doc = {
        "repair_id": repair_id,
        "customer_name": validated_data["customer_name"],
        "search_name": validated_data["customer_name"].lower(),
        "mobile": validated_data["mobile"],
        "repair_problems": validated_data["repair_problems"],
        "other_problem_text": validated_data["other_problem_text"],
        "additional_details": validated_data["additional_details"],
        "photos": photo_metadata_list,
        "source": source,
        "idempotency_key": idempotency_key,
        "received_at": now,
        "archived": False,
        "archived_at": None,
    }

    # 7. Insert repair with rollback protection and collision retry
    try:
        insert_repair(repair_doc, db=db)
    except DuplicateKeyError as e:
        if "idempotency_key" in str(e):
            logger.info("Concurrent duplicate on idempotency_key; rolling back photos")
            delete_photos(created_photo_ids, db=db)
            original = find_repair_by_idempotency_key(idempotency_key, db=db)
            if original:
                return {
                    "repair_id": original["repair_id"],
                    "customer_name": original["customer_name"],
                    "received_at": to_iso_z(original["received_at"]),
                }, False
            raise

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
        delete_photos(created_photo_ids, db=db)
        raise

    logger.info("Successfully registered repair %s (source=%s)", repair_id, source)
    return {
        "repair_id": repair_id,
        "customer_name": repair_doc["customer_name"],
        "received_at": to_iso_z(now),
    }, True


def register_customer_repair(
    validated_data: dict[str, Any],
    photo_files: list[UploadedFile],
    db=None,
) -> tuple[dict[str, str], bool]:
    """Process public customer registration submission with honeypot guard."""
    if validated_data.get("website"):
        logger.info("Honeypot field triggered. Discarding submission silently.")
        return build_fake_honeypot_response(validated_data["customer_name"]), True

    return save_repair_with_photos(validated_data, photo_files, source="customer", db=db)


def register_manual_repair(
    validated_data: dict[str, Any],
    photo_files: list[UploadedFile],
    db=None,
) -> tuple[dict[str, str], bool]:
    """Process authenticated manual registration by admin."""
    return save_repair_with_photos(validated_data, photo_files, source="admin", db=db)


def get_photo(photo_id: str, db=None) -> tuple[bytes | None, str | None, str]:
    """Retrieve photo bytes and content_type or return expired/not_found status."""
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


def build_problem_summary(codes: list[str], other_text: str | None) -> str:
    """Build a concise, readable summary of problems capped at ~60 chars."""
    labels = []
    for code in codes:
        if code == "other" and other_text:
            labels.append(f"Other: {other_text}")
        else:
            labels.append(PROBLEM_CODE_SHORT_NAMES.get(code, code))
    joined = ", ".join(labels)
    if len(joined) > 60:
        return joined[:57].rstrip() + "..."
    return joined


def parse_search_query(q: str, archived: bool = False) -> dict[str, Any]:
    """Parse search parameter safely without ReDoS vulnerabilities."""
    query: dict[str, Any] = {"archived": archived}
    cleaned_q = q.strip()
    if not cleaned_q:
        return query

    cleaned_q = cleaned_q[:60]

    # 1. Exact Repair ID pattern
    if re.match(r"^CC-\d{4}-\d{5}$", cleaned_q, re.IGNORECASE):
        query["repair_id"] = cleaned_q.upper()
        return query

    # 2. Digits / Mobile search
    digits = re.sub(r"\D", "", cleaned_q)
    normalized = normalize_mobile(cleaned_q)
    if digits:
        target_digits = normalized if len(normalized) == 10 else digits
        if len(target_digits) == 10 and re.match(r"^[6-9]\d{9}$", target_digits):
            query["mobile"] = target_digits
        else:
            # Anchored prefix search utilizes idx_repairs_mobile index
            query["mobile"] = {"$regex": f"^{re.escape(digits)}"}
        return query

    # 3. Substring search on search_name
    query["search_name"] = {"$regex": re.escape(cleaned_q.lower())}
    return query


def get_ist_day_boundaries(now_dt: datetime | None = None) -> tuple[datetime, datetime]:
    """Calculate UTC start and end timestamps corresponding to today in Asia/Kolkata."""
    if now_dt is None:
        now_dt = utc_now()
    elif now_dt.tzinfo is None:
        now_dt = now_dt.replace(tzinfo=UTC)

    ist_now = now_dt.astimezone(IST_ZONE)
    ist_start = datetime(ist_now.year, ist_now.month, ist_now.day, 0, 0, 0, tzinfo=IST_ZONE)
    ist_end = datetime(
        ist_now.year, ist_now.month, ist_now.day, 23, 59, 59, 999999, tzinfo=IST_ZONE
    )

    return ist_start.astimezone(UTC), ist_end.astimezone(UTC)


def get_admin_repair_detail(repair_id: str, db=None) -> dict[str, Any] | None:
    """Retrieve full repair record and compute photo expiration statuses."""
    doc = find_repair_by_id(repair_id, db=db)
    if not doc:
        return None

    now = utc_now()
    photos_result = []

    for p in doc.get("photos", []):
        photo_id = p.get("photo_id")
        p_expires_at = p.get("expires_at")
        if p_expires_at is not None and p_expires_at.tzinfo is None:
            p_expires_at = p_expires_at.replace(tzinfo=UTC)

        # Check in-code expiry and existence in photos collection
        is_expired = True
        if p_expires_at and p_expires_at >= now:
            photo_doc = find_photo_by_id(photo_id, db=db)
            if photo_doc is not None:
                is_expired = False

        photos_result.append(
            {
                "id": photo_id,
                "url": f"/api/repairs/{repair_id}/photos/{photo_id}/",
                "expired": is_expired,
            }
        )

    archived_at_val = doc.get("archived_at")
    archived_at_str = to_iso_z(archived_at_val) if archived_at_val else None

    return {
        "repair_id": doc["repair_id"],
        "customer_name": doc["customer_name"],
        "mobile": doc["mobile"],
        "repair_problems": doc.get("repair_problems", []),
        "other_problem_text": doc.get("other_problem_text"),
        "additional_details": doc.get("additional_details"),
        "received_at": to_iso_z(doc["received_at"]),
        "source": doc.get("source", "customer"),
        "archived": doc.get("archived", False),
        "archived_at": archived_at_str,
        "photos": photos_result,
    }


def archive_repair_record(repair_id: str, archived: bool, db=None) -> dict[str, Any] | None:
    """Set archive state for a repair record."""
    archived_at = utc_now() if archived else None
    updated = update_repair_archive_status(repair_id, archived, archived_at, db=db)
    if not updated:
        return None

    archived_at_val = updated.get("archived_at")
    return {
        "repair_id": updated["repair_id"],
        "archived": updated["archived"],
        "archived_at": to_iso_z(archived_at_val) if archived_at_val else None,
    }
