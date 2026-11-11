from typing import List, Optional, Dict, Any
from pydantic import BaseModel, HttpUrl, Field
from enum import Enum


class JobStatus(str, Enum):
    PENDING = "pending"
    CRAWLING = "crawling"
    EXTRACTING = "extracting"
    QUERYING_AI = "querying_ai"
    SCORING = "scoring"
    COMPLETED = "completed"
    FAILED = "failed"


class Severity(str, Enum):
    CRITICAL = "critical"
    WARNING = "warning"
    OPPORTUNITY = "opportunity"


class CheckStatus(str, Enum):
    PASS = "pass"
    WARN = "warn"
    FAIL = "fail"


class ActionPlanItem(BaseModel):
    severity: Severity
    title: str
    detail: str
    related_check: str
    recommendation: str


class TechnicalSignalCheck(BaseModel):
    name: str
    status: CheckStatus
    score: float
    max_score: float
    details: str
    evidence: Dict[str, Any] = Field(default_factory=dict)


class TechnicalFindings(BaseModel):
    score: float
    metadata_headings: TechnicalSignalCheck
    json_ld_schema: TechnicalSignalCheck
    crawlability_bots: TechnicalSignalCheck
    semantic_html: TechnicalSignalCheck
    extracted_brand: str = ""
    extracted_category: str = ""
    summary: str = ""
    crawl_blocked: bool = False
    crawl_block_reason: Optional[str] = None


class AiVisibilityQueryFinding(BaseModel):
    """One executed probe (one real LLM call) and what was measured from its answer."""

    probe_id: str = ""  # unique id, e.g. "organic_en#2"
    probe_type: str = "organic_discovery"  # "organic_discovery" | "brand_perception"
    branded: bool = False  # True when the brand name was given to the model in the prompt
    run_index: int = 1
    intent_name: str = ""  # e.g. "Organic Discovery (English)", "Brand Perception"
    query: str = ""
    status: str = "ok"  # "ok" | "unavailable" (LLM call failed; excluded from scoring)
    error: Optional[str] = None
    model_used: str = ""
    mentioned: bool = False
    rank: Optional[int] = None  # position in the model's ranked list (1 = first)
    sentiment: str = "not_mentioned"  # "positive" | "neutral" | "negative" | "not_mentioned"
    position: str = "omitted"  # "primary" (rank<=3) | "listed" | "omitted"
    score: float = 0.0
    evidence_excerpt: str = ""
    raw_response: str = ""
    recommended: bool = False  # ranked in the model's top 3
    cited_brand_domain: bool = False  # the model attached the brand's official domain
    cited_competitors: List[str] = Field(default_factory=list)
    language: str = "en"
    language_name: str = "English"


class PerceptionFinding(BaseModel):
    """What the model believes the brand is, compared against facts taken from the site."""

    verdict: str = "unavailable"  # "accurate" | "partial" | "hallucinated" | "unknown" | "unavailable"
    query: str = ""
    model_known_brand: bool = False
    model_description: str = ""
    site_facts: Dict[str, Any] = Field(default_factory=dict)
    wrong_claims: List[str] = Field(default_factory=list)
    missing_facts: List[str] = Field(default_factory=list)
    judged_by: str = ""  # "gemini" | "heuristic"
    score: float = 0.0  # 0-100, used as a score component
    explanation: str = ""


class AiVisibilityFindings(BaseModel):
    score: Optional[float] = None  # None when the AI probes could not run
    available: bool = True
    unavailable_reason: Optional[str] = None
    coverage: float = 1.0  # fraction of planned probes that returned a usable answer
    queries: List[AiVisibilityQueryFinding] = Field(default_factory=list)
    mention_rate: float = 0.0  # % of English organic runs in which the brand surfaced unprompted
    recommendation_rate: float = 0.0  # % of English organic runs where it ranked in the top 3
    brand_citation_rate: float = 0.0  # % of English organic runs where its domain was given
    organic_runs: int = 0  # successful English organic runs
    organic_mentions: int = 0  # ...of which the brand appeared
    competitor_share_of_voice: Dict[str, float] = Field(default_factory=dict)
    multilingual_breakdown: List[Dict[str, Any]] = Field(default_factory=list)
    perception: Optional[PerceptionFinding] = None
    score_components: Dict[str, Any] = Field(default_factory=dict)
    category_used: str = ""
    category_source: str = ""  # "user" | "gemini" | "heuristic"
    engine_used: str = ""
    notes: List[str] = Field(default_factory=list)
    methodology: str = ""


class GeneratedSolution(BaseModel):
    file_name: str  # "robots.txt", "llms.txt", "llms-full.txt"
    status: str  # "generated", "corrected", "already_valid"
    title: str
    explanation: str
    diff_or_content: str
    downloadable_content: str
    generated_by: Optional[str] = "Gemini AI"
    spec_compliance: Optional[str] = "llmstxt.org / Howard (2024)"


class ReportData(BaseModel):
    job_id: str
    url: str
    domain: str
    brand_name: str
    composite_score: float
    technical_score: float
    ai_visibility_score: Optional[float] = None
    ai_visibility_available: bool = True
    score_note: Optional[str] = None
    weight_technical: float
    weight_ai_visibility: float
    technical_findings: TechnicalFindings
    ai_visibility_findings: AiVisibilityFindings
    issues: List[ActionPlanItem]
    solutions: List[GeneratedSolution]
    created_at: str
    completed_at: Optional[str] = None
    literature_framework: Optional[Dict[str, Any]] = None


class AuditCreateRequest(BaseModel):
    url: str
    # Optional overrides. The brand name and category are normally inferred from the site;
    # if that inference is wrong, the category in particular decides what the unbranded
    # discovery prompts ask, so the user can correct it.
    brand_name: Optional[str] = None
    category: Optional[str] = None
    # Optional HTML source supplied directly by the user when a site enforces human verification.
    pasted_html: Optional[str] = None


class BrandResolveRequest(BaseModel):
    query: str


class BrandCandidate(BaseModel):
    brand_name: str
    domain: str
    url: str
    description: str = ""


class BrandResolveResponse(BaseModel):
    query: str
    is_direct_url: bool = False
    candidates: List[BrandCandidate] = Field(default_factory=list)


class PreflightRequest(BaseModel):
    url: str


class PreflightResponse(BaseModel):
    url: str
    domain: str
    reachable: bool = True
    blocked_by_waf: bool = False
    status_code: int = 200
    block_reason: Optional[str] = None


class AuditCreateResponse(BaseModel):
    job_id: str
    status: str = JobStatus.PENDING


class JobStatusResponse(BaseModel):
    id: str
    url: str
    status: JobStatus
    error_message: Optional[str] = None
    stage_label: str
    created_at: str
    updated_at: str
    report: Optional[ReportData] = None
