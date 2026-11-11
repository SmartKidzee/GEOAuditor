import asyncio
from urllib.parse import urlparse, urljoin
import httpx
from typing import Dict, Any, Optional
from .config import CRAWLER_TIMEOUT_SECONDS, CRAWLER_USER_AGENT


class ScrapeError(Exception):
    """Raised when website crawling or fetching fails."""
    pass


def normalize_url(url: str) -> str:
    url = url.strip()
    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url
    
    parsed = urlparse(url)
    if not parsed.netloc or "." not in parsed.netloc:
        raise ScrapeError(f"Invalid domain or URL format: '{url}'. Please provide a valid domain (e.g. example.com).")
    
    # Strip unnecessary fragments
    cleaned = parsed._replace(fragment="").geturl()
    return cleaned


def extract_base_url(url: str) -> str:
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"


async def fetch_endpoint(
    client: httpx.AsyncClient,
    url: str
) -> Dict[str, Any]:
    try:
        resp = await client.get(url, follow_redirects=True)
        if resp.status_code == 200:
            return {
                "exists": True,
                "status_code": resp.status_code,
                "content": resp.text,
            }
        return {
            "exists": False,
            "status_code": resp.status_code,
            "content": "",
        }
    except Exception as e:
        return {
            "exists": False,
            "status_code": 0,
            "content": "",
            "error": str(e),
        }


_BOT_CHALLENGE_MARKERS = (
    "just a moment",
    "verify you are human",
    "checking your browser",
    "cf-browser-verification",
    "cf_chl_opt",
    "turnstile",
    "attention required",
    "enable javascript and cookies",
    "g-recaptcha",
    "hcaptcha",
    "datadome",
    "px-captcha",
    "perimeterx",
    "bot verification",
    "access denied",
)


def _detect_bot_protection(status_code: int, headers: httpx.Headers, body: str) -> Optional[str]:
    """
    Detects human verification / CAPTCHA / anti-bot WAF gates without attempting to bypass them.
    Returns a short human-readable reason if blocked, or None otherwise.
    """
    cf_mitigated = (headers.get("cf-mitigated") or "").lower()
    server = (headers.get("server") or "").lower()
    lower_body = (body or "")[:12000].lower()

    if cf_mitigated == "challenge":
        return "Cloudflare human verification challenge"

    matched_marker = next((m for m in _BOT_CHALLENGE_MARKERS if m in lower_body), None)
    if matched_marker:
        vendor = "Cloudflare " if "cloudflare" in server or "cf-" in lower_body else ""
        return f"{vendor}human verification / anti-bot challenge ({matched_marker})"

    if status_code in (403, 429, 503):
        if "cloudflare" in server:
            return f"Cloudflare WAF / bot protection (HTTP {status_code})"
        return f"HTTP {status_code} access/bot restriction"

    return None


async def crawl_site(target_url: str) -> Dict[str, Any]:
    normalized_url = normalize_url(target_url)
    base_url = extract_base_url(normalized_url)
    domain = urlparse(normalized_url).netloc

    headers = {
        "User-Agent": CRAWLER_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Upgrade-Insecure-Requests": "1",
    }

    limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)
    timeout = httpx.Timeout(CRAWLER_TIMEOUT_SECONDS, connect=10.0)

    try:
        import h2  # noqa: F401
        use_http2 = True
    except ImportError:
        use_http2 = False

    async with httpx.AsyncClient(
        headers=headers, timeout=timeout, limits=limits, verify=False, http2=use_http2
    ) as client:
        try:
            main_resp = await client.get(normalized_url, follow_redirects=True)
        except httpx.ConnectTimeout:
            raise ScrapeError(f"Connection timed out while trying to reach {normalized_url}. Please verify the domain is reachable.")
        except httpx.ConnectError:
            raise ScrapeError(f"Could not connect to {normalized_url}. Check if the server is public, up, and DNS is valid.")
        except httpx.HTTPError as e:
            raise ScrapeError(f"HTTP error fetching {normalized_url}: {str(e)}")
        except Exception as e:
            raise ScrapeError(f"Unexpected error while fetching {normalized_url}: {str(e)}")

        block_reason = _detect_bot_protection(main_resp.status_code, main_resp.headers, main_resp.text)
        blocked_by_waf = block_reason is not None and (
            main_resp.status_code in (403, 429, 503) or "challenge" in block_reason or "captcha" in block_reason.lower()
        )

        if main_resp.status_code >= 400 and not blocked_by_waf:
            raise ScrapeError(f"Received HTTP status {main_resp.status_code} from {normalized_url}. Site returned an error.")

        final_url = str(main_resp.url)
        final_base = extract_base_url(final_url)
        html_content = "" if blocked_by_waf else main_resp.text

        # Concurrently fetch robots.txt, sitemap.xml, and llms.txt from the base URL
        robots_url = urljoin(final_base, "/robots.txt")
        sitemap_url = urljoin(final_base, "/sitemap.xml")
        llms_url = urljoin(final_base, "/llms.txt")

        robots_res, sitemap_res, llms_res = await asyncio.gather(
            fetch_endpoint(client, robots_url),
            fetch_endpoint(client, sitemap_url),
            fetch_endpoint(client, llms_url),
            return_exceptions=False,
        )

        return {
            "url": final_url,
            "base_url": final_base,
            "domain": domain,
            "status_code": main_resp.status_code,
            "blocked_by_waf": blocked_by_waf,
            "block_status_code": main_resp.status_code if blocked_by_waf else None,
            "block_reason": block_reason if blocked_by_waf else None,
            "html": html_content,
            "robots_txt": robots_res,
            "sitemap_xml": sitemap_res,
            "llms_txt": llms_res,
        }


async def preflight_check(target_url: str) -> Dict[str, Any]:
    """
    Fast pre-audit reachability & bot-protection check (no Gemini calls).
    Lets the UI warn the user and request pasted HTML before running the full pipeline.
    """
    normalized_url = normalize_url(target_url)
    domain = urlparse(normalized_url).netloc

    headers = {
        "User-Agent": CRAWLER_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Upgrade-Insecure-Requests": "1",
    }
    limits = httpx.Limits(max_keepalive_connections=2, max_connections=5)
    timeout = httpx.Timeout(10.0, connect=8.0)

    try:
        import h2  # noqa: F401
        use_http2 = True
    except ImportError:
        use_http2 = False

    async with httpx.AsyncClient(
        headers=headers, timeout=timeout, limits=limits, verify=False, http2=use_http2
    ) as client:
        try:
            resp = await client.get(normalized_url, follow_redirects=True)
        except httpx.ConnectTimeout:
            raise ScrapeError(f"Connection timed out while trying to reach {normalized_url}. Please verify the domain is reachable.")
        except httpx.ConnectError:
            raise ScrapeError(f"Could not connect to {normalized_url}. Check if the server is public, up, and DNS is valid.")
        except httpx.HTTPError as e:
            raise ScrapeError(f"HTTP error fetching {normalized_url}: {str(e)}")
        except Exception as e:
            raise ScrapeError(f"Unexpected error while fetching {normalized_url}: {str(e)}")

    block_reason = _detect_bot_protection(resp.status_code, resp.headers, resp.text)
    blocked_by_waf = block_reason is not None and (
        resp.status_code in (403, 429, 503) or "challenge" in block_reason or "captcha" in block_reason.lower()
    )

    if resp.status_code >= 400 and not blocked_by_waf:
        raise ScrapeError(f"Received HTTP status {resp.status_code} from {normalized_url}. Site returned an error.")

    final_url = str(resp.url)
    final_domain = urlparse(final_url).netloc or domain
    return {
        "url": final_url,
        "domain": final_domain,
        "reachable": not blocked_by_waf,
        "blocked_by_waf": blocked_by_waf,
        "status_code": resp.status_code,
        "block_reason": block_reason if blocked_by_waf else None,
    }


async def build_crawl_from_pasted_html(target_url: str, pasted_html: str) -> Dict[str, Any]:
    """
    Uses user-supplied HTML (e.g. after the user completed human verification in their own browser)
    while still checking public /robots.txt, /sitemap.xml, and /llms.txt endpoints.
    """
    normalized_url = normalize_url(target_url)
    base_url = extract_base_url(normalized_url)
    domain = urlparse(normalized_url).netloc

    headers = {
        "User-Agent": CRAWLER_USER_AGENT,
        "Accept": "text/plain,application/xml,text/html,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)
    timeout = httpx.Timeout(CRAWLER_TIMEOUT_SECONDS, connect=10.0)

    try:
        import h2  # noqa: F401
        use_http2 = True
    except ImportError:
        use_http2 = False

    async with httpx.AsyncClient(
        headers=headers, timeout=timeout, limits=limits, verify=False, http2=use_http2
    ) as client:
        robots_res, sitemap_res, llms_res = await asyncio.gather(
            fetch_endpoint(client, urljoin(base_url, "/robots.txt")),
            fetch_endpoint(client, urljoin(base_url, "/sitemap.xml")),
            fetch_endpoint(client, urljoin(base_url, "/llms.txt")),
            return_exceptions=False,
        )

    return {
        "url": normalized_url,
        "base_url": base_url,
        "domain": domain,
        "status_code": 200,
        "blocked_by_waf": False,
        "block_status_code": None,
        "block_reason": None,
        "html": pasted_html,
        "robots_txt": robots_res,
        "sitemap_xml": sitemap_res,
        "llms_txt": llms_res,
    }
