"""URL Configuration for CycleCare."""

from django.urls import include, path

from apps.core.views import health_check

urlpatterns = [
    path("api/health/", health_check, name="health_check"),
    path("api/auth/", include("apps.authentication.urls")),
    path("api/repairs/", include("apps.repairs.urls")),
]
