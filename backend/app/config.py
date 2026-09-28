import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent

def reload_env():
    load_dotenv(BASE_DIR / ".env", override=True)

# Initial load
reload_env()

def get_gemini_api_key() -> str:
    reload_env()
    return os.getenv("GEMINI_API_KEY", "").strip()

def get_gemini_model() -> str:
    reload_env()
    return os.getenv("GEMINI_MODEL", "gemini-3.8-flash").strip()

GEMINI_API_KEY = get_gemini_api_key()
GEMINI_MODEL = get_gemini_model()

# Database Configuration (SQLite)
DB_PATH = os.getenv("DATABASE_PATH", str(BASE_DIR / "geoauditor.db"))

# Scoring Weights (explicitly named constants as mandated by PRD.md and rules.md)
# Composite GEO Score = 0.40 * Technical Score + 0.60 * AI Visibility Score
WEIGHT_TECHNICAL: float = 0.40
WEIGHT_AI_VISIBILITY: float = 0.60

# HTTP Crawler Configuration
CRAWLER_TIMEOUT_SECONDS: float = 15.0
CRAWLER_USER_AGENT: str = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36 (compatible; GEOAuditor/1.0; +https://geoauditor.dev)"
)

# AI Bots tracked in robots.txt crawlability checks
AI_BOTS = [
    "GPTBot",
    "Google-Extended",
    "PerplexityBot",
    "ClaudeBot",
    "CCBot",
    "anthropic-ai",
    "cohere-ai",
    "Applebot-Extended",
    "Amazonbot",
]
