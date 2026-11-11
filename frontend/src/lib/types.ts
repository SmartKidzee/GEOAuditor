export type JobStatus =
  | "pending"
  | "crawling"
  | "extracting"
  | "querying_ai"
  | "scoring"
  | "completed"
  | "failed";

export type Severity = "critical" | "warning" | "opportunity";
export type CheckStatus = "pass" | "warn" | "fail";

export interface ActionPlanItem {
  severity: Severity;
  title: string;
  detail: string;
  related_check: string;
  recommendation: string;
}

export interface TechnicalSignalCheck {
  name: string;
  status: CheckStatus;
  score: number;
  max_score: number;
  details: string;
  evidence: Record<string, unknown>;
}

export interface TechnicalFindings {
  score: number;
  metadata_headings: TechnicalSignalCheck;
  json_ld_schema: TechnicalSignalCheck;
  crawlability_bots: TechnicalSignalCheck;
  semantic_html: TechnicalSignalCheck;
  extracted_brand: string;
  extracted_category: string;
  summary: string;
  crawl_blocked?: boolean;
  crawl_block_reason?: string | null;
}

export interface AiVisibilityQueryFinding {
  probe_id?: string;
  probe_type?: "organic_discovery" | "brand_perception" | "brand_comparison" | "brand_reputation";
  branded?: boolean;
  run_index?: number;
  intent_name: string;
  query: string;
  status?: "ok" | "unavailable";
  error?: string | null;
  model_used?: string;
  mentioned: boolean;
  rank?: number | null;
  sentiment: "positive" | "neutral" | "negative" | "not_mentioned" | "not_assessed";
  position: "primary" | "listed" | "omitted";
  score: number;
  evidence_excerpt: string;
  raw_response: string;
  recommended?: boolean;
  cited_brand_domain?: boolean;
  cited_competitors?: string[];
  language?: string;
  language_name?: string;
}

export interface MultilingualMarketItem {
  market: string;
  language: string;
  average_score: number;
  queries_evaluated: number;
  mentions?: number;
  mention_rate?: number;
  status?: "measured" | "unavailable";
  benchmark_reference: string;
}

export type PerceptionVerdict = "accurate" | "partial" | "hallucinated" | "unknown" | "unavailable";

export interface PerceptionFinding {
  verdict: PerceptionVerdict;
  query: string;
  model_known_brand: boolean;
  model_description: string;
  site_facts: Record<string, unknown>;
  wrong_claims: string[];
  missing_facts: string[];
  judged_by: string;
  score: number;
  explanation: string;
}

export interface ScoreComponent {
  value: number | null;
  weight: number;
  points: number;
}

export interface AiVisibilityFindings {
  score: number | null;
  available?: boolean;
  unavailable_reason?: string | null;
  coverage?: number;
  queries: AiVisibilityQueryFinding[];
  mention_rate?: number;
  recommendation_rate?: number;
  brand_citation_rate?: number;
  organic_runs?: number;
  organic_mentions?: number;
  competitor_share_of_voice?: Record<string, number>;
  multilingual_breakdown?: MultilingualMarketItem[];
  perception?: PerceptionFinding | null;
  score_components?: Record<string, ScoreComponent>;
  category_used?: string;
  category_source?: "user" | "gemini" | "heuristic" | "";
  engine_used?: string;
  notes?: string[];
  methodology?: string;
}

export interface GeneratedSolution {
  file_name: string;
  status: "generated" | "corrected" | "already_valid";
  title: string;
  explanation: string;
  diff_or_content: string;
  downloadable_content: string;
  generated_by?: string;
  spec_compliance?: string;
}

export interface LiteratureFramework {
  title: string;
  authors: string;
  institution: string;
  core_pillars: Array<{
    code: string;
    reference: string;
    description: string;
  }>;
}

export interface ReportData {
  job_id: string;
  url: string;
  domain: string;
  brand_name: string;
  composite_score: number;
  technical_score: number;
  ai_visibility_score: number | null;
  ai_visibility_available?: boolean;
  score_note?: string | null;
  weight_technical: number;
  weight_ai_visibility: number;
  technical_findings: TechnicalFindings;
  ai_visibility_findings: AiVisibilityFindings;
  issues: ActionPlanItem[];
  solutions: GeneratedSolution[];
  created_at: string;
  completed_at?: string;
  literature_framework?: LiteratureFramework;
}

export interface BrandCandidate {
  brand_name: string;
  domain: string;
  url: string;
  description: string;
}

export interface BrandResolveResponse {
  query: string;
  is_direct_url: boolean;
  candidates: BrandCandidate[];
}

export interface PreflightResponse {
  url: string;
  domain: string;
  reachable: boolean;
  blocked_by_waf: boolean;
  status_code: number;
  block_reason?: string | null;
}

export interface JobStatusResponse {
  id: string;
  url: string;
  status: JobStatus;
  error_message: string | null;
  stage_label: string;
  created_at: string;
  updated_at: string;
  report: ReportData | null;
}

export interface RecentJobItem {
  id: string;
  url: string;
  status: JobStatus;
  composite_score?: number | null;
  technical_score?: number | null;
  ai_visibility_score?: number | null;
  created_at: string;
}
