"""URL routes for repairs application."""

from django.urls import path, re_path

from .views import (
    ManualRepairRegistrationView,
    PhotoStreamView,
    RepairArchiveView,
    RepairDetailView,
    RepairListCreateView,
    RepairStatsView,
)

urlpatterns = [
    # Static sub-paths declared before parameter patterns
    path("stats/", RepairStatsView.as_view(), name="repair_stats"),
    path("manual/", ManualRepairRegistrationView.as_view(), name="repair_manual"),
    path("", RepairListCreateView.as_view(), name="repair_list_create"),
    # Repair ID patterns: strictly CC-YYYY-NNNNN
    re_path(
        r"^(?P<repair_id>CC-\d{4}-\d{5})/$",
        RepairDetailView.as_view(),
        name="repair_detail",
    ),
    re_path(
        r"^(?P<repair_id>CC-\d{4}-\d{5})/archive/$",
        RepairArchiveView.as_view(),
        name="repair_archive",
    ),
    re_path(
        r"^(?P<repair_id>CC-\d{4}-\d{5})/photos/(?P<photo_id>[a-f0-9\-]+)/$",
        PhotoStreamView.as_view(),
        name="repair_photo_stream",
    ),
]
