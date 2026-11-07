"""Core system views including lightweight health check."""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request) -> Response:
    """Lightweight health check endpoint.

    Intentionally performs no database queries so it reliably responds
    even when the database is restarting or under load. Ideal for Render
    warm-up pings and uptime monitors.
    """
    return Response({"status": "ok"}, status=status.HTTP_200_OK)
