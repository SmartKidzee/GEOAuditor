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


class AiVisibilityQueryFinding(BaseModel):
    intent_name: str  # "Brand Discovery", "Category Search", "Comparative Analysis", "Market Alternatives", "Indic Multilingual (Hindi)", "Indic Multilingual (Kannada)"
    query: str
    mentioned: bool
    sentiment: str  # "positive", "neutral", "negative", "not_mentioned"
    position: str  # "primary", "listed", "omitted"
    score: float
    evidence_excerpt: str
    raw_response: str
    recommended: bool = False
    cited_brand_domain: bool = False
    cited_competitors: List[str] = Field(default_factory=list)
    language: str = "en"
    language_name: str = "English"


class AiVisibilityFindings(BaseModel):
    score: float
    queries: List[AiVisibilityQueryFinding]
    mention_rate: float = 0.0
    recommendation_rate: float = 0.0
    brand_citation_rate: float = 0.0
    competitor_share_of_voice: Dict[str, float] = Field(default_factory=dict)
    multilingual_breakdown: List[Dict[str, Any]] = Field(default_factory=list)


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
    ai_visibility_score: float
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
