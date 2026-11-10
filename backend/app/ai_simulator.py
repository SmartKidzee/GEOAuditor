"""
AI visibility measurement engine.

Design principles (see README "Methodology"):

1. **Separate probes, not one batch call.** Every probe is its own LLM call, so one
   answer cannot contaminate another.
2. **Repeated trials.** The English organic-discovery probe runs several times with
   sampling enabled, so the report can say "mentioned in 2 of 3 runs" instead of a
   single yes/no.
3. **Unbranded discovery.** The organic probes ask a category question WITHOUT the
   brand name ("What are the best X?") and check whether the brand surfaces on its
   own. This is the real visibility test; a prompt that contains the brand name only
   proves the model can repeat it.
4. **Perception probe.** A branded probe asks the model what it believes the brand
   is, without being fed the site's own description. A judge then compares that
   description with facts taken from the site -> accurate / partial / hallucinated /
   unknown.
5. **Competitors come from the model's own answers** (structured JSON lists), not
   from a hardcoded catalogue.
6. **No fabricated data.** If a call fails, that probe is marked "unavailable" and is
   excluded from scoring. Nothing is ever synthesised to fill the gap.
"""

import asyncio
import json
import logging
import re
import time
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Protocol, Tuple
from urllib.parse import urlparse

from google import genai
from google.genai import types

from .ranking import rank_score
from .config import (
    get_call_timeout_seconds,
    get_gemini_api_key,
    get_gemini_base_url,
    get_gemini_model,
    get_indic_runs,
    get_probe_concurrency,
    get_probe_runs,
    get_probe_temperature,
)

logger = logging.getLogger("geoauditor.ai_simulator")

# Candidate models, tried in order after the configured GEMINI_MODEL.
CANDIDATE_MODELS = [
    "gemini-3.8-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite",
]

PERCEPTION_SCORES = {"accurate": 100.0, "partial": 60.0, "unknown": 15.0, "hallucinated": 5.0}

LANGUAGES = {
    "en": "English",
    "hi": "Hindi (हिन्दी)",
    "kn": "Kannada (ಕನ್ನಡ)",
}


def language_short(language: str) -> str:
    return LANGUAGES[language].split(" ")[0]


class AiQueryError(Exception):
    """Kept for backwards compatibility. The pipeline no longer fails on AI errors."""


class LLMUnavailableError(Exception):
    """Raised by an LLM client when a call cannot be completed."""


@dataclass
class LLMResult:
    text: str
    model: str


class LLMClient(Protocol):
    async def generate(
        self, prompt: str, *, json_mode: bool = False, temperature: float = 0.0
    ) -> LLMResult: ...


# --------------------------------------------------------------------------------------
# Gemini client (the only place that talks to the network)
# --------------------------------------------------------------------------------------


class GeminiClient:
    """
    Calls Gemini with a model fallback list, retry-with-backoff on rate limits, a per-call
    timeout, and a circuit breaker: unknown models and fatal auth errors are remembered for the
    rest of the audit, and a model that is still rate-limited after its retries is skipped for
    a cooldown so a quota outage fails fast instead of stalling every probe.
    """

    RETRY_DELAYS: Tuple[float, ...] = (2.0, 6.0)
    COOLDOWN_SECONDS: float = 60.0

    def __init__(self, api_key: str, models: Optional[List[str]] = None, base_url: Optional[str] = None):
        base_url = base_url if base_url is not None else get_gemini_base_url()
        http_options = types.HttpOptions(base_url=base_url) if base_url else None
        self._client = genai.Client(api_key=api_key, http_options=http_options)
        configured = get_gemini_model()
        self._models = models or ([configured] + [m for m in CANDIDATE_MODELS if m != configured])
        self._dead: set = set()
        self._cooldown: Dict[str, float] = {}
        self._fatal: Optional[str] = None
        self._last_error: str = "no Gemini model available"
        self.models_used: List[str] = []

    @staticmethod
    def _status_code(exc: Exception) -> Optional[int]:
        code = getattr(exc, "code", None)
        if isinstance(code, int):
            return code
        match = re.search(r"\b(4\d\d|5\d\d)\b", str(exc)[:200])
        return int(match.group(1)) if match else None

    def _usable(self, model: str) -> bool:
        if model in self._dead:
            return False
        return self._cooldown.get(model, 0.0) <= time.monotonic()

    async def _call_once(self, model: str, prompt: str, json_mode: bool, temperature: float) -> str:
        config = types.GenerateContentConfig(
            temperature=temperature,
            response_mime_type="application/json" if json_mode else None,
        )

        def _sync() -> str:
            response = self._client.models.generate_content(
                model=model, contents=prompt, config=config
            )
            return (response.text or "").strip()

        return await asyncio.wait_for(asyncio.to_thread(_sync), timeout=get_call_timeout_seconds())

    async def generate(
        self, prompt: str, *, json_mode: bool = False, temperature: float = 0.0
    ) -> LLMResult:
        if self._fatal:
            raise LLMUnavailableError(self._fatal)

        last_error = self._last_error
        first_model_of_call = True
        for model in self._models:
            if not self._usable(model):
                continue
            # Backoff retries are spent only on the first model tried in a call. Fallback models
            # get a single attempt, so a quota outage cannot multiply into dozens of requests.
            attempts = len(self.RETRY_DELAYS) + 1 if first_model_of_call else 1
            first_model_of_call = False
            for attempt in range(attempts):
                try:
                    text = await self._call_once(model, prompt, json_mode, temperature)
                    if not text:
                        last_error = f"{model}: empty response"
                        break  # try next model
                    if model not in self.models_used:
                        self.models_used.append(model)
                    return LLMResult(text=text, model=model)
                except asyncio.TimeoutError:
                    last_error = f"{model}: timed out"
                    break
                except Exception as exc:  # noqa: BLE001 - classified below
                    code = self._status_code(exc)
                    last_error = f"{model}: {str(exc)[:160]}"
                    if code in (401, 403):
                        self._fatal = f"Gemini authentication failed ({code}). Check GEMINI_API_KEY."
                        raise LLMUnavailableError(self._fatal) from exc
                    if code in (400, 404):
                        # Unknown / unsupported model name, or a rejected request.
                        self._dead.add(model)
                        break
                    if code == 429:
                        if attempt < attempts - 1:
                            await asyncio.sleep(self.RETRY_DELAYS[attempt])
                            continue
                        # Still rate-limited: skip this model for a while.
                        self._cooldown[model] = time.monotonic() + self.COOLDOWN_SECONDS
                        break
                    break  # 5xx, network error -> next model

        self._last_error = last_error
        raise LLMUnavailableError(last_error)


# --------------------------------------------------------------------------------------
# Parsing and matching helpers (pure functions, unit-tested)
# --------------------------------------------------------------------------------------


def parse_json_loose(text: str) -> Optional[Any]:
    """Parses JSON that may be wrapped in markdown fences or surrounded by prose."""
    if not text:
        return None
    cleaned = text.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except Exception:  # noqa: BLE001
        pass
    start, end = cleaned.find("{"), cleaned.rfind("}")
    if start != -1 and end > start:
        try:
            return json.loads(cleaned[start : end + 1])
        except Exception:  # noqa: BLE001
            return None
    return None


def normalize_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", (value or "").lower())


def spaced_words(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", (value or "").lower()).strip()


_SECOND_LEVEL = {"co", "com", "org", "net", "gov", "edu", "ac"}


def registrable_root(host_or_url: str) -> str:
    """'https://www.shop.razorpay.com/x' -> 'razorpay';  'foo.co.in' -> 'foo'."""
    value = (host_or_url or "").strip().lower()
    if not value:
        return ""
    if "://" not in value:
        value = "//" + value
    host = (urlparse(value).hostname or "").strip(".")
    if host.startswith("www."):
        host = host[4:]
    labels = [p for p in host.split(".") if p]
    if not labels:
        return ""
    if len(labels) >= 3 and labels[-2] in _SECOND_LEVEL and len(labels[-1]) == 2:
        return labels[-3]
    if len(labels) >= 2:
        return labels[-2]
    return labels[0]


_CORPORATE_SUFFIXES = {
    "inc", "llc", "ltd", "pvt", "limited", "corp", "corporation", "co", "company",
    "technologies", "technology", "software", "labs", "app", "io", "ai", "hq", "official", "the",
}


def core_name(value: str) -> str:
    """Normalised brand name with generic corporate words removed ('Notion Labs, Inc.' -> 'notion')."""
    words = [w for w in spaced_words(value).split() if w not in _CORPORATE_SUFFIXES]
    return "".join(words)


class BrandMatcher:
    """
    Decides whether an item in a model's list refers to the audited brand.

    Matching is deliberately strict: after dropping generic corporate words, the whole name must
    equal the brand (or the domain root). Substring matching would count "Renderforest" as
    "Render" or "Notional" as "Notion" and inflate visibility.
    """

    def __init__(self, brand_name: str, domain: str):
        self.brand_norm = normalize_name(brand_name)
        self.brand_core = core_name(brand_name)
        self.brand_words = spaced_words(brand_name)
        self.domain_root = registrable_root(domain)
        self.domain_root_norm = normalize_name(self.domain_root)

    def website_matches(self, website: Optional[str]) -> bool:
        if not website or str(website).strip().lower() in ("null", "none", "n/a", "unknown"):
            return False
        root = normalize_name(registrable_root(str(website)))
        return bool(root) and root == self.domain_root_norm

    def name_matches(self, name: str) -> bool:
        candidate = core_name(name)
        if not candidate:
            return False
        targets = {t for t in (self.brand_norm, self.brand_core, self.domain_root_norm) if t}
        return candidate in targets

    def matches(self, name: str, website: Optional[str]) -> bool:
        return self.website_matches(website) or self.name_matches(name)

    def text_mentions(self, text: str) -> bool:
        """Fallback for non-JSON answers: whole-word match on the raw text."""
        spaced = f" {spaced_words(text)} "
        candidates = {self.brand_words, self.domain_root}
        return any(len(c) >= 3 and f" {c} " in spaced for c in candidates if c)


def parse_recommendations(parsed: Any) -> List[Dict[str, Any]]:
    """Extracts [{'name','website','reason'}] in the order the model ranked them."""
    items: Any = []
    if isinstance(parsed, dict):
        items = parsed.get("recommendations") or parsed.get("results") or []
    elif isinstance(parsed, list):
        items = parsed
    out: List[Dict[str, Any]] = []
    for entry in items if isinstance(items, list) else []:
        if isinstance(entry, str):
            name, website, reason = entry.strip(), None, ""
        elif isinstance(entry, dict):
            name = str(entry.get("name") or entry.get("brand") or "").strip()
            website = entry.get("website") or entry.get("domain") or entry.get("url")
            reason = str(entry.get("reason") or "").strip()
        else:
            continue
        if name:
            out.append({"name": name, "website": str(website).strip() if website else None, "reason": reason})
    return out[:8]


def evaluate_organic_answer(
    *,
    probe_id: str,
    run_index: int,
    language: str,
    question: str,
    raw_text: str,
    model_used: str,
    matcher: BrandMatcher,
) -> Dict[str, Any]:
    """Turns one organic-discovery answer into a finding dict. Pure function."""
    parsed = parse_json_loose(raw_text)
    items = parse_recommendations(parsed)

    rank: Optional[int] = None
    matched: Optional[Dict[str, Any]] = None
    for idx, item in enumerate(items, start=1):
        if matcher.matches(item["name"], item["website"]):
            rank, matched = idx, item
            break

    parse_note = None
    if not items:
        # The model answered, but not in the requested structure: fall back to a text match.
        mentioned = matcher.text_mentions(raw_text)
        parse_note = "Answer was not structured JSON; brand detected by text match (no rank available)."
    else:
        mentioned = matched is not None

    cited_domain = bool(matched and matcher.website_matches(matched.get("website")))
    competitors = [i["name"] for i in items if not matcher.matches(i["name"], i["website"])]

    if mentioned:
        score = round(rank_score(rank) * 100, 1)
        if matched:
            evidence = f"#{rank} {matched['name']}" + (f": {matched['reason']}" if matched["reason"] else "")
        else:
            evidence = "Brand named in a free-text answer."
    else:
        score = 0.0
        listed = ", ".join(i["name"] for i in items[:5]) or "(no brands listed)"
        evidence = f"Brand was not in the model's list. It recommended: {listed}"

    return {
        "probe_id": probe_id,
        "probe_type": "organic_discovery",
        "branded": False,
        "run_index": run_index,
        "intent_name": f"Organic Discovery ({language_short(language)})",
        "query": question,
        "status": "ok",
        "error": parse_note,
        "model_used": model_used,
        "mentioned": mentioned,
        "rank": rank,
        "sentiment": "not_assessed",
        "position": "omitted" if not mentioned else ("primary" if rank and rank <= 3 else "listed"),
        "score": score,
        "evidence_excerpt": evidence,
        "raw_response": raw_text,
        "recommended": bool(rank and rank <= 3),
        "cited_brand_domain": cited_domain,
        "cited_competitors": competitors[:6],
        "language": language,
        "language_name": LANGUAGES[language],
    }


def unavailable_finding(
    *, probe_id: str, probe_type: str, branded: bool, run_index: int, intent_name: str,
    question: str, language: str, error: str,
) -> Dict[str, Any]:
    return {
        "probe_id": probe_id,
        "probe_type": probe_type,
        "branded": branded,
        "run_index": run_index,
        "intent_name": intent_name,
        "query": question,
        "status": "unavailable",
        "error": error,
        "model_used": "",
        "mentioned": False,
        "rank": None,
        "sentiment": "not_assessed",
        "position": "omitted",
        "score": 0.0,
        "evidence_excerpt": "AI check unavailable: no answer was received, so this probe is excluded from scoring.",
        "raw_response": "",
        "recommended": False,
        "cited_brand_domain": False,
        "cited_competitors": [],
        "language": language,
        "language_name": LANGUAGES[language],
    }


# --------------------------------------------------------------------------------------
# Prompts
# --------------------------------------------------------------------------------------

_JSON_LIST_FORMAT = (
    'Respond ONLY with JSON in exactly this shape: {"recommendations": [{"rank": 1, '
    '"name": "<official brand or company name in Latin script>", '
    '"website": "<official domain such as example.com, or null if unsure>", '
    '"reason": "<one short sentence>"}]}. List up to 5 options, best first.'
)


def organic_question(language: str, category: str) -> str:
    if language == "hi":
        return f"{category} के लिए सबसे अच्छे विकल्प कौन से हैं? आप कौन से विशिष्ट ब्रांड या कंपनियाँ सुझाएँगे?"
    if language == "kn":
        return f"{category} ಗಾಗಿ ಉತ್ತಮ ಆಯ್ಕೆಗಳು ಯಾವುವು? ನೀವು ಯಾವ ನಿರ್ದಿಷ್ಟ ಬ್ರ್ಯಾಂಡ್‌ಗಳು ಅಥವಾ ಕಂಪನಿಗಳನ್ನು ಶಿಫಾರಸು ಮಾಡುತ್ತೀರಿ?"
    return f"What are the best {category}? Which specific brands or companies would you recommend?"


def organic_prompt(language: str, category: str) -> str:
    question = organic_question(language, category)
    lang_rule = {
        "en": "",
        "hi": " Write the 'reason' field in Hindi, but keep 'name' and 'website' in Latin script.",
        "kn": " Write the 'reason' field in Kannada, but keep 'name' and 'website' in Latin script.",
    }[language]
    return (
        f'A person asks an AI assistant: "{question}"\n'
        f"Answer exactly as that assistant would, recommending real options you genuinely know of.{lang_rule}\n"
        f"{_JSON_LIST_FORMAT}"
    )


def perception_question(brand_name: str, domain: str) -> str:
    return f"What is {brand_name} ({domain})? What does it do, and who is it for?"


def perception_prompt(brand_name: str, domain: str) -> str:
    return (
        f'A person asks an AI assistant: "{perception_question(brand_name, domain)}"\n'
        "Answer honestly. If you do not actually recognise this brand, say so. Do NOT guess or invent details.\n"
        'Respond ONLY with JSON: {"known": true or false, "description": "<2-3 sentence description, '
        'empty if unknown>", "products_or_services": ["..."], "confidence": "high|medium|low"}'
    )


def judge_prompt(description: str, site_facts: Dict[str, Any]) -> str:
    return (
        "You are a strict fact-checker. Compare an AI model's description of a company with facts "
        "published on the company's OWN website.\n\n"
        f"WEBSITE FACTS:\n{json.dumps(site_facts, ensure_ascii=False, indent=2)}\n\n"
        f"MODEL DESCRIPTION:\n{description}\n\n"
        "Verdict rules:\n"
        '- "accurate": the core identity (what the company is and does) matches the website.\n'
        '- "partial": broadly right but vague, outdated, or missing key points.\n'
        '- "hallucinated": describes something materially different, or states specifics that '
        "contradict the website.\n"
        "Judge only against the website facts. Missing detail is not an error; contradiction is.\n"
        'Respond ONLY with JSON: {"verdict": "accurate|partial|hallucinated", '
        '"wrong_claims": ["..."], "missing_facts": ["..."], "explanation": "<one sentence>"}'
    )


def category_prompt(site_facts: Dict[str, Any]) -> str:
    return (
        "Based ONLY on the website text below, name the market category this business competes in, "
        "as a short generic phrase (3 to 7 words) that a buyer would type into a search engine, "
        'for example "online payment gateways for small businesses". '
        "Do NOT include the brand name.\n\n"
        f"{json.dumps(site_facts, ensure_ascii=False, indent=2)}\n\n"
        'Respond ONLY with JSON: {"category": "<phrase>"}'
    )


# --------------------------------------------------------------------------------------
# Perception judging
# --------------------------------------------------------------------------------------

_NO_KNOWLEDGE_PATTERNS = re.compile(
    r"(do not have|don't have|have no|there is no|there's no|no)\s+(any\s+|specific\s+|reliable\s+|verified\s+|"
    r"enough\s+|sufficient\s+|publicly available\s+|further\s+)*(information|record|records|data|details)|"
    r"not familiar|unfamiliar|i am not aware|i'm not aware|not aware of|"
    r"(unable|cannot|can't|couldn't|could not)\s+(to\s+)?(find|verify|identify|recognise|recognize)|"
    r"(do not|don't)\s+(recognise|recognize|know)",
    re.IGNORECASE,
)

_STOPWORDS = {
    "the", "and", "for", "with", "that", "this", "from", "your", "are", "you", "our", "has", "have",
    "was", "were", "their", "its", "into", "who", "what", "how", "all", "can", "will", "more",
    "also", "such", "than", "other", "about", "which", "they", "them", "been", "being", "any",
}


def _content_tokens(text: str) -> set:
    return {t for t in re.findall(r"[a-z0-9]{4,}", (text or "").lower()) if t not in _STOPWORDS}


def site_facts_text(site_facts: Dict[str, Any]) -> str:
    parts: List[str] = []
    for value in site_facts.values():
        if isinstance(value, list):
            parts.extend(str(v) for v in value)
        elif value:
            parts.append(str(value))
    return " ".join(parts)


def heuristic_perception(description: str, site_facts: Dict[str, Any]) -> Tuple[str, str]:
    """
    Conservative fallback used only when the judge LLM call fails. Token overlap cannot
    prove a hallucination, so low overlap yields 'partial' (never 'hallucinated').
    """
    desc_tokens = _content_tokens(description)
    fact_tokens = _content_tokens(site_facts_text(site_facts))
    if not desc_tokens or not fact_tokens:
        return "partial", "Not enough text to compare; heuristic comparison only."
    overlap = len(desc_tokens & fact_tokens) / len(desc_tokens)
    if overlap >= 0.25:
        return "accurate", f"Keyword overlap with the website is {overlap:.0%} (heuristic comparison)."
    return "partial", f"Keyword overlap with the website is only {overlap:.0%} (heuristic comparison)."


async def run_perception_probe(
    client: LLMClient, brand_name: str, domain: str, site_facts: Dict[str, Any]
) -> Tuple[Dict[str, Any], Dict[str, Any]]:
    """Returns (query_finding, perception_dict)."""
    question = perception_question(brand_name, domain)
    base_perception: Dict[str, Any] = {
        "verdict": "unavailable",
        "query": question,
        "model_known_brand": False,
        "model_description": "",
        "site_facts": site_facts,
        "wrong_claims": [],
        "missing_facts": [],
        "judged_by": "",
        "score": 0.0,
        "explanation": "",
    }

    try:
        result = await client.generate(perception_prompt(brand_name, domain), json_mode=True, temperature=0.0)
    except LLMUnavailableError as exc:
        finding = unavailable_finding(
            probe_id="perception#1", probe_type="brand_perception", branded=True, run_index=1,
            intent_name="Brand Perception", question=question, language="en", error=str(exc),
        )
        base_perception["explanation"] = "AI check unavailable; perception was not measured."
        return finding, base_perception

    parsed = parse_json_loose(result.text)
    if isinstance(parsed, dict):
        description = str(parsed.get("description") or "").strip()
        claimed_known = parsed.get("known")
        known = bool(claimed_known) if claimed_known is not None else bool(description)
    else:
        # The model answered in prose instead of JSON. That is still its real answer: use it as
        # the description rather than mistaking a formatting failure for "the model doesn't know".
        description = result.text.strip()[:600]
        known = True
    if not description:
        known = False
    elif len(description) < 220 and _NO_KNOWLEDGE_PATTERNS.search(description):
        known = False  # the model "described" the brand by saying it has no information

    wrong: List[str] = []
    missing: List[str] = []
    judged_by = "n/a"
    if not known:
        verdict, explanation = "unknown", "The model said it does not recognise this brand."
    elif not site_facts_text(site_facts).strip():
        # Nothing to compare against: report that honestly instead of asking a judge to guess.
        verdict = "partial"
        explanation = "The model knows the brand, but the site had no extractable text to verify its description against."
        judged_by = "none"
    else:
        try:
            judged = await client.generate(judge_prompt(description, site_facts), json_mode=True, temperature=0.0)
            jp = parse_json_loose(judged.text) or {}
            verdict = str(jp.get("verdict", "")).lower().strip()
            if verdict not in ("accurate", "partial", "hallucinated"):
                raise ValueError("unrecognised verdict")
            wrong = [str(x) for x in (jp.get("wrong_claims") or [])][:5]
            missing = [str(x) for x in (jp.get("missing_facts") or [])][:5]
            explanation = str(jp.get("explanation") or "").strip()
            judged_by = f"gemini ({judged.model})"
        except Exception:  # noqa: BLE001 - a judge failure must never fabricate a verdict
            verdict, explanation = heuristic_perception(description, site_facts)
            judged_by = "heuristic"

    perception = {
        **base_perception,
        "verdict": verdict,
        "model_known_brand": known,
        "model_description": description,
        "wrong_claims": wrong,
        "missing_facts": missing,
        "judged_by": judged_by,
        "score": PERCEPTION_SCORES[verdict],
        "explanation": explanation,
    }

    finding = {
        "probe_id": "perception#1",
        "probe_type": "brand_perception",
        "branded": True,
        "run_index": 1,
        "intent_name": "Brand Perception",
        "query": question,
        "status": "ok",
        "error": None,
        "model_used": result.model,
        "mentioned": known,
        "rank": None,
        "sentiment": "not_assessed",
        "position": "omitted",
        "score": PERCEPTION_SCORES[verdict],
        "evidence_excerpt": description or "The model did not describe the brand.",
        "raw_response": result.text,
        "recommended": False,
        "cited_brand_domain": False,
        "cited_competitors": [],
        "language": "en",
        "language_name": LANGUAGES["en"],
    }
    return finding, perception


# --------------------------------------------------------------------------------------
# Category inference (brand-free; reads the site, not the model's memory of the brand)
# --------------------------------------------------------------------------------------


def sanitize_category(category: str, brand_name: str) -> str:
    cleaned = re.sub(r"\s+", " ", (category or "")).strip().strip(".\"'")
    if brand_name:
        cleaned = re.sub(re.escape(brand_name), "", cleaned, flags=re.IGNORECASE).strip(" -,:")
    return cleaned[:80]


async def infer_category(client: LLMClient, site_facts: Dict[str, Any], brand_name: str) -> Optional[str]:
    try:
        result = await client.generate(category_prompt(site_facts), json_mode=True, temperature=0.0)
    except LLMUnavailableError:
        return None
    parsed = parse_json_loose(result.text) or {}
    category = sanitize_category(str(parsed.get("category") or ""), brand_name)
    return category if len(category) >= 6 else None


def build_site_facts(analyzed_content: Dict[str, Any]) -> Dict[str, Any]:
    """Facts taken from the site itself: used for category inference and perception judging."""
    metadata = analyzed_content.get("metadata", {}) or {}
    headings = analyzed_content.get("headings", {}) or {}
    nav = analyzed_content.get("navigation_links", []) or []
    return {
        "title": metadata.get("title", ""),
        "meta_description": metadata.get("meta_description", ""),
        "main_headings": (headings.get("h1_list") or [])[:3],
        "section_headings": (headings.get("h2_sample") or [])[:5],
        "navigation": [n.get("title", "") for n in nav[:8] if isinstance(n, dict)],
    }


# --------------------------------------------------------------------------------------
# Orchestration of all probes
# --------------------------------------------------------------------------------------


def _unavailable_result(reason: str, category: str, category_source: str) -> Dict[str, Any]:
    return {
        "available": False,
        "unavailable_reason": reason,
        "queries": [],
        "perception": None,
        "category_used": category,
        "category_source": category_source,
        "engine_used": "",
        "planned_probes": 0,
    }


async def run_ai_visibility_queries(
    brand_name: str,
    domain: str,
    category: str,
    meta_description: str = "",
    *,
    site_facts: Optional[Dict[str, Any]] = None,
    category_override: Optional[str] = None,
    client: Optional[LLMClient] = None,
) -> Dict[str, Any]:
    """
    Runs all probes and returns raw measurements (scored later by scoring.py).

    `meta_description` is accepted for backwards compatibility but is deliberately NOT sent
    to the model: the model must answer from its own knowledge, not from the site's copy.
    """
    site_facts = site_facts or {}

    if client is None:
        api_key = get_gemini_api_key()
        if not api_key or "your_gemini_api_key" in api_key:
            return _unavailable_result(
                "GEMINI_API_KEY is not configured, so AI visibility could not be measured.",
                category_override or category,
                "user" if category_override else "heuristic",
            )
        client = GeminiClient(api_key=api_key)

    # 1. Category used for the unbranded prompts
    category_source = "heuristic"
    category_used = category
    if category_override and category_override.strip():
        category_used, category_source = sanitize_category(category_override, brand_name), "user"
    else:
        inferred = await infer_category(client, site_facts, brand_name) if site_facts else None
        if inferred:
            category_used, category_source = inferred, "gemini"

    if not category_used.strip():
        category_used, category_source = "products and services", "heuristic"

    # 2. Plan probes: N English runs, plus Hindi and Kannada
    matcher = BrandMatcher(brand_name, domain)
    runs_en, runs_indic = get_probe_runs(), get_indic_runs()
    temperature = get_probe_temperature()
    planned: List[Tuple[str, int, str]] = []
    planned += [("en", i, f"organic_en#{i}") for i in range(1, runs_en + 1)]
    planned += [("hi", i, f"organic_hi#{i}") for i in range(1, runs_indic + 1)]
    planned += [("kn", i, f"organic_kn#{i}") for i in range(1, runs_indic + 1)]

    semaphore = asyncio.Semaphore(get_probe_concurrency())

    async def run_organic(language: str, run_index: int, probe_id: str) -> Dict[str, Any]:
        question = organic_question(language, category_used)
        async with semaphore:
            try:
                result = await client.generate(
                    organic_prompt(language, category_used), json_mode=True, temperature=temperature
                )
            except LLMUnavailableError as exc:
                return unavailable_finding(
                    probe_id=probe_id, probe_type="organic_discovery", branded=False, run_index=run_index,
                    intent_name=f"Organic Discovery ({language_short(language)})",
                    question=question, language=language, error=str(exc),
                )
        return evaluate_organic_answer(
            probe_id=probe_id, run_index=run_index, language=language, question=question,
            raw_text=result.text, model_used=result.model, matcher=matcher,
        )

    async def run_perception() -> Tuple[Dict[str, Any], Dict[str, Any]]:
        async with semaphore:
            return await run_perception_probe(client, brand_name, domain, site_facts)

    organic_results, (perception_finding, perception) = await asyncio.gather(
        asyncio.gather(*[run_organic(lang, idx, pid) for lang, idx, pid in planned]),
        run_perception(),
    )

    queries = list(organic_results) + [perception_finding]
    first_error = next((q["error"] for q in queries if q["status"] == "unavailable"), None)
    models_used = getattr(client, "models_used", None)

    return {
        "available": True,  # final availability is decided in scoring from the probe statuses
        "unavailable_reason": first_error,
        "queries": queries,
        "perception": perception,
        "category_used": category_used,
        "category_source": category_source,
        "engine_used": ", ".join(models_used) if models_used else "",
        "planned_probes": len(queries),
    }
