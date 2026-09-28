import logging
from datetime import datetime
from typing import Dict, Any
from .models import JobStatus, ReportData
from .database import update_job_status, save_audit_result
from .scraper import crawl_site, ScrapeError
from .analyzer import analyze_html_content
from .ai_simulator import run_ai_visibility_queries, AiQueryError
from .scoring import calculate_audit_score
from .generator import generate_solutions

logger = logging.getLogger("geoauditor.orchestrator")


async def run_audit_pipeline(job_id: str, target_url: str):
    """
    Executes the full 7-step audit pipeline:
    pending -> crawling -> extracting -> querying_ai -> scoring -> completed/failed
    """
    try:
        # Step 1: Crawling
        logger.info(f"[{job_id}] Stage 1: Crawling {target_url}")
        update_job_status(job_id, JobStatus.CRAWLING)
        crawl_data = await crawl_site(target_url)

        # Step 2: Content & Technical Signal Extraction
        logger.info(f"[{job_id}] Stage 2: Extracting technical content")
        update_job_status(job_id, JobStatus.EXTRACTING)
        analyzed_content = analyze_html_content(crawl_data)

        # Step 3: AI Query Simulator (Gemini API)
        logger.info(f"[{job_id}] Stage 3: Querying AI visibility")
        update_job_status(job_id, JobStatus.QUERYING_AI)
        ai_visibility_raw = await run_ai_visibility_queries(
            brand_name=analyzed_content["brand_name"],
            domain=analyzed_content["domain"],
            category=analyzed_content["category"],
            meta_description=analyzed_content["metadata"]["meta_description"],
        )

        # Step 4: Scoring Engine & Action Plan
        logger.info(f"[{job_id}] Stage 4: Scoring and Action Plan")
        update_job_status(job_id, JobStatus.SCORING)
        scoring_results = calculate_audit_score(analyzed_content, ai_visibility_raw)

        # Step 5: Solution Generation (robots.txt, llms.txt, llms-full.txt via Gemini)
        logger.info(f"[{job_id}] Stage 5: Solution Generation")
        solutions = await generate_solutions(analyzed_content)

        literature_framework = {
            "title": "A Market-Aware Multilingual Framework for Auditing and Improving Brand Visibility in Generative AI Search",
            "authors": "Dhanush Gowda S., Shreyas J., Shreedhar Shivappa Hegade, Ritun Jain",
            "institution": "Department of Computer Science and Engineering (AI & ML), The National Institute of Engineering, Mysuru",
            "core_pillars": [
                {"code": "GEO", "reference": "Aggarwal et al. (KDD 2024)", "description": "Generative Engine Optimization content strategies and visibility measurement"},
                {"code": "MULTILINGUAL_INDIC", "reference": "IndicGenBench / Indic QA / MILU (ACL/NAACL 2024-2025)", "description": "Multilingual evaluation across Indian languages (Hindi, Kannada, English)"},
                {"code": "SOURCE_ATTRIBUTION", "reference": "Attribution in RAG (ACL 2025)", "description": "Separating mentions, recommendations, and official domain citations"},
                {"code": "RFC_9309", "reference": "IETF RFC 9309 (2022)", "description": "Robots Exclusion Protocol compliance for AI crawlers"},
                {"code": "LLMS_TXT", "reference": "Howard (2024) llmstxt.org", "description": "Machine-readable context standard for LLM ingestion"},
            ],
        }

        # Compile full ReportData
        now_str = datetime.utcnow().isoformat()
        report = ReportData(
            job_id=job_id,
            url=crawl_data["url"],
            domain=crawl_data["domain"],
            brand_name=analyzed_content["brand_name"],
            composite_score=scoring_results["composite_score"],
            technical_score=scoring_results["technical_score"],
            ai_visibility_score=scoring_results["ai_visibility_score"],
            weight_technical=scoring_results["weight_technical"],
            weight_ai_visibility=scoring_results["weight_ai_visibility"],
            technical_findings=scoring_results["technical_findings"],
            ai_visibility_findings=scoring_results["ai_visibility_findings"],
            issues=scoring_results["issues"],
            solutions=solutions,
            created_at=now_str,
            completed_at=now_str,
            literature_framework=literature_framework,
        )

        # Save to SQLite database
        save_audit_result(
            job_id=job_id,
            raw_html=crawl_data["html"][:50000],  # store reasonable slice of raw HTML
            technical_findings=scoring_results["technical_findings"].model_dump(),
            ai_visibility_findings=scoring_results["ai_visibility_findings"].model_dump(),
            technical_score=scoring_results["technical_score"],
            ai_visibility_score=scoring_results["ai_visibility_score"],
            composite_score=scoring_results["composite_score"],
            issues=[i.model_dump() for i in scoring_results["issues"]],
            solutions=[s.model_dump() for s in solutions],
            report_json=report.model_dump(),
        )

        # Mark completed
        update_job_status(job_id, JobStatus.COMPLETED)
        logger.info(f"[{job_id}] Audit completed successfully. Composite Score: {report.composite_score}")

    except ScrapeError as se:
        logger.error(f"[{job_id}] Scrape failure: {str(se)}")
        update_job_status(job_id, JobStatus.FAILED, error_message=str(se))
    except AiQueryError as aqe:
        logger.error(f"[{job_id}] AI Query failure: {str(aqe)}")
        update_job_status(job_id, JobStatus.FAILED, error_message=str(aqe))
    except Exception as e:
        logger.exception(f"[{job_id}] Unexpected audit pipeline failure: {str(e)}")
        update_job_status(job_id, JobStatus.FAILED, error_message=f"Audit failed: {str(e)}")
