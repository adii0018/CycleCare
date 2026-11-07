"""Serializers for admin authentication."""

from rest_framework import serializers
from apps.repairs.serializers import MOBILE_PATTERN, normalize_mobile


class AdminLoginSerializer(serializers.Serializer):
    """Validation serializer for admin login credentials."""

    mobile = serializers.CharField(max_length=25)
    password = serializers.CharField(max_length=128, write_only=True)

    def validate_mobile(self, value: str) -> str:
        """Normalize and strictly validate Indian mobile format."""
        normalized = normalize_mobile(value)
        if not MOBILE_PATTERN.match(normalized):
            raise serializers.ValidationError(
                "Enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."
            )
        return normalized
