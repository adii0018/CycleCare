"""API views for customer repair registration."""

import logging

from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.throttling import RegistrationRateThrottle

from .serializers import CustomerRegistrationSerializer
from .services import register_customer_repair

logger = logging.getLogger(__name__)


class CustomerRegistrationView(APIView):
    """Public customer bicycle repair registration endpoint.

    Rate-limited per client IP and protected by honeypot and idempotency_key.
    """

    permission_classes = [AllowAny]
    throttle_classes = [RegistrationRateThrottle]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def post(self, request) -> Response:
        """Handle incoming multipart/form-data registration submission."""
        # Normalize request data, properly extracting repeated multipart form lists
        raw_data = request.data.dict() if hasattr(request.data, "dict") else dict(request.data)

        # Handle repeated repair_problems list in QueryDict
        if hasattr(request.data, "getlist"):
            problem_list = request.data.getlist("repair_problems")
            if problem_list:
                raw_data["repair_problems"] = problem_list

        # Extract uploaded photos
        photo_files = request.FILES.getlist("photos") if hasattr(request, "FILES") else []

        # Validate form fields
        serializer = CustomerRegistrationSerializer(data=raw_data)
        serializer.is_valid(raise_exception=True)

        # Execute business logic
        result, is_created = register_customer_repair(
            validated_data=serializer.validated_data,
            photo_files=photo_files,
        )

        http_status = status.HTTP_201_CREATED if is_created else status.HTTP_200_OK
        return Response(result, status=http_status)
