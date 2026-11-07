"""Production settings for CycleCare backend."""

import os

from .base import *  # noqa: F403

DEBUG = False

allowed_hosts_env = os.getenv("ALLOWED_HOSTS", "")
if not allowed_hosts_env:
    raise ValueError("ALLOWED_HOSTS environment variable must be set in production.")

ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_env.split(",") if host.strip()]

# HTTPS & Proxy Security behind Render reverse proxy
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SESSION_COOKIE_SECURE = True
