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

def get_gemini_base_url() -> str:
    """Optional override (proxy / gateway / local test server). Empty = Google's default endpoint."""
    reload_env()
    return os.getenv("GEMINI_BASE_URL", "").strip()


GEMINI_API_KEY = get_gemini_api_key()
GEMINI_MODEL = get_gemini_model()

# Database Configuration (SQLite)
DB_PATH = os.getenv("DATABASE_PATH", str(BASE_DIR / "geoauditor.db"))

# Scoring Weights (explicitly named constants as mandated by PRD.md and rules.md)
# Composite GEO Score = 0.25 * Technical Score + 0.75 * AI Visibility Score
# AI visibility is the headline measurement; technical readiness is the diagnostic
# that explains *why* visibility is high or low.
# If the AI probes could not run, the composite falls back to the technical score
# alone (weights 1.0 / 0.0) and the report says so explicitly. No AI data is invented.
WEIGHT_TECHNICAL: float = 0.25
WEIGHT_AI_VISIBILITY: float = 0.75

# AI Visibility Score component weights (sum to 100). See scoring.compute_ai_visibility_score.
AI_VIS_WEIGHTS = {
    "organic_discovery_en": 35.0,   # brand surfaces unprompted in English category answers
    "organic_discovery_indic": 15.0,  # same, in Hindi / Kannada
    "rank_prominence": 15.0,        # how high it is ranked when it does surface
    "perception_accuracy": 25.0,    # does the model describe the brand correctly?
    "domain_citation": 10.0,        # does the model attach the brand's official domain?
}

# Knowledge gating: a brand the model cannot describe (or describes wrongly) cannot be
# called "visible", even if a name-match happened to occur. Caps the AI visibility score.
PERCEPTION_SCORE_CAPS = {
    "unknown": 45.0,
    "hallucinated": 40.0,
}


def _env_int(name: str, default: int, lo: int, hi: int) -> int:
    reload_env()
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError:
        value = default
    return max(lo, min(hi, value))


def _env_float(name: str, default: float, lo: float, hi: float) -> float:
    reload_env()
    try:
        value = float(os.getenv(name, str(default)))
    except ValueError:
        value = default
    return max(lo, min(hi, value))


# AI probe configuration (each probe is its own LLM call, repeated to measure consistency)
def get_probe_runs() -> int:
    """Repeated runs of the English organic-discovery probe (default 3)."""
    return _env_int("GEO_PROBE_RUNS", 3, 1, 8)


def get_indic_runs() -> int:
    """Runs per Indic language (Hindi, Kannada) organic-discovery probe (default 1)."""
    return _env_int("GEO_INDIC_RUNS", 1, 1, 4)


def get_probe_concurrency() -> int:
    return _env_int("GEO_PROBE_CONCURRENCY", 2, 1, 6)


def get_probe_temperature() -> float:
    """Sampling temperature for organic probes. >0 so repeated runs measure real variability."""
    return _env_float("GEO_PROBE_TEMPERATURE", 0.8, 0.0, 1.5)


def get_call_timeout_seconds() -> float:
    return _env_float("GEO_CALL_TIMEOUT_SECONDS", 45.0, 5.0, 180.0)

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
