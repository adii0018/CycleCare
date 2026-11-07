"""API views for admin authentication: login, logout, me."""

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.core.utils import get_client_ip
from .csrf import verify_request_origin
from .serializers import AdminLoginSerializer
from .services import login_admin, logout_admin


class LoginView(APIView):
    """Admin login endpoint setting an HttpOnly session cookie."""

    permission_classes = [AllowAny]
    authentication_classes = []  # Public: stale or corrupted cookies must never cause a 401

    def post(self, request: Request) -> Response:
        # Enforce Origin/CSRF protection for login
        verify_request_origin(request)

        serializer = AdminLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        client_ip = get_client_ip(request)
        admin_doc, token = login_admin(
            mobile=serializer.validated_data["mobile"],
            raw_password=serializer.validated_data["password"],
            client_ip=client_ip,
        )

        response = Response(
            {"admin": {"mobile": admin_doc["mobile"]}},
            status=status.HTTP_200_OK,
        )

        # Set secure HttpOnly session cookie
        cookie_name = getattr(settings, "SESSION_COOKIE_NAME", "cc_session")
        session_days = getattr(settings, "ADMIN_SESSION_DAYS", 14)
        max_age_seconds = session_days * 86400
        is_secure = getattr(settings, "SESSION_COOKIE_SECURE", False)
        samesite = getattr(settings, "SESSION_COOKIE_SAMESITE", "Lax")
        domain = getattr(settings, "SESSION_COOKIE_DOMAIN", None)

        response.set_cookie(
            key=cookie_name,
            value=token,
            max_age=max_age_seconds,
            httponly=True,
            secure=is_secure,
            samesite=samesite,
            domain=domain,
            path="/api",
        )
        return response


class LogoutView(APIView):
    """Admin logout endpoint revoking session and clearing cookie."""

    permission_classes = [IsAuthenticated]

    def post(self, request: Request) -> Response:
        # Enforce Origin/CSRF protection on state-changing logout
        verify_request_origin(request)

        cookie_name = getattr(settings, "SESSION_COOKIE_NAME", "cc_session")
        token = request.COOKIES.get(cookie_name)
        if token:
            logout_admin(token)

        response = Response(status=status.HTTP_204_NO_CONTENT)
        domain = getattr(settings, "SESSION_COOKIE_DOMAIN", None)
        samesite = getattr(settings, "SESSION_COOKIE_SAMESITE", "Lax")

        response.delete_cookie(
            key=cookie_name,
            path="/api",
            domain=domain,
            samesite=samesite,
        )
        return response


class MeView(APIView):
    """Return currently authenticated administrator identity."""

    permission_classes = [IsAuthenticated]

    def get(self, request: Request) -> Response:
        return Response(
            {"admin": {"mobile": request.user.mobile}},
            status=status.HTTP_200_OK,
        )
