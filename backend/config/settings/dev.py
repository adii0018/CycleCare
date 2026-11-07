"""Development settings for CycleCare backend."""

import os

from .base import *  # noqa: F403

DEBUG = True

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1,[::1]").split(",")
    if host.strip()
]
