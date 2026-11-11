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


def test_resolve_brand_direct_url_and_name(monkeypatch):
    r_direct = client.post("/api/resolve-brand", json={"query": "vercel.com"})
    assert r_direct.status_code == 200
    d = r_direct.json()
    assert d["is_direct_url"] is True
    assert d["candidates"][0]["url"] == "https://vercel.com"

    async def fake_resolve(q):
        return {
            "query": q,
            "is_direct_url": False,
            "candidates": [
                {"brand_name": "Vercel", "domain": "vercel.com", "url": "https://vercel.com", "description": "Cloud platform"}
            ],
        }

    monkeypatch.setattr("app.main.resolve_brand_websites", fake_resolve)
    r_name = client.post("/api/resolve-brand", json={"query": "Vercel"})
    assert r_name.status_code == 200
    n = r_name.json()
    assert n["is_direct_url"] is False
    assert n["candidates"][0]["domain"] == "vercel.com"


def test_preflight_reports_waf_block_before_audit(monkeypatch):
    async def fake_preflight(url):
        return {
            "url": "https://protected.example/",
            "domain": "protected.example",
            "reachable": False,
            "blocked_by_waf": True,
            "status_code": 503,
            "block_reason": "Cloudflare human verification challenge",
        }

    monkeypatch.setattr("app.main.preflight_check", fake_preflight)
    resp = client.post("/api/preflight", json={"url": "https://protected.example"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["blocked_by_waf"] is True
    assert data["status_code"] == 503
    assert "Cloudflare" in data["block_reason"]
