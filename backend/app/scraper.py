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


async def crawl_site(target_url: str) -> Dict[str, Any]:
    normalized_url = normalize_url(target_url)
    base_url = extract_base_url(normalized_url)
    domain = urlparse(normalized_url).netloc

    headers = {
        "User-Agent": CRAWLER_USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)
    timeout = httpx.Timeout(CRAWLER_TIMEOUT_SECONDS, connect=10.0)

    async with httpx.AsyncClient(headers=headers, timeout=timeout, limits=limits, verify=False) as client:
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

        if main_resp.status_code >= 400:
            raise ScrapeError(f"Received HTTP status {main_resp.status_code} from {normalized_url}. Site returned an error.")

        final_url = str(main_resp.url)
        final_base = extract_base_url(final_url)
        html_content = main_resp.text

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
            "html": html_content,
            "robots_txt": robots_res,
            "sitemap_xml": sitemap_res,
            "llms_txt": llms_res,
        }
