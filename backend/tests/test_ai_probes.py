"""Tests for the AI visibility measurement engine (probes, matching, scoring, failure handling)."""

import asyncio
import json

import pytest

from app import ai_simulator as sim
from app.ai_simulator import (
    BrandMatcher,
    GeminiClient,
    LLMResult,
    LLMUnavailableError,
    evaluate_organic_answer,
    parse_json_loose,
    registrable_root,
    run_ai_visibility_queries,
)
from app.config import AI_VIS_WEIGHTS, WEIGHT_AI_VISIBILITY, WEIGHT_TECHNICAL
from app.scoring import build_ai_findings, calculate_audit_score, compute_ai_visibility_score

BRAND, DOMAIN = "Acme Metrics", "acmemetrics.io"


# ---------------------------------------------------------------- helpers


def recs(*items):
    """Builds a model answer: items are (name, website) tuples, best first."""
    return json.dumps(
        {
            "recommendations": [
                {"rank": i, "name": n, "website": w, "reason": f"{n} is good"}
                for i, (n, w) in enumerate(items, start=1)
            ]
        }
    )


class FakeClient:
    """Scripted LLM client. `handler(prompt) -> str` or raises LLMUnavailableError."""

    def __init__(self, handler):
        self.handler = handler
        self.prompts = []
        self.models_used = ["fake-model"]

    async def generate(self, prompt, *, json_mode=False, temperature=0.0):
        self.prompts.append(prompt)
        return LLMResult(text=self.handler(prompt), model="fake-model")


def make_handler(organic_answers, perception=None, judge=None):
    """organic_answers: list consumed in order by English organic prompts; Indic prompts reuse the last."""
    state = {"i": 0}
    perception = perception or json.dumps(
        {"known": True, "description": "Acme Metrics is a real-time analytics dashboard for startups."}
    )
    judge = judge or json.dumps({"verdict": "accurate", "wrong_claims": [], "missing_facts": [], "explanation": "Matches."})

    def handler(prompt):
        if "market category" in prompt:
            return json.dumps({"category": "real-time analytics dashboards for startups"})
        if "strict fact-checker" in prompt:
            return judge
        if "What is Acme Metrics" in prompt:
            return perception
        if "Compare Acme Metrics" in prompt:
            return json.dumps({
                "sentiment": "positive", "recommended": True,
                "summary": "Acme Metrics leads in real-time dashboards.",
                "strengths": ["Fast"], "limitations": ["Niche"],
                "alternatives": [{"name": "Mixpanel", "website": "mixpanel.com"}],
            })
        if "A buyer evaluating solutions" in prompt:
            return json.dumps({
                "sentiment": "positive", "recommended": True,
                "summary": "Recommended for real-time startup analytics.",
                "trust_signals": ["Reliable"], "caveats": ["Smaller ecosystem"],
            })
        if "What are the best" in prompt:
            answer = organic_answers[min(state["i"], len(organic_answers) - 1)]
            state["i"] += 1
            return answer
        # Hindi / Kannada organic prompts
        return organic_answers[-1]

    return handler


@pytest.fixture(autouse=True)
def fixed_run_counts(monkeypatch):
    monkeypatch.setattr(sim, "get_probe_runs", lambda: 3)
    monkeypatch.setattr(sim, "get_indic_runs", lambda: 1)
    monkeypatch.setattr(sim, "get_probe_concurrency", lambda: 2)


SITE_FACTS = {
    "title": "Acme Metrics | Real-Time Analytics for Startups",
    "meta_description": "Acme Metrics is a real-time analytics dashboard for high-growth startups.",
    "main_headings": ["Know your growth in real time"],
}

ANALYZED = {
    "brand_name": BRAND,
    "category": "SaaS & Cloud Software",
    "crawlability": {
        "robots_txt_exists": True,
        "robots_parsed": {"blocked_ai_bots": [], "allowed_ai_bots": ["GPTBot"]},
        "sitemap_exists": True,
        "llms_txt_exists": True,
    },
    "schema": {"count": 1, "types": ["Organization", "WebSite", "FAQPage"]},
    "metadata": {
        "title": "Acme Metrics | Real-Time Analytics for Startups",
        "title_length": 47,
        "meta_description": "Acme Metrics is the leading real-time analytics dashboard for high-growth tech companies and startups worldwide.",
        "description_length": 118,
    },
    "headings": {"h1_count": 1, "h1_list": ["Know your growth"], "h2_count": 3, "h3_count": 2},
    "semantic_html": {"elements": {"main": 1, "header": 1, "nav": 1, "footer": 1, "section": 3}, "word_count": 800},
}


# ---------------------------------------------------------------- parsing & matching


def test_parse_json_loose_handles_fences_and_prose():
    assert parse_json_loose('```json\n{"a": 1}\n```') == {"a": 1}
    assert parse_json_loose('Sure! Here you go: {"a": 2} hope it helps') == {"a": 2}
    assert parse_json_loose("not json at all") is None
    assert parse_json_loose("") is None


def test_registrable_root():
    assert registrable_root("https://www.shop.razorpay.com/x") == "razorpay"
    assert registrable_root("foo.co.in") == "foo"
    assert registrable_root("www.example.com") == "example"
    assert registrable_root("") == ""


def test_brand_matcher_is_strict_about_substrings():
    m = BrandMatcher("Notion", "notion.so")
    assert m.matches("Notion", None)
    assert m.matches("Notion Labs, Inc.", None)
    assert m.matches("Whatever", "https://www.notion.so/product")
    assert not m.matches("Notional", None)
    assert not m.matches("Evernote", "evernote.com")

    render = BrandMatcher("Render", "render.com")
    assert not render.matches("Renderforest", None)
    assert render.matches("Render", "render.com")


# ---------------------------------------------------------------- single organic answer


def matcher():
    return BrandMatcher(BRAND, DOMAIN)


def organic(raw, language="en"):
    return evaluate_organic_answer(
        probe_id="organic_en#1", run_index=1, language=language, question="q",
        raw_text=raw, model_used="m", matcher=matcher(),
    )


def test_organic_answer_mentioned_with_rank_and_domain():
    f = organic(recs(("Mixpanel", "mixpanel.com"), ("Acme Metrics", "acmemetrics.io"), ("Amplitude", "amplitude.com")))
    assert f["mentioned"] and f["rank"] == 2
    assert f["recommended"] is True  # top 3
    assert f["cited_brand_domain"] is True
    assert f["cited_competitors"] == ["Mixpanel", "Amplitude"]
    assert f["score"] == 85.0
    assert f["branded"] is False


def test_organic_answer_not_mentioned_scores_zero():
    f = organic(recs(("Mixpanel", "mixpanel.com"), ("Amplitude", "amplitude.com")))
    assert not f["mentioned"] and f["rank"] is None and f["score"] == 0.0
    assert "Mixpanel" in f["evidence_excerpt"]


def test_organic_answer_name_only_has_no_domain_citation():
    f = organic(recs(("Acme Metrics", None)))
    assert f["mentioned"] and f["cited_brand_domain"] is False


def test_organic_answer_non_json_falls_back_to_text_match():
    f = organic("I would suggest Acme Metrics or Mixpanel.")
    assert f["mentioned"] and f["rank"] is None
    assert "not structured JSON" in f["error"]
    assert not organic("Try Mixpanel.")["mentioned"]


# ---------------------------------------------------------------- full probe run


def run(client, **kw):
    return asyncio.run(
        run_ai_visibility_queries(BRAND, DOMAIN, "SaaS & Cloud Software", "meta", site_facts=SITE_FACTS, client=client, **kw)
    )


def test_probe_plan_and_no_brand_leak_into_organic_prompts():
    answer = recs(("Mixpanel", "mixpanel.com"), ("Acme Metrics", "acmemetrics.io"))
    client = FakeClient(make_handler([answer]))
    raw = run(client)

    # 1 perception + 1 judge + 1 category + 4 EN organic + 1 HI + 1 KN + 2 branded deep-dive = 11 calls, 9 probes <= 10
    assert len(client.prompts) == 11
    assert raw["planned_probes"] == 9
    assert raw["planned_probes"] <= 10
    assert [q["probe_id"] for q in raw["queries"]] == [
        "perception#1",
        "organic_en#1", "organic_en#2",
        "organic_usecase#1", "organic_usecase#2",
        "organic_hi#1", "organic_kn#1",
        "brand_comparison#1", "brand_reputation#1",
    ]

    organic_prompts = [p for p in client.prompts if "A person asks an AI assistant" in p and "What is Acme" not in p]
    assert len(organic_prompts) == 6
    for prompt in organic_prompts:
        assert BRAND not in prompt and DOMAIN not in prompt
        assert "meta" not in prompt.lower().replace("metrics", "")  # meta description is never sent
    assert raw["category_source"] == "gemini"
    assert raw["category_used"] == "real-time analytics dashboards for startups"


def test_repeated_runs_measure_consistency_and_score_is_explainable():
    hit = recs(("Mixpanel", "mixpanel.com"), ("Acme Metrics", "acmemetrics.io"))
    miss = recs(("Mixpanel", "mixpanel.com"), ("Amplitude", "amplitude.com"))
    client = FakeClient(make_handler([hit, miss, hit, hit]))
    raw = run(client)

    findings = build_ai_findings(raw, BRAND)
    assert findings.available
    assert (findings.organic_runs, findings.organic_mentions) == (4, 3)
    assert findings.mention_rate == pytest.approx(75.0, abs=0.1)
    assert findings.recommendation_rate == pytest.approx(75.0, abs=0.1)

    comps = findings.score_components
    assert set(comps) == set(AI_VIS_WEIGHTS)
    assert sum(c["weight"] for c in comps.values()) == pytest.approx(100.0, abs=0.2)
    assert sum(c["points"] for c in comps.values()) == pytest.approx(findings.score, abs=0.2)

    sov = findings.competitor_share_of_voice
    assert BRAND in sov and "Mixpanel" in sov
    assert sum(sov.values()) <= 100.5


def test_perception_unknown_skips_judge_and_caps_score():
    answer = recs(("Mixpanel", "mixpanel.com"), ("Acme Metrics", "acmemetrics.io"))
    client = FakeClient(make_handler([answer], perception=json.dumps({"known": False, "description": ""})))
    raw = run(client)
    assert not any("strict fact-checker" in p for p in client.prompts)
    findings = build_ai_findings(raw, BRAND)
    assert findings.perception.verdict == "unknown"
    assert findings.score <= 45.0
    assert any("capped" in n for n in findings.notes)


def test_perception_hallucinated_is_capped_and_reported():
    answer = recs(("Acme Metrics", "acmemetrics.io"))
    judge = json.dumps({"verdict": "hallucinated", "wrong_claims": ["Says it sells shoes"], "missing_facts": [], "explanation": "Wrong industry."})
    raw = run(FakeClient(make_handler([answer], judge=judge)))
    result = calculate_audit_score(ANALYZED, raw)
    f = result["ai_visibility_findings"]
    assert f.perception.verdict == "hallucinated" and f.score <= 40.0
    titles = [i.title for i in result["issues"]]
    assert any("Incorrectly" in t for t in titles)


def test_judge_failure_uses_conservative_heuristic_never_hallucinated():
    answer = recs(("Acme Metrics", "acmemetrics.io"))

    def handler(prompt):
        if "strict fact-checker" in prompt:
            raise LLMUnavailableError("judge down")
        return make_handler([answer])(prompt)

    raw = run(FakeClient(handler))
    p = raw["perception"]
    assert p["judged_by"] == "heuristic"
    assert p["verdict"] in ("accurate", "partial")


def test_category_override_is_used_and_flagged():
    answer = recs(("Mixpanel", "mixpanel.com"))
    client = FakeClient(make_handler([answer]))
    raw = run(client, category_override="product analytics tools")
    assert raw["category_source"] == "user" and raw["category_used"] == "product analytics tools"
    assert not any("market category" in p for p in client.prompts)  # no inference call needed


# ---------------------------------------------------------------- failure: nothing is fabricated


def failing_client():
    def handler(prompt):
        raise LLMUnavailableError("quota exhausted")

    return FakeClient(handler)


def test_total_ai_failure_is_unavailable_not_invented():
    raw = run(failing_client())
    assert all(q["status"] == "unavailable" for q in raw["queries"])
    assert not any(q["mentioned"] for q in raw["queries"])

    result = calculate_audit_score(ANALYZED, raw)
    assert result["ai_visibility_available"] is False
    assert result["ai_visibility_score"] is None
    assert result["composite_score"] == result["technical_score"]
    assert result["weight_technical"] == 1.0 and result["weight_ai_visibility"] == 0.0
    assert "technical readiness only" in result["score_note"]
    assert any(i.title == "AI Visibility Could Not Be Measured" for i in result["issues"])
    assert "quota exhausted" in result["score_note"]


def test_missing_api_key_is_unavailable(monkeypatch):
    monkeypatch.setattr(sim, "get_gemini_api_key", lambda: "")
    raw = asyncio.run(run_ai_visibility_queries(BRAND, DOMAIN, "cat", "meta", site_facts=SITE_FACTS))
    assert raw["available"] is False and "GEMINI_API_KEY" in raw["unavailable_reason"]
    result = calculate_audit_score(ANALYZED, raw)
    assert result["ai_visibility_score"] is None


def test_partial_failure_excludes_failed_probes_and_reports_coverage():
    hit = recs(("Acme Metrics", "acmemetrics.io"))
    calls = {"n": 0}
    base = make_handler([hit])

    def handler(prompt):
        if "What are the best" in prompt:
            calls["n"] += 1
            if calls["n"] == 2:  # second English run fails
                raise LLMUnavailableError("429")
        return base(prompt)

    findings = build_ai_findings(run(FakeClient(handler)), BRAND)
    assert findings.available
    assert findings.organic_runs == 3  # the failed run is not counted as a miss
    assert findings.mention_rate == 100.0
    assert findings.coverage < 1.0
    assert any("excluded from scoring" in n for n in findings.notes)


# ---------------------------------------------------------------- score formula


def test_weights_sum_to_100_and_composite_weights_sum_to_1():
    assert sum(AI_VIS_WEIGHTS.values()) == pytest.approx(100.0)
    assert WEIGHT_TECHNICAL + WEIGHT_AI_VISIBILITY == pytest.approx(1.0)


def test_formula_perfect_and_zero():
    score, comps, cap = compute_ai_visibility_score(
        en_rate=1, indic_rate=1, rank_value=1, perception_value=1, citation_rate=1, perception_verdict="accurate"
    )
    assert score == 100.0 and cap is None
    zero, _, _ = compute_ai_visibility_score(
        en_rate=0, indic_rate=0, rank_value=0, perception_value=0.05, citation_rate=0, perception_verdict=None
    )
    assert zero == pytest.approx(1.5, abs=0.1)


def test_formula_renormalises_when_a_component_is_unmeasured():
    score, comps, _ = compute_ai_visibility_score(
        en_rate=1, indic_rate=None, rank_value=1, perception_value=1, citation_rate=1, perception_verdict="accurate"
    )
    assert score == 100.0  # missing Indic probes must not drag a perfect score down
    assert comps["organic_discovery_indic"]["value"] is None
    assert sum(c["weight"] for c in comps.values()) == pytest.approx(100.0, abs=0.2)


def test_knowledge_gating_caps_score():
    score, _, cap = compute_ai_visibility_score(
        en_rate=1, indic_rate=1, rank_value=1, perception_value=0.15, citation_rate=1, perception_verdict="unknown"
    )
    assert score == 45.0 and cap == 45.0


# ---------------------------------------------------------------- Gemini client behaviour


class FakeAPIError(Exception):
    def __init__(self, code, msg="err"):
        super().__init__(f"{code} {msg}")
        self.code = code


def client_with(script, monkeypatch):
    c = GeminiClient("dummy-key", models=["m1", "m2"])
    c.RETRY_DELAYS = (0.0, 0.0)
    calls = []

    async def fake_call(model, prompt, json_mode, temperature):
        calls.append(model)
        outcome = script(model, len(calls))
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    monkeypatch.setattr(c, "_call_once", fake_call)
    return c, calls


def test_gemini_client_retries_429_then_succeeds(monkeypatch):
    c, calls = client_with(lambda m, n: FakeAPIError(429) if n < 3 else "ok", monkeypatch)
    res = asyncio.run(c.generate("p"))
    assert res.text == "ok" and res.model == "m1" and calls == ["m1", "m1", "m1"]


def test_gemini_client_skips_unknown_model_and_remembers_it(monkeypatch):
    c, calls = client_with(lambda m, n: FakeAPIError(404) if m == "m1" else "ok", monkeypatch)
    assert asyncio.run(c.generate("p")).model == "m2"
    asyncio.run(c.generate("p"))
    assert calls == ["m1", "m2", "m2"]  # m1 is not retried on later calls


def test_gemini_client_auth_error_is_fatal_for_the_audit(monkeypatch):
    c, calls = client_with(lambda m, n: FakeAPIError(403), monkeypatch)
    with pytest.raises(LLMUnavailableError):
        asyncio.run(c.generate("p"))
    with pytest.raises(LLMUnavailableError):
        asyncio.run(c.generate("p"))
    assert len(calls) == 1  # second call short-circuits, no wasted requests


def test_gemini_client_all_models_failing_raises_unavailable(monkeypatch):
    c, _ = client_with(lambda m, n: FakeAPIError(503), monkeypatch)
    with pytest.raises(LLMUnavailableError):
        asyncio.run(c.generate("p"))


def test_quota_outage_fails_fast_and_does_not_multiply_requests(monkeypatch):
    """Regression: a total 429 outage used to cost ~21 requests per model per audit."""
    c, calls = client_with(lambda m, n: FakeAPIError(429), monkeypatch)
    c._models = ["m1", "m2", "m3", "m4", "m5"]
    with pytest.raises(LLMUnavailableError):
        asyncio.run(c.generate("p"))
    # Backoff retries only on the first model (3 attempts), one attempt on each fallback.
    assert len(calls) == 3 + 4
    # Every later call in the same audit fails immediately without touching the API.
    before = len(calls)
    for _ in range(10):
        with pytest.raises(LLMUnavailableError) as exc:
            asyncio.run(c.generate("p"))
    assert len(calls) == before
    assert "429" in str(exc.value)  # the real reason is preserved, not a generic message


def test_prose_perception_answer_is_not_mistaken_for_unknown_brand():
    """Regression: a non-JSON answer used to be read as an empty description -> 'unknown' -> score cap."""
    answer = recs(("Acme Metrics", "acmemetrics.io"))

    def handler(prompt):
        if "What is Acme Metrics" in prompt:
            return "Acme Metrics makes real-time analytics dashboards for startups."  # prose, not JSON
        return make_handler([answer])(prompt)

    raw = run(FakeClient(handler))
    p = raw["perception"]
    assert p["model_known_brand"] is True and p["verdict"] == "accurate"
    assert "real-time analytics" in p["model_description"]


def test_prose_answer_that_admits_ignorance_is_still_unknown():
    answer = recs(("Acme Metrics", "acmemetrics.io"))

    def handler(prompt):
        if "What is Acme Metrics" in prompt:
            return "I do not have any information about this company."
        return make_handler([answer])(prompt)

    assert run(FakeClient(handler))["perception"]["verdict"] == "unknown"


def test_empty_category_and_no_site_facts_do_not_break_the_run():
    answer = recs(("Mixpanel", "mixpanel.com"))
    client = FakeClient(make_handler([answer]))
    raw = asyncio.run(run_ai_visibility_queries(BRAND, DOMAIN, "", "", site_facts={}, client=client))
    assert raw["category_used"] == "products and services"
    assert raw["perception"]["judged_by"] == "none"  # nothing to verify against, stated honestly
    assert not any("strict fact-checker" in p for p in client.prompts)


def test_gemini_client_puts_503_model_on_cooldown(monkeypatch):
    c, calls = client_with(lambda m, n: FakeAPIError(503) if m == "m1" else "ok", monkeypatch)
    assert asyncio.run(c.generate("p")).model == "m2"
    asyncio.run(c.generate("p"))
    assert calls == ["m1", "m2", "m2"]  # m1 skipped while on cooldown


def test_secondary_category_used_on_usecase_runs():
    hit = recs(("Acme Metrics", "acmemetrics.io"))
    seen_cats = []

    def handler(prompt):
        if "market category" in prompt:
            return json.dumps({"category": "product analytics", "secondary_category": "web analytics tools"})
        if "What are the best" in prompt:
            seen_cats.append(prompt)
            return hit
        return make_handler([hit])(prompt)

    raw = run(FakeClient(handler))
    assert raw["category_used"] == "product analytics"
    assert any("web analytics tools" in p for p in seen_cats)
    assert any("product analytics" in p for p in seen_cats)
