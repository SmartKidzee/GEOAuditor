import re
import json
from urllib.parse import urlparse, urljoin
from bs4 import BeautifulSoup
from typing import Dict, Any, List, Optional
from .config import AI_BOTS


def clean_text(text: Optional[str]) -> str:
    if not text:
        return ""
    return re.sub(r"\s+", " ", text).strip()


def parse_robots_txt(robots_content: str) -> Dict[str, Any]:
    """
    Parses robots.txt according to RFC 9309 rules.
    Detects directives for User-agent: * and specific AI bots.
    """
    if not robots_content:
        return {
            "exists": False,
            "raw": "",
            "blocks_all": False,
            "blocked_ai_bots": [],
            "allowed_ai_bots": [],
            "sitemaps": [],
            "custom_disallows": [],
        }

    lines = robots_content.splitlines()
    user_agents = []
    agent_rules: Dict[str, List[Dict[str, str]]] = {}
    current_agents = []
    in_rules = False
    sitemaps = []
    custom_disallows = []

    for raw_line in lines:
        line = raw_line.split("#", 1)[0].strip()
        if not line:
            continue
        
        if ":" in line:
            directive, value = line.split(":", 1)
            directive = directive.strip().lower()
            value = value.strip()

            if directive == "sitemap":
                sitemaps.append(value)
            elif directive == "user-agent":
                if in_rules:
                    current_agents = [value]
                    in_rules = False
                else:
                    current_agents.append(value)
            elif directive in ("disallow", "allow"):
                in_rules = True
                if not current_agents:
                    current_agents = ["*"]
                for ag in current_agents:
                    ag_key = ag.lower()
                    if ag_key not in agent_rules:
                        agent_rules[ag_key] = []
                    agent_rules[ag_key].append({"type": directive, "path": value})
                if directive == "disallow" and value:
                    custom_disallows.append(value)

    # Check wildcard rule
    wildcard_rules = agent_rules.get("*", [])
    blocks_all = any(r["type"] == "disallow" and (r["path"] == "/" or r["path"] == "/*") for r in wildcard_rules)

    blocked_ai_bots = []
    allowed_ai_bots = []

    for bot in AI_BOTS:
        bot_key = bot.lower()
        if bot_key in agent_rules:
            rules = agent_rules[bot_key]
            # Check most specific rule
            is_disallowed = any(r["type"] == "disallow" and (r["path"] == "/" or r["path"] == "/*") for r in rules)
            is_allowed = any(r["type"] == "allow" and r["path"] == "/" for r in rules)
            if is_disallowed and not is_allowed:
                blocked_ai_bots.append(bot)
            else:
                allowed_ai_bots.append(bot)
        else:
            # Falls back to wildcard
            if blocks_all:
                blocked_ai_bots.append(bot)
            else:
                allowed_ai_bots.append(bot)

    return {
        "exists": True,
        "raw": robots_content,
        "blocks_all": blocks_all,
        "blocked_ai_bots": blocked_ai_bots,
        "allowed_ai_bots": allowed_ai_bots,
        "sitemaps": sitemaps,
        "custom_disallows": list(set(custom_disallows)),
    }


def extract_brand_name(soup: BeautifulSoup, domain: str) -> str:
    # 1. og:site_name
    og_site = soup.find("meta", property="og:site_name")
    if og_site and og_site.get("content"):
        return clean_text(og_site["content"])

    # 2. JSON-LD Organization name
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "")
            if isinstance(data, list):
                items = data
            elif isinstance(data, dict) and "@graph" in data:
                items = data["@graph"]
            elif isinstance(data, dict):
                items = [data]
            else:
                items = []

            for item in items:
                if isinstance(item, dict) and item.get("@type") in ("Organization", "Corporation", "Brand", "WebSite"):
                    if item.get("name"):
                        return clean_text(item["name"])
        except Exception:
            continue

    # 3. Title parsing (before | or - or –)
    title_tag = soup.find("title")
    if title_tag and title_tag.string:
        t = title_tag.string.strip()
        parts = re.split(r"[\s\-_|:•·]+", t)
        if parts and len(parts[0]) > 1:
            return parts[0].strip()

    # 4. Domain fallback (strip www. and .com/tld)
    dom = domain.lower()
    if dom.startswith("www."):
        dom = dom[4:]
    return dom.split(".")[0].capitalize()


def extract_category_and_industry(soup: BeautifulSoup, brand: str, meta_desc: str) -> str:
    """Infers the category or industry from meta tags, heading content, and keywords."""
    meta_keywords = soup.find("meta", attrs={"name": "keywords"})
    kw_text = meta_keywords.get("content", "") if meta_keywords else ""

    text_corpus = f"{meta_desc} {kw_text} ".lower()

    # Common categories
    categories = [
        ("AI & Machine Learning", ["artificial intelligence", "machine learning", "ai agent", "llm", "deep learning", "generative ai"]),
        ("SaaS & Cloud Software", ["saas", "software as a service", "cloud platform", "workflow automation", "project management"]),
        ("E-Commerce & Retail", ["shop", "store", "ecommerce", "e-commerce", "apparel", "cart", "products", "retail"]),
        ("Developer Tools & DevOps", ["api", "sdk", "developer", "open source", "database", "devops", "code", "github"]),
        ("Fintech & Banking", ["fintech", "banking", "payments", "crypto", "investing", "finance", "credit"]),
        ("Healthcare & MedTech", ["health", "medical", "clinic", "wellness", "patients", "healthcare", "pharma"]),
        ("Marketing & SEO", ["seo", "marketing", "content creation", "copywriting", "social media", "growth"]),
        ("Cybersecurity", ["security", "cybersecurity", "compliance", "privacy", "firewall", "encryption"]),
        ("Education & EdTech", ["learning", "courses", "education", "academy", "training", "university"]),
    ]

    for cat_name, keywords in categories:
        if any(kw in text_corpus for kw in keywords):
            return cat_name

    # Fallback to first non-brand strong noun or general industry
    if meta_desc:
        first_sentence = meta_desc.split(".")[0]
        words = [w for w in first_sentence.split() if len(w) > 4 and w.lower() != brand.lower()]
        if len(words) >= 2:
            return " ".join(words[:3])

    return "Digital Products & Services"


def extract_navigation_links(soup: BeautifulSoup, base_url: str) -> List[Dict[str, str]]:
    """Extracts real, clean navigation links from the page (no fake links)."""
    links = []
    seen_urls = set()

    # Look inside nav or header first, then general a tags
    containers = soup.find_all(["nav", "header"])
    if not containers:
        containers = [soup]

    for c in containers:
        for a in c.find_all("a", href=True):
            href = a.get("href", "").strip()
            text = clean_text(a.get_text())

            if not href or href.startswith("#") or href.startswith("javascript:") or href.startswith("mailto:") or href.startswith("tel:"):
                continue

            full_url = urljoin(base_url, href)
            # Only keep links within same domain
            if urlparse(full_url).netloc == urlparse(base_url).netloc:
                if full_url not in seen_urls and len(text) > 2 and len(text) < 40:
                    seen_urls.add(full_url)
                    links.append({"title": text, "url": full_url})
                    if len(links) >= 10:
                        break
        if len(links) >= 10:
            break

    return links


def _extract_body_excerpt(soup: BeautifulSoup, limit: int = 500) -> str:
    """Extracts a concise readable excerpt from main/paragraph text, ignoring nav/footer chrome."""
    main = soup.find("main") or soup.body
    if not main:
        return ""
    paragraphs = [clean_text(p.get_text()) for p in main.find_all("p")]
    substantial = [p for p in paragraphs if len(p.split()) >= 5]
    text = " ".join(substantial) if substantial else clean_text(main.get_text())
    return text[:limit].strip()


def analyze_html_content(crawl_data: Dict[str, Any]) -> Dict[str, Any]:
    raw_html = crawl_data.get("html", "")
    url = crawl_data["url"]
    base_url = crawl_data["base_url"]
    domain = crawl_data["domain"]
    blocked_by_waf = bool(crawl_data.get("blocked_by_waf", False))
    block_status_code = crawl_data.get("block_status_code")
    block_reason = crawl_data.get("block_reason")

    # 5. Robots.txt & Crawlability (available even if main HTML was WAF-gated)
    robots_data = parse_robots_txt(crawl_data["robots_txt"]["content"]) if crawl_data["robots_txt"]["exists"] else parse_robots_txt("")
    sitemap_exists = crawl_data["sitemap_xml"]["exists"] or len(robots_data["sitemaps"]) > 0
    llms_exists = crawl_data["llms_txt"]["exists"]

    crawlability = {
        "robots_txt_exists": crawl_data["robots_txt"]["exists"],
        "robots_parsed": robots_data,
        "sitemap_exists": sitemap_exists,
        "sitemap_status_code": crawl_data["sitemap_xml"]["status_code"],
        "llms_txt_exists": llms_exists,
        "llms_status_code": crawl_data["llms_txt"]["status_code"],
    }

    if blocked_by_waf:
        dom = domain.lower()
        if dom.startswith("www."):
            dom = dom[4:]
        brand_name = dom.split(".")[0].capitalize() if dom else "Brand"
        return {
            "url": url,
            "base_url": base_url,
            "domain": domain,
            "brand_name": brand_name,
            "category": "",
            "blocked_by_waf": True,
            "block_status_code": block_status_code,
            "block_reason": block_reason,
            "navigation_links": [],
            "metadata": {
                "title": "",
                "title_length": 0,
                "meta_description": "",
                "description_length": 0,
            },
            "headings": {
                "h1_count": 0,
                "h1_list": [],
                "h2_count": 0,
                "h2_sample": [],
                "h3_count": 0,
            },
            "schema": {
                "count": 0,
                "types": [],
                "schemas": [],
                "descriptions": [],
            },
            "semantic_html": {
                "elements": {"header": 0, "nav": 0, "main": 0, "article": 0, "section": 0, "footer": 0},
                "word_count": 0,
                "body_excerpt": "",
            },
            "crawlability": crawlability,
        }

    soup = BeautifulSoup(raw_html, "html.parser")

    # 1. Metadata analysis
    title_tag = soup.find("title")
    title_text = clean_text(title_tag.string) if title_tag and title_tag.string else ""
    title_len = len(title_text)

    meta_desc_tag = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
    meta_desc_text = clean_text(meta_desc_tag.get("content")) if meta_desc_tag else ""
    meta_desc_len = len(meta_desc_text)

    brand_name = extract_brand_name(soup, domain)
    category = extract_category_and_industry(soup, brand_name, meta_desc_text)
    nav_links = extract_navigation_links(soup, base_url)

    # 2. Headings analysis
    h1_tags = [clean_text(h.get_text()) for h in soup.find_all("h1")]
    h2_tags = [clean_text(h.get_text()) for h in soup.find_all("h2")]
    h3_tags = [clean_text(h.get_text()) for h in soup.find_all("h3")]

    # 3. Schema.org / JSON-LD
    json_ld_scripts = soup.find_all("script", type="application/ld+json")
    detected_schemas: List[Dict[str, Any]] = []
    schema_types: List[str] = []
    schema_descriptions: List[str] = []

    for s in json_ld_scripts:
        try:
            content = s.string or ""
            data = json.loads(content)
            if isinstance(data, list):
                items = data
            elif isinstance(data, dict) and "@graph" in data:
                items = data["@graph"]
            elif isinstance(data, dict):
                items = [data]
            else:
                items = []

            for item in items:
                if isinstance(item, dict):
                    t = item.get("@type", "Unknown")
                    if isinstance(t, list):
                        schema_types.extend(t)
                    else:
                        schema_types.append(t)
                    desc = item.get("description")
                    if isinstance(desc, str) and desc.strip():
                        schema_descriptions.append(clean_text(desc)[:240])
                    detected_schemas.append(item)
        except Exception:
            continue

    # 4. Semantic HTML
    semantic_elements = {
        "header": len(soup.find_all("header")),
        "nav": len(soup.find_all("nav")),
        "main": len(soup.find_all("main")),
        "article": len(soup.find_all("article")),
        "section": len(soup.find_all("section")),
        "footer": len(soup.find_all("footer")),
    }
    body_text = clean_text(soup.body.get_text()) if soup.body else ""
    word_count = len(body_text.split())
    body_excerpt = _extract_body_excerpt(soup)

    return {
        "url": url,
        "base_url": base_url,
        "domain": domain,
        "brand_name": brand_name,
        "category": category,
        "blocked_by_waf": False,
        "block_status_code": None,
        "block_reason": None,
        "navigation_links": nav_links,
        "metadata": {
            "title": title_text,
            "title_length": title_len,
            "meta_description": meta_desc_text,
            "description_length": meta_desc_len,
        },
        "headings": {
            "h1_count": len(h1_tags),
            "h1_list": h1_tags,
            "h2_count": len(h2_tags),
            "h2_sample": h2_tags[:5],
            "h3_count": len(h3_tags),
        },
        "schema": {
            "count": len(detected_schemas),
            "types": list(set(schema_types)),
            "schemas": detected_schemas[:5],  # keep preview
            "descriptions": schema_descriptions[:3],
        },
        "semantic_html": {
            "elements": semantic_elements,
            "word_count": word_count,
            "body_excerpt": body_excerpt,
        },
        "crawlability": crawlability,
    }
