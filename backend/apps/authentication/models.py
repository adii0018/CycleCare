"""Lightweight AdminUser representation for DRF request.user (no Django ORM)."""

from typing import Any


class AdminUser:
    """Non-ORM User object adhering to DRF's authentication protocol."""

    def __init__(self, doc: dict[str, Any]) -> None:
        self.doc = doc
        self.id = str(doc.get("_id"))
        self.mobile = str(doc.get("mobile"))
        self.is_active = bool(doc.get("is_active", True))

    @property
    def is_authenticated(self) -> bool:
        """DRF compatibility property."""
        return True

    @property
    def is_anonymous(self) -> bool:
        """DRF compatibility property."""
        return False

    def __str__(self) -> str:
        return f"AdminUser(mobile={self.mobile})"
