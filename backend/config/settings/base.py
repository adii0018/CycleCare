"""Django base settings for CycleCare backend.

Runs completely without Django ORM, SQL databases, or session/auth models.
All persistent storage is handled directly via PyMongo in MongoDB Atlas.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# Load environment variables from .env file
load_dotenv(BASE_DIR / ".env")

# Core Security
SECRET_KEY = os.getenv(
    "DJANGO_SECRET_KEY",
    "cyclecare-insecure-dev-fallback-key-must-be-replaced-in-env",
)

# Application definition - NO auth, sessions, admin, contenttypes
INSTALLED_APPS = [
    "django.contrib.staticfiles",
    "corsheaders",
    "rest_framework",
    "apps.core",
    "apps.authentication",
    "apps.repairs",
]

# Middleware - Minimal, stateless pipeline
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = []

WSGI_APPLICATION = "config.wsgi.application"

# No SQL Database - Django ORM completely disabled
DATABASES = {}

# In-Memory RAM Cache for high-performance session lookup & stats aggregation
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "cyclecare-in-memory",
        "TIMEOUT": 300,
    }
}

# Standalone Django Password Hashers (runs without django.contrib.auth)
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"

# REST Framework Configuration (Deny-by-default permission)
REST_FRAMEWORK = {
    "UNAUTHENTICATED_USER": None,
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.authentication.authentication.AdminSessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "EXCEPTION_HANDLER": "apps.core.exceptions.custom_exception_handler",
}

# Upload and Request Body Memory Limits (hard caps)
# Max 3 photos * 400 KB + form fields ~= 1.3 MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 1_400_000
FILE_UPLOAD_MAX_MEMORY_SIZE = 409_600

# Photo constraints
PHOTO_MAX_COUNT = 3
PHOTO_MAX_SIZE_BYTES = 400 * 1024  # 400 KB
PHOTO_ALLOWED_TYPES = {
    "image/jpeg": [b"\xff\xd8\xff"],
    "image/png": [b"\x89PNG\r\n\x1a\n"],
    "image/webp": [b"RIFF"],  # WebP additionally validates WEBP chunk at offset 8
}
PHOTO_RETENTION_DAYS = 30

# Admin Session & Cookie Configuration
SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "cc_session")
SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "False").lower() in ("true", "1")
SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
SESSION_COOKIE_DOMAIN = os.getenv("SESSION_COOKIE_DOMAIN", None) or None
SESSION_COOKIE_PATH = "/api"
ADMIN_SESSION_DAYS = int(os.getenv("ADMIN_SESSION_DAYS", "14"))

# MongoDB Configuration
MONGODB_URI = os.getenv("MONGODB_URI", "")
MONGODB_DATABASE = os.getenv("MONGODB_DATABASE", "cyclecare")
MONGODB_TIMEOUT_MS = int(os.getenv("MONGODB_TIMEOUT_MS", "5000"))
MONGODB_MAX_POOL_SIZE = int(os.getenv("MONGODB_MAX_POOL_SIZE", "50"))
MONGODB_MIN_POOL_SIZE = int(os.getenv("MONGODB_MIN_POOL_SIZE", "5"))

# Network & Proxy Configuration (Render proxy awareness)
TRUSTED_PROXY_HOPS = int(os.getenv("TRUSTED_PROXY_HOPS", "1"))

# Rate Limiting Settings
RATE_LIMIT_REGISTER_PER_10MIN = int(os.getenv("RATE_LIMIT_REGISTER_PER_10MIN", "10"))
RATE_LIMIT_LOGIN_IP_PER_15MIN = int(os.getenv("RATE_LIMIT_LOGIN_IP_PER_15MIN", "10"))
RATE_LIMIT_LOGIN_MOBILE_PER_15MIN = int(os.getenv("RATE_LIMIT_LOGIN_MOBILE_PER_15MIN", "5"))

# CORS Configuration
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
CORS_ALLOWED_ORIGINS = [url.strip() for url in FRONTEND_URL.split(",") if url.strip()]
CORS_ALLOW_CREDENTIALS = True
