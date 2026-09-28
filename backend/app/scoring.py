from typing import Dict, Any, List, Tuple
from .config import WEIGHT_TECHNICAL, WEIGHT_AI_VISIBILITY
from .models import (
    CheckStatus,
    Severity,
    ActionPlanItem,
    TechnicalSignalCheck,
    TechnicalFindings,
    AiVisibilityFindings,
    AiVisibilityQueryFinding,
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


def evaluate_ai_findings_for_action_plan(
    ai_findings: Dict[str, Any],
    brand_name: str,
    category: str,
) -> List[ActionPlanItem]:
    issues = []
    queries = ai_findings.get("queries", [])

    for q in queries:
        intent = q.get("intent_name", "")
        mentioned = q.get("mentioned", False)
        score = q.get("score", 0.0)

        if intent == "Brand Discovery" and not mentioned:
            issues.append(
                ActionPlanItem(
                    severity=Severity.CRITICAL,
                    title="Brand Unknown to Generative AI",
                    detail=f"In the Brand Discovery check ('{q.get('query')}'), Gemini did not recognize {brand_name}.",
                    related_check="AI Visibility — Brand Discovery",
                    recommendation=f"Build verified brand entity signals: publish clear 'About' content, establish sameAs schema links to social and crunchbase profiles, and secure press mentions.",
                )
            )
        elif intent == "Category Search" and not mentioned:
            issues.append(
                ActionPlanItem(
                    severity=Severity.WARNING,
                    title=f"Omitted from Category Recommendations ({category})",
                    detail=f"When asked '{q.get('query')}', the AI did not include {brand_name} in its suggested solutions.",
                    related_check="AI Visibility — Category Search",
                    recommendation="Increase topical authority in your niche by publishing comprehensive problem-solving content, case studies, and third-party software review listings.",
                )
            )
        elif intent == "Comparative Analysis" and not mentioned:
            issues.append(
                ActionPlanItem(
                    severity=Severity.WARNING,
                    title="Absent from Comparative Alternatives",
                    detail=f"Gemini did not feature {brand_name} when evaluating alternatives in {category}.",
                    related_check="AI Visibility — Comparative Analysis",
                    recommendation=f"Create direct comparison pages (e.g. '{brand_name} vs Competitor') with balanced, factual feature tables.",
                )
            )
        elif intent == "Market Alternatives" and score < 60:
            issues.append(
                ActionPlanItem(
                    severity=Severity.OPPORTUNITY,
                    title="Strengthen Market Alternatives Footprint",
                    detail=f"Low prominence in market alternatives search for {category}.",
                    related_check="AI Visibility — Market Alternatives",
                    recommendation="Highlight unique differentiators and niche use-cases where your solution outperforms industry incumbents.",
                )
            )

    return issues


def calculate_audit_score(
    analyzed_content: Dict[str, Any],
    ai_visibility_raw: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Pure function computing Technical Score, AI Visibility Score, Composite Score,
    and prioritized Action Plan.
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

    # 2. AI Visibility
    ai_score = round(ai_visibility_raw.get("score", 0.0), 1)
    query_findings = [
        AiVisibilityQueryFinding(**q) for q in ai_visibility_raw.get("queries", [])
    ]
    ai_findings_model = AiVisibilityFindings(
        score=ai_score,
        queries=query_findings,
        mention_rate=ai_visibility_raw.get("mention_rate", 0.0),
        recommendation_rate=ai_visibility_raw.get("recommendation_rate", 0.0),
        brand_citation_rate=ai_visibility_raw.get("brand_citation_rate", 0.0),
        competitor_share_of_voice=ai_visibility_raw.get("competitor_share_of_voice", {}),
        multilingual_breakdown=ai_visibility_raw.get("multilingual_breakdown", []),
    )
    ai_issues = evaluate_ai_findings_for_action_plan(ai_visibility_raw, brand_name, category)

    # 3. Composite GEO Score (40% Technical, 60% AI Visibility)
    composite_score = round(
        (WEIGHT_TECHNICAL * technical_score) + (WEIGHT_AI_VISIBILITY * ai_score),
        1,
    )

    # 4. Action Plan: prioritized (Critical first, then Warning, then Opportunity)
    all_issues = crawl_issues + schema_issues + meta_issues + semantic_issues + ai_issues

    severity_order = {Severity.CRITICAL: 0, Severity.WARNING: 1, Severity.OPPORTUNITY: 2}
    sorted_issues = sorted(all_issues, key=lambda x: severity_order.get(x.severity, 3))

    return {
        "composite_score": composite_score,
        "technical_score": technical_score,
        "ai_visibility_score": ai_score,
        "weight_technical": WEIGHT_TECHNICAL,
        "weight_ai_visibility": WEIGHT_AI_VISIBILITY,
        "technical_findings": technical_findings,
        "ai_visibility_findings": ai_findings_model,
        "issues": sorted_issues,
    }
