import pytest
from app.scoring import calculate_audit_score, WEIGHT_TECHNICAL, WEIGHT_AI_VISIBILITY
from app.analyzer import parse_robots_txt, extract_brand_name
from app.generator import generate_robots_txt_solution, generate_llms_txt_solution
from bs4 import BeautifulSoup


def test_weights_are_explicit_40_60():
    assert WEIGHT_TECHNICAL == 0.40
    assert WEIGHT_AI_VISIBILITY == 0.60
    assert (WEIGHT_TECHNICAL + WEIGHT_AI_VISIBILITY) == 1.0


def test_robots_txt_parsing_blocks_and_allows():
    # Case A: Explicit block of GPTBot
    sample_robots_blocked = """
    User-agent: GPTBot
    Disallow: /

    User-agent: Google-Extended
    Disallow: /

    User-agent: *
    Allow: /
    Sitemap: https://example.com/sitemap.xml
    """
    parsed = parse_robots_txt(sample_robots_blocked)
    assert parsed["exists"] is True
    assert "GPTBot" in parsed["blocked_ai_bots"]
    assert "Google-Extended" in parsed["blocked_ai_bots"]
    assert "PerplexityBot" in parsed["allowed_ai_bots"]  # falls back to wildcard allow
    assert "https://example.com/sitemap.xml" in parsed["sitemaps"]

    # Case B: Wildcard block
    sample_robots_wildcard = """
    User-agent: *
    Disallow: /
    """
    parsed_wild = parse_robots_txt(sample_robots_wildcard)
    assert parsed_wild["blocks_all"] is True
    assert "GPTBot" in parsed_wild["blocked_ai_bots"]
    assert "ClaudeBot" in parsed_wild["blocked_ai_bots"]


def test_solution_generator_robots_txt():
    # When missing robots.txt
    crawl_missing = {"robots_txt_exists": False, "robots_parsed": {}}
    sol_missing = generate_robots_txt_solution("https://example.com", crawl_missing)
    assert sol_missing.file_name == "robots.txt"
    assert sol_missing.status == "generated"
    assert "User-agent: GPTBot" in sol_missing.downloadable_content
    assert "Sitemap: https://example.com/sitemap.xml" in sol_missing.downloadable_content

    # When blocked
    crawl_blocked = {
        "robots_txt_exists": True,
        "robots_parsed": {
            "blocked_ai_bots": ["GPTBot", "CCBot"],
            "custom_disallows": ["/admin", "/private"],
            "raw": "User-agent: *\nDisallow: /admin\nUser-agent: GPTBot\nDisallow: /",
        },
    }
    sol_blocked = generate_robots_txt_solution("https://example.com", crawl_blocked)
    assert sol_blocked.status == "corrected"
    assert "/admin" in sol_blocked.downloadable_content
    assert "User-agent: GPTBot\nAllow: /" in sol_blocked.downloadable_content


def test_solution_generator_llms_txt():
    analyzed_mock = {
        "brand_name": "AcmeMetrics",
        "domain": "acmemetrics.io",
        "url": "https://acmemetrics.io",
        "base_url": "https://acmemetrics.io",
        "category": "SaaS & Cloud Software",
        "metadata": {
            "title": "AcmeMetrics | Real-Time Growth Analytics for Startups",
            "meta_description": "AcmeMetrics is the leading real-time analytics dashboard for high-growth tech companies.",
        },
        "navigation_links": [
            {"title": "Documentation", "url": "https://acmemetrics.io/docs"},
            {"title": "Pricing", "url": "https://acmemetrics.io/pricing"},
        ],
        "crawlability": {"llms_txt_exists": False},
    }

    from unittest.mock import patch
    import asyncio

    mock_gemini_content = (
        "# AcmeMetrics\n\n"
        "> AcmeMetrics is the leading real-time analytics dashboard for high-growth tech companies.\n\n"
        "## Overview\n"
        "- [Documentation](https://acmemetrics.io/docs): Authoritative guides\n"
        "- [Pricing](https://acmemetrics.io/pricing): Pricing plans\n"
    )

    with patch("app.generator.synthesize_llms_txt_with_gemini", return_value=(mock_gemini_content, "Google Gemini (gemini-3.6-flash)")):
        sol = asyncio.run(generate_llms_txt_solution(analyzed_mock))
        assert sol.file_name == "llms.txt"
        assert sol.status == "generated"
        assert "# AcmeMetrics" in sol.downloadable_content
        assert "leading real-time analytics dashboard" in sol.downloadable_content
        assert "[Documentation](https://acmemetrics.io/docs)" in sol.downloadable_content
        assert "[Pricing](https://acmemetrics.io/pricing)" in sol.downloadable_content
        assert "Lorem ipsum" not in sol.downloadable_content
        assert "Company Name" not in sol.downloadable_content
        assert sol.generated_by == "Google Gemini (gemini-3.6-flash)"
        assert sol.spec_compliance == "llmstxt.org / Howard (2024)"


def test_scoring_engine_pure_function():
    analyzed_mock = {
        "brand_name": "TestCorp",
        "category": "Developer Tools",
        "crawlability": {
            "robots_txt_exists": True,
            "robots_parsed": {
                "blocked_ai_bots": [],
                "allowed_ai_bots": ["GPTBot", "Google-Extended"],
            },
            "sitemap_exists": True,
            "llms_txt_exists": False,  # Missing llms.txt -> should deduct 5 pts and flag Warning
        },
        "schema": {
            "count": 1,
            "types": ["Organization", "WebSite"],
        },
        "metadata": {
            "title": "TestCorp - Modern API Platform",
            "title_length": 31,
            "meta_description": "TestCorp provides automated developer tooling and fast infrastructure for global teams.",
            "description_length": 86,
        },
        "headings": {
            "h1_count": 1,
            "h1_list": ["Welcome to TestCorp"],
            "h2_count": 3,
            "h3_count": 2,
        },
        "semantic_html": {
            "elements": {"main": 1, "header": 1, "nav": 1, "footer": 1, "section": 3},
            "word_count": 650,
        },
    }

    ai_raw_mock = {
        "score": 75.0,
        "queries": [
            {
                "intent_name": "Brand Discovery",
                "query": "Who is TestCorp?",
                "mentioned": True,
                "sentiment": "positive",
                "position": "primary",
                "score": 95.0,
                "evidence_excerpt": "TestCorp is an established developer tooling company.",
                "raw_response": "TestCorp is an established developer tooling company providing modern APIs.",
            },
            {
                "intent_name": "Category Search",
                "query": "Best developer tools?",
                "mentioned": True,
                "sentiment": "neutral",
                "position": "listed",
                "score": 75.0,
                "evidence_excerpt": "Top tools include GitHub, GitLab, and TestCorp for APIs.",
                "raw_response": "Top tools include GitHub, GitLab, and TestCorp for APIs.",
            },
            {
                "intent_name": "Comparative Analysis",
                "query": "TestCorp vs alternatives?",
                "mentioned": True,
                "sentiment": "positive",
                "position": "listed",
                "score": 75.0,
                "evidence_excerpt": "TestCorp offers faster setup than legacy suites.",
                "raw_response": "TestCorp offers faster setup than legacy suites.",
            },
            {
                "intent_name": "Market Alternatives",
                "query": "Alternatives to TestCorp?",
                "mentioned": False,
                "sentiment": "not_mentioned",
                "position": "omitted",
                "score": 55.0,
                "evidence_excerpt": "Leading solutions include alternative A and B.",
                "raw_response": "Leading solutions include alternative A and B.",
            },
        ],
    }

    res = calculate_audit_score(analyzed_mock, ai_raw_mock)

    # Technical Score:
    # Crawlability: 10 (robots) + 10 (bots allowed) + 5 (sitemap) + 0 (missing llms) = 25
    # Schema: 10 (present) + 10 (core) + 0 (no FAQ) = 20
    # Metadata: 7 (title) + 8 (desc) + 5 (1 H1) + 5 (subheadings) = 25
    # Semantic: 7 (main) + 7 (landmarks) + 6 (sections) = 20
    # Expected Tech Score = 25 + 20 + 25 + 20 = 90.0
    assert res["technical_score"] == 90.0
    assert res["ai_visibility_score"] == 75.0

    # Composite = 0.40 * 90.0 + 0.60 * 75.0 = 36.0 + 45.0 = 81.0
    assert res["composite_score"] == 81.0

    # Check that Action Plan issues are prioritized (Critical, then Warning, then Opportunity)
    severities = [i.severity.value for i in res["issues"]]
    # Should not have any Critical since tech and brand discovery passed
    assert "critical" not in severities
    assert "warning" in severities
    # Missing llms.txt must be in action plan
    titles = [i.title for i in res["issues"]]
    assert any("llms.txt" in t for t in titles)


def test_scoring_critical_severity_when_blocked_and_missing_schema():
    analyzed_critical = {
        "brand_name": "GhostCo",
        "category": "Marketing",
        "crawlability": {
            "robots_txt_exists": True,
            "robots_parsed": {
                "blocked_ai_bots": ["GPTBot", "Google-Extended", "ClaudeBot"],
                "allowed_ai_bots": [],
            },
            "sitemap_exists": False,
            "llms_txt_exists": False,
        },
        "schema": {"count": 0, "types": []},
        "metadata": {"title": "", "title_length": 0, "meta_description": "", "description_length": 0},
        "headings": {"h1_count": 0, "h1_list": [], "h2_count": 0, "h3_count": 0},
        "semantic_html": {"elements": {}, "word_count": 50},
    }

    ai_critical = {
        "score": 10.0,
        "queries": [
            {
                "intent_name": "Brand Discovery",
                "query": "Who is GhostCo?",
                "mentioned": False,
                "sentiment": "not_mentioned",
                "position": "omitted",
                "score": 10.0,
                "evidence_excerpt": "No information found.",
                "raw_response": "I do not have any verified records or information about GhostCo.",
            }
        ],
    }

    res = calculate_audit_score(analyzed_critical, ai_critical)
    assert res["technical_score"] < 30.0
    assert res["composite_score"] < 25.0

    # Ensure Critical issues are ranked first in Action Plan
    issues = res["issues"]
    assert len(issues) > 0
    assert issues[0].severity.value == "critical"
    critical_titles = [i.title for i in issues if i.severity.value == "critical"]
    assert any("Blocked" in t for t in critical_titles)
    assert any("Schema" in t for t in critical_titles)
    assert any("Title" in t for t in critical_titles)

