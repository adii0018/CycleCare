"""URL routes for admin authentication."""

from django.urls import path

from .views import LoginView, LogoutView, MeView

urlpatterns = [
    path("login/", LoginView.as_view(), name="admin_login"),
    path("logout/", LogoutView.as_view(), name="admin_logout"),
    path("me/", MeView.as_view(), name="admin_me"),
]
