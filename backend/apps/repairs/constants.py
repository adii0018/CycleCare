"""Constants and validation limits for customer bicycle repairs."""

# Stable problem codes stored in MongoDB
ALLOWED_PROBLEM_CODES = {
    "puncture_tyre",
    "brake",
    "chain",
    "gear",
    "pedal",
    "wheel",
    "general_service",
    "other",
}

# Customer Name rules
CUSTOMER_NAME_MIN_LENGTH = 2
CUSTOMER_NAME_MAX_LENGTH = 60

# Text limits
OTHER_PROBLEM_TEXT_MAX_LENGTH = 200
ADDITIONAL_DETAILS_MAX_LENGTH = 500

# Photo constraints
MAX_PHOTOS_PER_REGISTRATION = 3
MAX_PHOTO_SIZE_BYTES = 400 * 1024  # 400 KB hard cap
ALLOWED_PHOTO_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}
PHOTO_RETENTION_DAYS = 30
