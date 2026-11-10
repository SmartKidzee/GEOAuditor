from collections import Counter
from typing import Dict, Any, List, Optional, Tuple
from .config import (
    AI_VIS_WEIGHTS,
    PERCEPTION_SCORE_CAPS,
    WEIGHT_TECHNICAL,
    WEIGHT_AI_VISIBILITY,
)
from .ranking import rank_score
from .models import (
    CheckStatus,
    Severity,
    ActionPlanItem,
    TechnicalSignalCheck,
    TechnicalFindings,
    AiVisibilityFindings,
    AiVisibilityQueryFinding,
    PerceptionFinding,
)


def score_crawlability(crawl_data: Dict[str, Any]) -> Tuple[TechnicalSignalCheck, List[ActionPlanItem]]:
    robots_exists = crawl_data.get("robots_txt_exists", False)
    robots_parsed = crawl_data.get("robots_parsed", {})
    blocked_bots = robots_parsed.get("blocked_ai_bots", [])
    allowed_bots = robots_parsed.get("allowed_ai_bots", [])
    sitemap_exists = crawl_data.get("sitemap_exists", False)
    llms_exists = crawl_data.get("llms_txt_exists", False)

    score = 0.0
    issues = []

    # 1. robots.txt existence (10 pts)
    if robots_exists:
        score += 10.0
    else:
        issues.append(
            ActionPlanItem(
                severity=Severity.WARNING,
                title="Missing robots.txt File",
                detail="No robots.txt file was found at the site root.",
                related_check="Crawlability & AI Bots",
                recommendation="Deploy a standardized robots.txt file to guide AI crawlers and protect private paths. Download our generated robots.txt below.",
            )
        )

    # 2. AI bot blocking (10 pts)
    if robots_exists and not blocked_bots:
        score += 10.0
    elif blocked_bots:
        issues.append(
            ActionPlanItem(
                severity=Severity.CRITICAL,
                title="AI Bots Blocked in robots.txt",
                detail=f"The following AI crawlers are explicitly blocked or blocked by wildcard rules: {', '.join(blocked_bots)}.",
                related_check="Crawlability & AI Bots",
                recommendation="Update your robots.txt to explicitly allow AI crawlers (GPTBot, Google-Extended, PerplexityBot, ClaudeBot, etc.) so generative engines can index your content. Download our corrected robots.txt below.",
            )
        )
    elif not robots_exists:
        # Default allow on web, but no explicit directive
        score += 5.0

    # 3. sitemap.xml presence (5 pts)
    if sitemap_exists:
        score += 5.0
    else:
        issues.append(
            ActionPlanItem(
                severity=Severity.WARNING,
                title="Missing or Unlinked XML Sitemap",
                detail="No sitemap.xml was detected at /sitemap.xml or declared inside robots.txt.",
                related_check="Crawlability & AI Bots",
                recommendation="Generate and publish an XML sitemap to help crawlers discover all critical pages on your domain.",
            )
        )

    # 4. llms.txt presence (5 pts)
    if llms_exists:
        score += 5.0
    else:
        issues.append(
            ActionPlanItem(
                severity=Severity.WARNING,
                title="Missing /llms.txt File",
                detail="No /llms.txt was detected at domain root (llmstxt.org / Howard 2024 spec).",
                related_check="Crawlability & AI Bots",
                recommendation="Deploy an /llms.txt file to provide structured, markdown-formatted context directly to LLM context windows. Download our generated llms.txt below.",
            )
        )

    if score >= 25.0:
        status = CheckStatus.PASS
        details = f"Crawlability is healthy. {len(allowed_bots)} AI bots allowed."
    elif score >= 15.0:
        status = CheckStatus.WARN
        details = f"Crawlability needs improvement. Blocked bots: {len(blocked_bots)}. llms.txt present: {llms_exists}."
    else:
        status = CheckStatus.FAIL
        details = f"Crawlability is impaired. Blocked bots: {len(blocked_bots)}."

    evidence = {
        "robots_txt_exists": robots_exists,
        "blocked_ai_bots": blocked_bots,
        "allowed_ai_bots": allowed_bots,
        "sitemap_exists": sitemap_exists,
        "llms_txt_exists": llms_exists,
    }

    return TechnicalSignalCheck(
        name="Crawlability & AI Bots",
        status=status,
        score=score,
        max_score=30.0,
        details=details,
        evidence=evidence,
    ), issues


def score_schema(schema_data: Dict[str, Any], brand_name: str) -> Tuple[TechnicalSignalCheck, List[ActionPlanItem]]:
    count = schema_data.get("count", 0)
    types = schema_data.get("types", [])
    score = 0.0
    issues = []

    if count == 0:
        issues.append(
            ActionPlanItem(
                severity=Severity.CRITICAL,
                title="Completely Missing JSON-LD Schema Markup",
                detail="No Schema.org JSON-LD scripts were detected on this page.",
                related_check="JSON-LD & Schema Markup",
                recommendation="Add JSON-LD schema (at minimum Organization and WebSite types) with your official brand name, logo, description, and sameAs social profile links.",
            )
        )
    else:
        # JSON-LD present
        score += 10.0

        # Core schema: Organization, WebSite, Corporation, Brand, LocalBusiness, Product, Service
        core_types = {"Organization", "Corporation", "Brand", "WebSite", "LocalBusiness", "Product", "Service", "SoftwareApplication"}
        has_core = any(t in core_types for t in types)

        if has_core:
            score += 10.0
        else:
            issues.append(
                ActionPlanItem(
                    severity=Severity.WARNING,
                    title="Missing Organization or Brand Schema",
                    detail=f"Schema exists ({', '.join(types[:3])}), but lacks an explicit Organization or Brand entity.",
                    related_check="JSON-LD & Schema Markup",
                    recommendation="Add an 'Organization' schema to declare your brand entity, founding details, official name, and verified social URLs.",
                )
            )

        # Rich / Secondary schema: FAQPage, Article, HowTo, BreadcrumbList
        rich_types = {"FAQPage", "Article", "HowTo", "BreadcrumbList", "ItemPage"}
        has_rich = any(t in rich_types for t in types)
        if has_rich:
            score += 5.0
        else:
            issues.append(
                ActionPlanItem(
                    severity=Severity.OPPORTUNITY,
                    title="Opportunity: Add FAQPage or Rich Schema",
                    detail="FAQPage schema is one of the highest-yield sources for AI models generating direct conversational answers.",
                    related_check="JSON-LD & Schema Markup",
                    recommendation="Include FAQPage structured data on your key landing pages to increase the likelihood of being cited in direct Q&A answers.",
                )
            )

    if score >= 20.0:
        status = CheckStatus.PASS
        details = f"Rich JSON-LD markup found ({', '.join(types[:4])})."
    elif score >= 10.0:
        status = CheckStatus.WARN
        details = f"Partial JSON-LD markup ({len(types)} types detected)."
    else:
        status = CheckStatus.FAIL
        details = "No structured JSON-LD data found."

    evidence = {
        "schema_count": count,
        "types_detected": types,
    }

    return TechnicalSignalCheck(
        name="JSON-LD & Schema Markup",
        status=status,
        score=score,
        max_score=25.0,
        details=details,
        evidence=evidence,
    ), issues


def score_metadata_and_headings(
    meta_data: Dict[str, Any],
    heading_data: Dict[str, Any],
) -> Tuple[TechnicalSignalCheck, List[ActionPlanItem]]:
    score = 0.0
    issues = []

    title = meta_data.get("title", "")
    title_len = meta_data.get("title_length", 0)
    desc = meta_data.get("meta_description", "")
    desc_len = meta_data.get("description_length", 0)

    # Title check (7 pts)
    if title:
        score += 4.0
        if 20 <= title_len <= 70:
            score += 3.0
        else:
            issues.append(
                ActionPlanItem(
                    severity=Severity.WARNING,
                    title=f"Suboptimal Title Length ({title_len} chars)",
                    detail=f"Page title is '{title[:45]}...'. Recommended length is 30–60 characters for optimal AI chunking.",
                    related_check="Metadata & Headings",
                    recommendation="Adjust the page title to succinctly state your brand name and primary value proposition.",
                )
            )
    else:
        issues.append(
            ActionPlanItem(
                severity=Severity.CRITICAL,
                title="Missing Page Title Tag",
                detail="No <title> tag was found in the HTML header.",
                related_check="Metadata & Headings",
                recommendation="Add a descriptive <title> tag containing your brand name and core offering.",
            )
        )

    # Meta description check (8 pts)
    if desc:
        score += 4.0
        if 70 <= desc_len <= 180:
            score += 4.0
        else:
            issues.append(
                ActionPlanItem(
                    severity=Severity.WARNING,
                    title=f"Suboptimal Meta Description Length ({desc_len} chars)",
                    detail=f"Meta description is {desc_len} characters. Ideal length is 100–160 characters.",
                    related_check="Metadata & Headings",
                    recommendation="Craft a clear 120–160 character meta description summarizing what problems you solve.",
                )
            )
    else:
        issues.append(
            ActionPlanItem(
                severity=Severity.WARNING,
                title="Missing Meta Description",
                detail="No meta description tag was detected in page head.",
                related_check="Metadata & Headings",
                recommendation="Add a <meta name='description'> tag with a concise summary of your offering.",
            )
        )

    # Headings check (10 pts)
    h1_count = heading_data.get("h1_count", 0)
    h2_count = heading_data.get("h2_count", 0)
    h3_count = heading_data.get("h3_count", 0)

    if h1_count == 1:
        score += 5.0
    elif h1_count == 0:
        issues.append(
            ActionPlanItem(
                severity=Severity.CRITICAL,
                title="Missing <h1> Heading",
                detail="No <h1> tag was found on the page.",
                related_check="Metadata & Headings",
                recommendation="Add exactly one clear <h1> tag establishing the main subject of the page.",
            )
        )
    else:
        score += 2.0
        issues.append(
            ActionPlanItem(
                severity=Severity.WARNING,
                title=f"Multiple <h1> Headings ({h1_count} detected)",
                detail=f"Found {h1_count} <h1> tags. Multiple H1s dilute topic authority for AI parsers.",
                related_check="Metadata & Headings",
                recommendation="Ensure the page has only one primary <h1>, converting secondary sections into <h2>.",
            )
        )

    if h2_count > 0 or h3_count > 0:
        score += 5.0
    else:
        issues.append(
            ActionPlanItem(
                severity=Severity.OPPORTUNITY,
                title="Add Structured Subheadings (<h2>/<h3>)",
                detail="The page contains few or no structured <h2>/<h3> subheadings.",
                related_check="Metadata & Headings",
                recommendation="Organize page content into logical sections with descriptive <h2> and <h3> headers to aid AI document chunking.",
            )
        )

    if score >= 20.0:
        status = CheckStatus.PASS
        details = f"Strong title, meta description, and heading hierarchy (1 H1, {h2_count} H2s)."
    elif score >= 12.0:
        status = CheckStatus.WARN
        details = f"Partial metadata/heading structure (H1 count: {h1_count}, title len: {title_len})."
    else:
        status = CheckStatus.FAIL
        details = "Critical metadata or heading tags missing."

    evidence = {
        "title": title,
        "title_length": title_len,
        "meta_description": desc,
        "description_length": desc_len,
        "h1_count": h1_count,
        "h1_sample": heading_data.get("h1_list", [])[:1],
        "h2_count": h2_count,
        "h3_count": h3_count,
    }

    return TechnicalSignalCheck(
        name="Metadata & Heading Structure",
        status=status,
        score=score,
        max_score=25.0,
        details=details,
        evidence=evidence,
    ), issues


def score_semantic_html(semantic_data: Dict[str, Any]) -> Tuple[TechnicalSignalCheck, List[ActionPlanItem]]:
    elements = semantic_data.get("elements", {})
    word_count = semantic_data.get("word_count", 0)
    score = 0.0
    issues = []

    # 1. Main landmark (7 pts)
    if elements.get("main", 0) > 0:
        score += 7.0
    else:
        issues.append(
            ActionPlanItem(
                severity=Severity.OPPORTUNITY,
                title="Missing Semantic <main> Element",
                detail="Page does not wrap its central content inside a semantic <main> tag.",
                related_check="Semantic HTML & Architecture",
                recommendation="Enclose your core page content in a <main> tag so AI crawlers can distinguish content from navigational boilerplate.",
            )
        )

    # 2. Structural landmarks header/nav/footer (7 pts)
    structural_count = sum(1 for tag in ("header", "nav", "footer") if elements.get(tag, 0) > 0)
    if structural_count >= 2:
        score += 7.0
    elif structural_count == 1:
        score += 4.0

    # 3. Content tags article/section (6 pts)
    content_tags = elements.get("article", 0) + elements.get("section", 0)
    if content_tags >= 2:
        score += 6.0
    elif content_tags == 1:
        score += 3.0

    if score >= 15.0:
        status = CheckStatus.PASS
        details = f"Clean semantic HTML structure with {word_count} words of readable body text."
    elif score >= 10.0:
        status = CheckStatus.WARN
        details = f"Basic semantic elements present ({structural_count}/3 standard landmarks)."
    else:
        status = CheckStatus.FAIL
        details = "Page relies primarily on unsemantic <div> containers."

    evidence = {
        "elements": elements,
        "word_count": word_count,
    }

    return TechnicalSignalCheck(
        name="Semantic HTML & Architecture",
        status=status,
        score=score,
        max_score=20.0,
        details=details,
        evidence=evidence,
    ), issues


# ======================================================================================
# AI visibility scoring
# ======================================================================================

METHODOLOGY_TEXT = (
    "Each probe is a separate LLM call. Organic discovery asks a category question without naming "
    "the brand and checks whether the brand surfaces on its own; the English probe is repeated and "
    "run with sampling enabled so the result is a rate, not a single yes/no. Hindi and Kannada "
    "probes test the same question in those languages. A perception probe asks the model what it "
    "believes the brand is and a judge compares the answer with facts from the site. Competitors and "
    "share of voice come from the models' own ranked lists. A probe whose call fails is excluded from "
    "scoring; nothing is estimated or generated to fill a gap. Gemini is used as a proxy for "
    "generative engines in general; results for other engines (ChatGPT, Perplexity, Copilot) may differ."
)

MARKETS = {
    "en": ("Global English", "English (en)", "Aggarwal et al. (GEO 2024)"),
    "hi": ("Indic Hindi", "Hindi (hi)", "IndicGenBench / MILU"),
    "kn": ("Indic Kannada (Regional)", "Kannada (kn)", "Indic QA Benchmark / NIE Mysuru"),
}


def _pct(numerator: float, denominator: float) -> float:
    return round((numerator / denominator) * 100, 1) if denominator else 0.0


def compute_ai_visibility_score(
    *,
    en_rate: Optional[float],
    indic_rate: Optional[float],
    rank_value: Optional[float],
    perception_value: Optional[float],
    citation_rate: Optional[float],
    perception_verdict: Optional[str],
) -> Tuple[float, Dict[str, Any], Optional[float]]:
    """
    Pure function. Every input is a 0..1 value or None (None = could not be measured, so the
    component is dropped and the remaining weights are renormalised).

    AI Visibility = sum(weight_i * value_i) / sum(weight_i over measured components) * 100,
    then capped when the model does not know or misdescribes the brand (knowledge gating).

    Returns (score, per-component breakdown, cap_applied or None).
    """
    values = {
        "organic_discovery_en": en_rate,
        "organic_discovery_indic": indic_rate,
        "rank_prominence": rank_value,
        "perception_accuracy": perception_value,
        "domain_citation": citation_rate,
    }
    measured = {k: v for k, v in values.items() if v is not None}
    total_weight = sum(AI_VIS_WEIGHTS[k] for k in measured)
    if total_weight <= 0:
        return 0.0, {}, None

    breakdown: Dict[str, Any] = {}
    raw_score = 0.0
    for key, weight in AI_VIS_WEIGHTS.items():
        value = values[key]
        if value is None:
            breakdown[key] = {"value": None, "weight": 0.0, "points": 0.0}
            continue
        effective_weight = weight / total_weight * 100
        points = effective_weight * value
        raw_score += points
        breakdown[key] = {
            "value": round(value * 100, 1),
            "weight": round(effective_weight, 1),
            "points": round(points, 1),
        }

    cap = PERCEPTION_SCORE_CAPS.get(perception_verdict or "")
    cap_applied: Optional[float] = None
    if cap is not None and raw_score > cap:
        raw_score, cap_applied = cap, cap
    return round(raw_score, 1), breakdown, cap_applied


def build_ai_findings(raw: Dict[str, Any], brand_name: str) -> AiVisibilityFindings:
    """Aggregates raw probe results into scored, explainable AI visibility findings."""
    queries = [AiVisibilityQueryFinding(**q) for q in raw.get("queries", [])]
    planned = int(raw.get("planned_probes") or len(queries))
    ok = [q for q in queries if q.status == "ok"]
    organic = [q for q in ok if q.probe_type == "organic_discovery"]
    by_lang: Dict[str, List[AiVisibilityQueryFinding]] = {
        lang: [q for q in organic if q.language == lang] for lang in ("en", "hi", "kn")
    }
    en = by_lang["en"]

    perception_raw = raw.get("perception")
    perception = PerceptionFinding(**perception_raw) if perception_raw else None

    common: Dict[str, Any] = dict(
        queries=queries,
        coverage=round(len(ok) / planned, 2) if planned else 0.0,
        perception=perception,
        category_used=raw.get("category_used", ""),
        category_source=raw.get("category_source", ""),
        engine_used=raw.get("engine_used", ""),
        methodology=METHODOLOGY_TEXT,
    )

    if not raw.get("available", True) or not en:
        reason = raw.get("unavailable_reason") or "No English organic-discovery probe returned an answer."
        return AiVisibilityFindings(
            score=None,
            available=False,
            unavailable_reason=reason,
            notes=["AI visibility was not scored. No AI data was estimated or substituted."],
            **common,
        )

    # --- Rates -------------------------------------------------------------------------
    en_mentions = sum(1 for q in en if q.mentioned)
    en_rate = en_mentions / len(en)
    en_recommended = sum(1 for q in en if q.recommended)
    en_cited = sum(1 for q in en if q.cited_brand_domain)

    indic_rates = [
        sum(1 for q in runs if q.mentioned) / len(runs)
        for lang, runs in by_lang.items()
        if lang != "en" and runs
    ]
    indic_rate = sum(indic_rates) / len(indic_rates) if indic_rates else None

    mentioned_runs = [q for q in organic if q.mentioned]
    if mentioned_runs:
        rank_value: Optional[float] = sum(rank_score(q.rank) for q in mentioned_runs) / len(mentioned_runs)
    else:
        rank_value = 0.0

    perception_value = (
        perception.score / 100 if perception and perception.verdict != "unavailable" else None
    )
    perception_verdict = perception.verdict if perception and perception.verdict != "unavailable" else None

    score, components, cap_applied = compute_ai_visibility_score(
        en_rate=en_rate,
        indic_rate=indic_rate,
        rank_value=rank_value,
        perception_value=perception_value,
        citation_rate=en_cited / len(en),
        perception_verdict=perception_verdict,
    )

    # --- Share of voice (from the models' own lists) ------------------------------------
    brand_mentions = len(mentioned_runs)
    competitor_counts: Counter = Counter()
    display_name: Dict[str, str] = {}
    for q in organic:
        for name in q.cited_competitors:
            key = "".join(ch for ch in name.lower() if ch.isalnum())
            if key:
                competitor_counts[key] += 1
                display_name.setdefault(key, name)
    total_listings = brand_mentions + sum(competitor_counts.values())
    sov: Dict[str, float] = {brand_name: _pct(brand_mentions, total_listings)}
    for key, count in competitor_counts.most_common(5):
        sov[display_name[key]] = _pct(count, total_listings)

    # --- Per-language breakdown ---------------------------------------------------------
    breakdown: List[Dict[str, Any]] = []
    for lang in ("en", "hi", "kn"):
        market, language_label, reference = MARKETS[lang]
        runs = by_lang[lang]
        mentions = sum(1 for q in runs if q.mentioned)
        breakdown.append(
            {
                "market": market,
                "language": language_label,
                "average_score": round(sum(q.score for q in runs) / len(runs), 1) if runs else 0.0,
                "queries_evaluated": len(runs),
                "mentions": mentions,
                "mention_rate": _pct(mentions, len(runs)),
                "status": "measured" if runs else "unavailable",
                "benchmark_reference": reference,
            }
        )

    # --- Notes shown with the report ------------------------------------------------------
    notes: List[str] = []
    failed = planned - len(ok)
    if failed > 0:
        notes.append(f"{failed} of {planned} probes returned no answer and were excluded from scoring.")
    if len(en) < 3:
        notes.append(f"Only {len(en)} English organic run(s) completed; treat the rates as indicative.")
    if cap_applied is not None:
        notes.append(
            f"Score capped at {cap_applied:g}: the model's perception of the brand was "
            f"'{perception_verdict}', so the brand cannot be considered visible."
        )
    if perception and perception.judged_by == "heuristic":
        notes.append("The perception judge call failed; a conservative keyword comparison was used instead.")
    if common["category_source"] == "heuristic":
        notes.append(
            "The market category was inferred with a keyword heuristic. If it is inaccurate, "
            "re-run the audit with a category override."
        )

    return AiVisibilityFindings(
        score=score,
        available=True,
        coverage=common.pop("coverage"),
        mention_rate=_pct(en_mentions, len(en)),
        recommendation_rate=_pct(en_recommended, len(en)),
        brand_citation_rate=_pct(en_cited, len(en)),
        organic_runs=len(en),
        organic_mentions=en_mentions,
        competitor_share_of_voice=sov,
        multilingual_breakdown=breakdown,
        score_components=components,
        notes=notes,
        **common,
    )


def evaluate_ai_findings_for_action_plan(
    f: AiVisibilityFindings,
    brand_name: str,
    blocked_ai_bots: Optional[List[str]] = None,
) -> List[ActionPlanItem]:
    issues: List[ActionPlanItem] = []

    if not f.available:
        issues.append(
            ActionPlanItem(
                severity=Severity.WARNING,
                title="AI Visibility Could Not Be Measured",
                detail=f"{f.unavailable_reason} The composite score reflects technical readiness only.",
                related_check="AI Visibility",
                recommendation="Check the Gemini API key and quota on the server, then re-run the audit. No estimated AI data is shown.",
            )
        )
        return issues

    n, k = f.organic_runs, f.organic_mentions
    en_query = next((q.query for q in f.queries if q.probe_type == "organic_discovery" and q.language == "en"), "")

    if k == 0:
        issues.append(
            ActionPlanItem(
                severity=Severity.CRITICAL,
                title="Not Recommended Unprompted by AI",
                detail=f"Asked '{en_query}' without naming any brand, the AI did not surface {brand_name} in any of {n} run(s).",
                related_check="AI Visibility — Organic Discovery",
                recommendation="Increase topical authority in your niche: publish problem-solving content and case studies, earn third-party reviews and listings, and make the brand's category explicit on the homepage.",
            )
        )
    elif k < n:
        issues.append(
            ActionPlanItem(
                severity=Severity.WARNING,
                title="Inconsistent AI Visibility",
                detail=f"{brand_name} appeared unprompted in {k} of {n} English runs. Visibility is unstable rather than established.",
                related_check="AI Visibility — Organic Discovery",
                recommendation="Strengthen repeated, consistent brand-to-category signals (homepage copy, schema, third-party mentions) so the brand surfaces reliably.",
            )
        )

    if k > 0:
        for item in f.multilingual_breakdown:
            if item["language"].startswith("English") or item["status"] != "measured":
                continue
            if item["mentions"] == 0:
                lang_name = item["language"].split(" ")[0]
                issues.append(
                    ActionPlanItem(
                        severity=Severity.WARNING,
                        title=f"Absent from {lang_name} AI Answers",
                        detail=f"{brand_name} surfaced in English answers but not when the same question was asked in {lang_name}.",
                        related_check=f"AI Visibility — {lang_name} Discovery",
                        recommendation=f"Publish {lang_name} content (localized landing pages with hreflang) and seek {lang_name}-language mentions.",
                    )
                )

    p = f.perception
    if p and p.verdict == "unknown":
        issues.append(
            ActionPlanItem(
                severity=Severity.CRITICAL,
                title=f"AI Models Do Not Recognise {brand_name}",
                detail="Asked directly what the brand is, the model said it does not know it.",
                related_check="AI Visibility — Brand Perception",
                recommendation="Build verified entity signals: Organization schema with sameAs links, a clear About page, a Wikidata/Crunchbase profile, and press coverage.",
            )
        )
    elif p and p.verdict == "hallucinated":
        claims = "; ".join(p.wrong_claims) or p.explanation
        issues.append(
            ActionPlanItem(
                severity=Severity.CRITICAL,
                title=f"AI Models Describe {brand_name} Incorrectly",
                detail=f"The model's description contradicts the website. {claims}".strip(),
                related_check="AI Visibility — Brand Perception",
                recommendation="State what the brand is and does in one plain sentence on the homepage and in Organization schema, publish /llms.txt, and correct inaccurate third-party profiles.",
            )
        )
    elif p and p.verdict == "partial":
        gaps = "; ".join(p.missing_facts) or p.explanation
        issues.append(
            ActionPlanItem(
                severity=Severity.WARNING,
                title=f"AI Description of {brand_name} Is Incomplete",
                detail=f"The model knows the brand but its description is vague or missing key points. {gaps}".strip(),
                related_check="AI Visibility — Brand Perception",
                recommendation="Make key facts (what you offer, for whom, where) explicit in headings and structured data so models can restate them.",
            )
        )

    competitors = [(name, pct) for name, pct in f.competitor_share_of_voice.items() if name != brand_name]
    brand_share = f.competitor_share_of_voice.get(brand_name, 0.0)
    if competitors and competitors[0][1] > brand_share and k < n:
        top = ", ".join(f"{name} ({pct}%)" for name, pct in competitors[:3])
        issues.append(
            ActionPlanItem(
                severity=Severity.OPPORTUNITY,
                title="Competitors Dominate AI Answers",
                detail=f"In the AI's own recommendation lists, {brand_name} holds {brand_share}% of mentions versus {top}.",
                related_check="AI Visibility — Share of Voice",
                recommendation=f"Create balanced comparison pages ('{brand_name} vs {competitors[0][0]}') and highlight differentiators and niche use-cases.",
            )
        )

    if k > 0 and f.brand_citation_rate < 50:
        issues.append(
            ActionPlanItem(
                severity=Severity.OPPORTUNITY,
                title="Official Domain Rarely Attached to Mentions",
                detail=f"When {brand_name} was recommended, the model supplied its official domain in only {f.brand_citation_rate}% of runs.",
                related_check="AI Visibility — Domain Citation",
                recommendation="Use the same brand name and canonical domain everywhere (schema, sameAs profiles, press) so models link the name to the site.",
            )
        )

    if blocked_ai_bots and f.mention_rate < 50:
        issues.append(
            ActionPlanItem(
                severity=Severity.WARNING,
                title="Blocked AI Crawlers May Be Limiting Visibility",
                detail=f"Low organic visibility coincides with robots.txt blocking: {', '.join(blocked_ai_bots)}.",
                related_check="Technical ↔ Visibility",
                recommendation="Allow AI crawlers in robots.txt (see the generated file) so your content can be learned and cited.",
            )
        )

    return issues


def calculate_audit_score(
    analyzed_content: Dict[str, Any],
    ai_visibility_raw: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Pure function computing Technical Score, AI Visibility Score, Composite Score,
    and the prioritized Action Plan.

    Composite = WEIGHT_TECHNICAL * technical + WEIGHT_AI_VISIBILITY * ai_visibility.
    If AI visibility could not be measured, the composite equals the technical score and the
    result says so explicitly (score_note); no AI data is ever invented.
    """
    brand_name = analyzed_content.get("brand_name", "")
    category = analyzed_content.get("category", "")

    # 1. Technical checks
    crawl_check, crawl_issues = score_crawlability(analyzed_content.get("crawlability", {}))
    schema_check, schema_issues = score_schema(analyzed_content.get("schema", {}), brand_name)
    meta_check, meta_issues = score_metadata_and_headings(
        analyzed_content.get("metadata", {}),
        analyzed_content.get("headings", {}),
    )
    semantic_check, semantic_issues = score_semantic_html(analyzed_content.get("semantic_html", {}))

    technical_score = round(crawl_check.score + schema_check.score + meta_check.score + semantic_check.score, 1)

    technical_findings = TechnicalFindings(
        score=technical_score,
        metadata_headings=meta_check,
        json_ld_schema=schema_check,
        crawlability_bots=crawl_check,
        semantic_html=semantic_check,
        extracted_brand=brand_name,
        extracted_category=category,
        summary=f"Technical Readiness: {technical_score}/100",
    )

    # 2. AI visibility (measured from real probe answers, or explicitly unavailable)
    ai_findings = build_ai_findings(ai_visibility_raw, brand_name)
    blocked = analyzed_content.get("crawlability", {}).get("robots_parsed", {}).get("blocked_ai_bots", [])
    ai_issues = evaluate_ai_findings_for_action_plan(ai_findings, brand_name, blocked)

    # 3. Composite GEO Score
    if ai_findings.available and ai_findings.score is not None:
        weight_technical, weight_ai = WEIGHT_TECHNICAL, WEIGHT_AI_VISIBILITY
        composite_score = round((weight_technical * technical_score) + (weight_ai * ai_findings.score), 1)
        score_note: Optional[str] = None
    else:
        weight_technical, weight_ai = 1.0, 0.0
        composite_score = technical_score
        score_note = (
            "AI visibility could not be measured, so this score reflects technical readiness only. "
            f"Reason: {ai_findings.unavailable_reason}"
        )

    # 4. Action Plan: prioritized (Critical first, then Warning, then Opportunity)
    all_issues = crawl_issues + schema_issues + meta_issues + semantic_issues + ai_issues
    severity_order = {Severity.CRITICAL: 0, Severity.WARNING: 1, Severity.OPPORTUNITY: 2}
    sorted_issues = sorted(all_issues, key=lambda x: severity_order.get(x.severity, 3))

    return {
        "composite_score": composite_score,
        "technical_score": technical_score,
        "ai_visibility_score": ai_findings.score,
        "ai_visibility_available": ai_findings.available,
        "score_note": score_note,
        "weight_technical": weight_technical,
        "weight_ai_visibility": weight_ai,
        "technical_findings": technical_findings,
        "ai_visibility_findings": ai_findings,
        "issues": sorted_issues,
    }
