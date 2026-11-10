"""End-to-end pipeline tests (crawler and Gemini are faked; orchestrator, scoring, DB are real)."""

import asyncio
import json

import pytest
from fastapi.testclient import TestClient

from app import ai_simulator as sim
from app import database, orchestrator
from app.ai_simulator import LLMResult, run_ai_visibility_queries
from app.main import app
from app.models import JobStatus

HTML = """<html><head><title>Acme Metrics | Real-Time Analytics</title>
<meta name="description" content="Acme Metrics is a real-time analytics dashboard for high-growth startups and product teams.">
<meta property="og:site_name" content="Acme Metrics">
<script type="application/ld+json">{"@type":"Organization","name":"Acme Metrics"}</script></head>
<body><header><nav><a href="/docs">Docs</a></nav></header><main><h1>Know your growth</h1>
<section><h2>Dashboards</h2><p>""" + ("word " * 300) + """</p></section></main><footer>x</footer></body></html>"""


def crawl_stub(url):
    async def _crawl(target):
        return {
            "url": "https://acmemetrics.io/", "base_url": "https://acmemetrics.io", "domain": "acmemetrics.io",
            "status_code": 200, "html": HTML,
            "robots_txt": {"exists": True, "status_code": 200, "content": "User-agent: *\nAllow: /\nSitemap: https://acmemetrics.io/sitemap.xml"},
            "sitemap_xml": {"exists": True, "status_code": 200, "content": "<xml/>"},
            "llms_txt": {"exists": False, "status_code": 404, "content": ""},
        }
    return _crawl


async def no_solutions(analyzed):
    return []


@pytest.fixture()
def db(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DB_PATH", str(tmp_path / "t.db"))
    database.init_db()
    monkeypatch.setattr(orchestrator, "crawl_site", crawl_stub("x"))
    monkeypatch.setattr(orchestrator, "generate_solutions", no_solutions)
    monkeypatch.setattr(sim, "get_probe_runs", lambda: 3)
    monkeypatch.setattr(sim, "get_indic_runs", lambda: 1)
    return database


def run_job(job_id="job-1"):
    database.create_job(job_id, "https://acmemetrics.io")
    asyncio.run(orchestrator.run_audit_pipeline(job_id, "https://acmemetrics.io"))
    return database.get_job(job_id), database.get_audit_result(job_id)


def test_pipeline_without_api_key_completes_with_technical_only_score(db, monkeypatch):
    monkeypatch.setattr(sim, "get_gemini_api_key", lambda: "")
    job, result = run_job()
    assert job["status"] == JobStatus.COMPLETED.value  # AI unavailability must not fail the audit
    report = result["report"]
    assert report["ai_visibility_available"] is False
    assert report["ai_visibility_score"] is None
    assert report["composite_score"] == report["technical_score"]
    assert report["weight_ai_visibility"] == 0.0
    assert "GEMINI_API_KEY" in report["score_note"]
    assert report["ai_visibility_findings"]["queries"] == []  # no fabricated responses
    assert result["ai_visibility_score"] is None  # NULL in the database, not a fake number


class ScriptedClient:
    models_used = ["fake"]

    async def generate(self, prompt, *, json_mode=False, temperature=0.0):
        if "market category" in prompt:
            text = json.dumps({"category": "real-time analytics dashboards"})
        elif "strict fact-checker" in prompt:
            text = json.dumps({"verdict": "accurate", "wrong_claims": [], "missing_facts": [], "explanation": "ok"})
        elif "What is Acme Metrics" in prompt:
            text = json.dumps({"known": True, "description": "Acme Metrics is a real-time analytics dashboard."})
        else:
            text = json.dumps({"recommendations": [
                {"rank": 1, "name": "Acme Metrics", "website": "acmemetrics.io", "reason": "great"},
                {"rank": 2, "name": "Mixpanel", "website": "mixpanel.com", "reason": "ok"},
            ]})
        return LLMResult(text=text, model="fake")


def test_pipeline_with_ai_probes_scores_and_persists_real_measurements(db, monkeypatch):
    real = run_ai_visibility_queries

    async def with_client(**kwargs):
        return await real(client=ScriptedClient(), **kwargs)

    monkeypatch.setattr(orchestrator, "run_ai_visibility_queries", with_client)
    job, result = run_job("job-2")
    assert job["status"] == JobStatus.COMPLETED.value
    report = result["report"]
    f = report["ai_visibility_findings"]

    assert report["ai_visibility_available"] is True
    assert f["organic_runs"] == 3 and f["organic_mentions"] == 3
    assert f["perception"]["verdict"] == "accurate"
    assert f["category_source"] == "gemini"
    assert report["composite_score"] == pytest.approx(
        0.25 * report["technical_score"] + 0.75 * report["ai_visibility_score"], abs=0.1
    )
    # every query row is a real (scripted) call: 3 EN + HI + KN organic + 1 perception
    assert len(f["queries"]) == 6 and all(q["status"] == "ok" for q in f["queries"])


def test_brand_and_category_overrides_flow_through_to_the_probes(db, monkeypatch):
    seen = {}
    real = run_ai_visibility_queries

    async def spy(**kwargs):
        seen.update(brand=kwargs["brand_name"], override=kwargs["category_override"])
        return await real(client=ScriptedClient(), **kwargs)

    monkeypatch.setattr(orchestrator, "run_ai_visibility_queries", spy)
    database.create_job("job-3", "https://acmemetrics.io")
    asyncio.run(orchestrator.run_audit_pipeline("job-3", "https://acmemetrics.io", "Acme Metrics Inc", "product analytics"))
    assert seen == {"brand": "Acme Metrics Inc", "override": "product analytics"}


def test_api_passes_optional_overrides_to_the_pipeline(monkeypatch):
    captured = {}

    async def fake_pipeline(job_id, url, brand, category):
        captured.update(brand=brand, category=category)

    monkeypatch.setattr("app.main.run_audit_pipeline", fake_pipeline)
    client = TestClient(app)
    r = client.post("/api/audit", json={"url": "https://example.com", "brand_name": "  Example  ", "category": "web hosting"})
    assert r.status_code == 201
    assert captured == {"brand": "Example", "category": "web hosting"}

    captured.clear()
    client.post("/api/audit", json={"url": "https://example.com"})
    assert captured == {"brand": None, "category": None}
