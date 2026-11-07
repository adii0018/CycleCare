"""Tests for health check endpoint."""

from unittest.mock import patch

from rest_framework import status


def test_health_check_success(api_client):
    """GET /api/health/ should return status 200 and {'status': 'ok'}."""
    response = api_client.get("/api/health/")
    assert response.status_code == status.HTTP_200_OK
    assert response.json() == {"status": "ok"}


def test_health_check_works_with_db_down(api_client):
    """Health check must succeed even if MongoDB client throws an exception."""
    with patch(
        "infrastructure.mongodb.get_mongo_client", side_effect=Exception("Database unreachable")
    ):
        response = api_client.get("/api/health/")
        assert response.status_code == status.HTTP_200_OK
        assert response.json() == {"status": "ok"}
