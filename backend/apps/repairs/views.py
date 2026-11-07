"""API views for repair management (customer registration, admin list, stats, detail, archive, photo stream)."""

import logging
from datetime import UTC

from django.http import Http404, HttpResponse
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.authentication.authentication import AdminSessionAuthentication
from apps.authentication.csrf import verify_request_origin
from apps.core.exceptions import build_error_response
from apps.core.pagination import format_paginated_response
from apps.core.throttling import RegistrationRateThrottle
from apps.core.utils import to_iso_z, utc_now

from .repository import (
    count_repairs,
    find_repair_by_id,
    find_repairs_paginated,
    get_repairs_stats,
)
from .serializers import ArchiveSerializer, CustomerRegistrationSerializer
from .services import (
    archive_repair_record,
    build_problem_summary,
    get_admin_repair_detail,
    get_ist_day_boundaries,
    get_photo,
    parse_search_query,
    register_customer_repair,
    register_manual_repair,
)

logger = logging.getLogger(__name__)


class RepairStatsView(APIView):
    """Admin dashboard stats overview."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        now = utc_now()
        start_utc, end_utc = get_ist_day_boundaries(now)
        stats_data = get_repairs_stats(
            today_utc_start=start_utc,
            today_utc_end=end_utc,
            now_utc=now,
        )
        return Response(stats_data, status=status.HTTP_200_OK)


class ManualRepairRegistrationView(APIView):
    """Admin manual repair registration endpoint."""

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request: Request) -> Response:
        verify_request_origin(request)

        raw_data = request.data.dict() if hasattr(request.data, "dict") else dict(request.data)
        if hasattr(request.data, "getlist"):
            problem_list = request.data.getlist("repair_problems")
            if problem_list:
                raw_data["repair_problems"] = problem_list

        photo_files = request.FILES.getlist("photos") if hasattr(request, "FILES") else []

        serializer = CustomerRegistrationSerializer(data=raw_data)
        serializer.is_valid(raise_exception=True)

        result, is_created = register_manual_repair(
            validated_data=serializer.validated_data,
            photo_files=photo_files,
        )
        http_status = status.HTTP_201_CREATED if is_created else status.HTTP_200_OK
        return Response(result, status=http_status)


class RepairListCreateView(APIView):
    """Serves both public customer registration (POST) and admin records list (GET)."""

    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_permissions(self):
        """Allow public submission for POST, enforce authentication for GET."""
        if self.request.method == "POST":
            return [AllowAny()]
        return [IsAuthenticated()]

    def get_authenticators(self):
        """Public POST must skip session authentication so garbage cookies never cause 401."""
        if self.request.method == "POST":
            return []
        return [AdminSessionAuthentication()]

    def get_authenticate_header(self, request: Request) -> str:
        return "Cookie"

    def get_throttles(self):
        """Apply rate limiting only on public customer registration."""
        if self.request.method == "POST":
            return [RegistrationRateThrottle()]
        return []

    def post(self, request: Request) -> Response:
        """Public customer registration with photo upload."""
        raw_data = request.data.dict() if hasattr(request.data, "dict") else dict(request.data)
        if hasattr(request.data, "getlist"):
            problem_list = request.data.getlist("repair_problems")
            if problem_list:
                raw_data["repair_problems"] = problem_list

        photo_files = request.FILES.getlist("photos") if hasattr(request, "FILES") else []

        serializer = CustomerRegistrationSerializer(data=raw_data)
        serializer.is_valid(raise_exception=True)

        result, is_created = register_customer_repair(
            validated_data=serializer.validated_data,
            photo_files=photo_files,
        )
        http_status = status.HTTP_201_CREATED if is_created else status.HTTP_200_OK
        return Response(result, status=http_status)

    def get(self, request: Request) -> Response:
        """Admin list of repair records with search and pagination."""
        q = request.query_params.get("q", "")
        archived_param = request.query_params.get("archived", "false").lower()
        is_archived = archived_param in ("true", "1")

        try:
            page = max(1, int(request.query_params.get("page", 1)))
        except ValueError:
            page = 1

        try:
            page_size = min(50, max(1, int(request.query_params.get("page_size", 20))))
        except ValueError:
            page_size = 20

        filter_query = parse_search_query(q, archived=is_archived)
        total = count_repairs(filter_query)
        skip = (page - 1) * page_size

        docs = find_repairs_paginated(filter_query, skip=skip, limit=page_size)

        now = utc_now()
        results = []
        for doc in docs:
            photos = doc.get("photos", [])
            has_active = False
            for p in photos:
                exp = p.get("expires_at")
                if exp:
                    if exp.tzinfo is None:
                        exp = exp.replace(tzinfo=UTC)
                    if exp > now:
                        has_active = True
                        break

            results.append(
                {
                    "repair_id": doc["repair_id"],
                    "customer_name": doc["customer_name"],
                    "mobile": doc["mobile"],
                    "received_at": to_iso_z(doc["received_at"]),
                    "repair_problems": doc.get("repair_problems", []),
                    "problem_summary": build_problem_summary(
                        doc.get("repair_problems", []),
                        doc.get("other_problem_text"),
                    ),
                    "photo_count": len(photos),
                    "has_active_photos": has_active,
                    "archived": doc.get("archived", False),
                }
            )

        envelope = format_paginated_response(
            results=results,
            page=page,
            page_size=page_size,
            total=total,
        )
        return Response(envelope, status=status.HTTP_200_OK)


# Backward-compatible alias
CustomerRegistrationView = RepairListCreateView


class RepairDetailView(APIView):
    """Admin full repair record detail view."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, repair_id: str) -> Response:
        detail = get_admin_repair_detail(repair_id)
        if not detail:
            raise Http404(f"Repair record '{repair_id}' does not exist.")
        return Response(detail, status=status.HTTP_200_OK)


class RepairArchiveView(APIView):
    """Admin archive/restore toggle view."""

    permission_classes = [IsAuthenticated]

    def patch(self, request: Request, repair_id: str) -> Response:
        verify_request_origin(request)

        serializer = ArchiveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        res = archive_repair_record(
            repair_id=repair_id,
            archived=serializer.validated_data["archived"],
        )
        if not res:
            raise Http404(f"Repair record '{repair_id}' does not exist.")

        return Response(res, status=status.HTTP_200_OK)


class PhotoStreamView(APIView):
    """Admin photo binary streaming view."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request, repair_id: str, photo_id: str) -> HttpResponse:
        # Verify repair exists
        repair = find_repair_by_id(repair_id)
        if not repair:
            raise Http404(f"Repair record '{repair_id}' does not exist.")

        # Verify photo belongs to this specific repair
        belongs = any(p.get("photo_id") == photo_id for p in repair.get("photos", []))
        if not belongs:
            raise Http404(f"Photo '{photo_id}' does not belong to repair '{repair_id}'.")

        data, content_type, photo_status = get_photo(photo_id)
        if photo_status != "active" or not data:
            return build_error_response(
                code="photo_expired",
                message="Photo Expired",
                status_code=status.HTTP_410_GONE,
            )

        response = HttpResponse(data, content_type=content_type)
        response["Cache-Control"] = "private, max-age=300"
        response["X-Content-Type-Options"] = "nosniff"
        response["Content-Disposition"] = "inline"
        return response
