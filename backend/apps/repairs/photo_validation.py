"""Validation for uploaded bicycle photos including MIME type and magic bytes checks."""

from typing import NamedTuple

from django.core.files.uploadedfile import UploadedFile
from rest_framework.exceptions import ValidationError

from .constants import ALLOWED_PHOTO_CONTENT_TYPES, MAX_PHOTO_SIZE_BYTES


class ValidatedPhoto(NamedTuple):
    content_type: str
    size_bytes: int
    data: bytes


def detect_magic_bytes_type(header: bytes) -> str | None:
    """Identify the image MIME type from binary file signature (magic bytes)."""
    if len(header) < 12:
        return None

    # JPEG: starts with FF D8 FF
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"

    # PNG: starts with 89 50 4E 47 0D 0A 1A 0A
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"

    # WebP: starts with RIFF (bytes 0-3) and WEBP (bytes 8-11)
    if header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return "image/webp"

    return None


def validate_photo_file(file_obj: UploadedFile) -> ValidatedPhoto:
    """Validate a single uploaded photo file strictly on the server."""
    # Read entire file into memory (since cap is 400 KB)
    file_bytes = file_obj.read()
    file_size = len(file_bytes)

    if file_size == 0:
        raise ValidationError("Photo file is empty.")

    if file_size > MAX_PHOTO_SIZE_BYTES:
        raise ValidationError(
            f"Photo file exceeds the maximum allowed size of {MAX_PHOTO_SIZE_BYTES // 1024} KB."
        )

    # Check declared content type
    declared_type = getattr(file_obj, "content_type", "").lower()
    if declared_type not in ALLOWED_PHOTO_CONTENT_TYPES:
        raise ValidationError(
            f"Unsupported file format '{declared_type}'. Allowed types: JPEG, PNG, WebP."
        )

    # Verify actual binary magic bytes
    detected_type = detect_magic_bytes_type(file_bytes[:16])
    if detected_type is None:
        raise ValidationError("Invalid image file format or corrupted file signature.")

    if detected_type != declared_type:
        raise ValidationError(
            f"File content signature ({detected_type}) does not match declared type ({declared_type})."
        )

    return ValidatedPhoto(
        content_type=detected_type,
        size_bytes=file_size,
        data=file_bytes,
    )
