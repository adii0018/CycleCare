"""Plain DRF Serializers for customer repair registration."""

import re
import uuid

from rest_framework import serializers

from .constants import (
    ADDITIONAL_DETAILS_MAX_LENGTH,
    ALLOWED_PROBLEM_CODES,
    CUSTOMER_NAME_MAX_LENGTH,
    CUSTOMER_NAME_MIN_LENGTH,
    OTHER_PROBLEM_TEXT_MAX_LENGTH,
)

# Regex allowing Latin letters, Devanagari script, spaces, and . ' -
NAME_CHAR_PATTERN = re.compile(r"^[a-zA-Z\u0900-\u097F\s\.\'\-]+$")
MOBILE_PATTERN = re.compile(r"^[6-9]\d{9}$")


def normalize_mobile(value: str) -> str:
    """Normalize Indian mobile number by stripping whitespace, dashes, +91, 91, or leading 0."""
    cleaned = re.sub(r"[\s\-]+", "", str(value))
    if cleaned.startswith("+91"):
        cleaned = cleaned[3:]
    elif cleaned.startswith("91") and len(cleaned) == 12:
        cleaned = cleaned[2:]
    elif cleaned.startswith("0") and len(cleaned) == 11:
        cleaned = cleaned[1:]
    return cleaned


class CustomerRegistrationSerializer(serializers.Serializer):
    """Validation serializer for customer repair submissions."""

    customer_name = serializers.CharField(max_length=100)
    mobile = serializers.CharField(max_length=25)
    repair_problems = serializers.ListField(
        child=serializers.CharField(),
        allow_empty=False,
    )
    other_problem_text = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=OTHER_PROBLEM_TEXT_MAX_LENGTH,
    )
    additional_details = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
        max_length=ADDITIONAL_DETAILS_MAX_LENGTH,
    )
    idempotency_key = serializers.CharField(max_length=64)
    website = serializers.CharField(
        required=False,
        allow_blank=True,
        default="",
    )

    def validate_customer_name(self, value: str) -> str:
        """Strip and collapse spaces, check length and valid character set."""
        # Strip and collapse consecutive whitespace into single space
        collapsed = re.sub(r"\s+", " ", value).strip()
        if len(collapsed) < CUSTOMER_NAME_MIN_LENGTH:
            raise serializers.ValidationError(
                f"Customer name must be at least {CUSTOMER_NAME_MIN_LENGTH} characters."
            )
        if len(collapsed) > CUSTOMER_NAME_MAX_LENGTH:
            raise serializers.ValidationError(
                f"Customer name cannot exceed {CUSTOMER_NAME_MAX_LENGTH} characters."
            )
        if not NAME_CHAR_PATTERN.match(collapsed):
            raise serializers.ValidationError(
                "Name can only contain letters, spaces, dots, hyphens, and apostrophes."
            )
        return collapsed

    def validate_mobile(self, value: str) -> str:
        """Normalize and strictly validate 10-digit Indian mobile number."""
        normalized = normalize_mobile(value)
        if not MOBILE_PATTERN.match(normalized):
            raise serializers.ValidationError(
                "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."
            )
        return normalized

    def validate_repair_problems(self, value: list[str]) -> list[str]:
        """Validate problem codes, ensure no duplicates and only allowed codes."""
        if not value:
            raise serializers.ValidationError("At least one repair problem must be selected.")

        unique_codes = []
        for code in value:
            code_clean = str(code).strip()
            if code_clean not in ALLOWED_PROBLEM_CODES:
                raise serializers.ValidationError(f"Invalid repair problem code: '{code_clean}'.")
            if code_clean in unique_codes:
                raise serializers.ValidationError(
                    f"Duplicate problem code '{code_clean}' is not allowed."
                )
            unique_codes.append(code_clean)

        return unique_codes

    def validate_idempotency_key(self, value: str) -> str:
        """Ensure idempotency_key is a valid UUID."""
        cleaned = value.strip()
        try:
            val_uuid = uuid.UUID(cleaned)
            return str(val_uuid)
        except ValueError as err:
            raise serializers.ValidationError(
                "idempotency_key must be a valid UUID string."
            ) from err

    def validate(self, attrs: dict) -> dict:
        """Cross-field validations, such as requiring other_problem_text when 'other' is selected."""
        problems = attrs.get("repair_problems", [])
        other_text = attrs.get("other_problem_text", "").strip()

        if "other" in problems:
            if not other_text:
                raise serializers.ValidationError(
                    {"other_problem_text": ["Please describe the repair problem for 'Other'."]}
                )
            attrs["other_problem_text"] = other_text
        else:
            # Ignore other_problem_text if "other" was not selected
            attrs["other_problem_text"] = None

        details = attrs.get("additional_details", "").strip()
        attrs["additional_details"] = details if details else None

        return attrs


class ArchiveSerializer(serializers.Serializer):
    """Validation serializer for archive status update."""

    archived = serializers.BooleanField(required=True)
