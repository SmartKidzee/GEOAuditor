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
  evidence: Record<string, any>;
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
}

export interface AiVisibilityQueryFinding {
  intent_name: string;
  query: string;
  mentioned: boolean;
  sentiment: "positive" | "neutral" | "negative" | "not_mentioned";
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
  benchmark_reference: string;
}

export interface AiVisibilityFindings {
  score: number;
  queries: AiVisibilityQueryFinding[];
  mention_rate?: number;
  recommendation_rate?: number;
  brand_citation_rate?: number;
  competitor_share_of_voice?: Record<string, number>;
  multilingual_breakdown?: MultilingualMarketItem[];
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
  ai_visibility_score: number;
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
