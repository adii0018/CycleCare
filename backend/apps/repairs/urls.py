"""URL routes for repairs application."""

from django.urls import path

from .views import CustomerRegistrationView

urlpatterns = [
    path("", CustomerRegistrationView.as_view(), name="customer_registration"),
]
