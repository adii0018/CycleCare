"""Pagination classes and helper functions for CycleCare list responses."""

import math
from typing import Any

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


def format_paginated_response(
    results: list[dict[str, Any]],
    page: int,
    page_size: int,
    total: int,
) -> dict[str, Any]:
    """Construct standard paginated dictionary envelope."""
    total_pages = math.ceil(total / page_size) if total > 0 else 0
    return {
        "results": results,
        "page": page,
        "page_size": page_size,
        "total": total,
        "total_pages": total_pages,
    }


class StandardResultsSetPagination(PageNumberPagination):
    """DRF Pagination class returning standard metadata envelope."""

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 50

    def get_paginated_response(self, data: list[Any]) -> Response:
        total = self.page.paginator.count
        page_size = self.get_page_size(self.request) or self.page_size
        total_pages = math.ceil(total / page_size) if total > 0 else 0
        return Response(
            {
                "results": data,
                "page": self.page.number,
                "page_size": page_size,
                "total": total,
                "total_pages": total_pages,
            }
        )
