import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.models import JobStatus

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "gemini_configured" in data


def test_audit_validation_invalid_url():
    response = client.post("/api/audit", json={"url": "not-a-valid-url"})
    assert response.status_code == 400
    assert "Invalid domain or URL" in response.json()["detail"]


from unittest.mock import patch

def test_audit_creation_and_status_polling():
    with patch("app.main.run_audit_pipeline") as mock_pipeline:
        response = client.post("/api/audit", json={"url": "https://example.com"})
        assert response.status_code == 201
        job_id = response.json()["job_id"]
        assert job_id

        # Check immediate status
        status_resp = client.get(f"/api/audits/{job_id}")
        assert status_resp.status_code == 200
        status_data = status_resp.json()
        assert status_data["id"] == job_id
        assert status_data["url"] == "https://example.com"
        assert status_data["status"] in [s.value for s in JobStatus]


def test_report_endpoint_404_for_unknown():
    response = client.get("/api/audits/nonexistent-id-12345/report")
    assert response.status_code == 404
