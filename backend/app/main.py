import uuid
import logging
from fastapi import FastAPI, BackgroundTasks, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from .models import (
    AuditCreateRequest,
    AuditCreateResponse,
    JobStatusResponse,
    JobStatus,
)
from .database import (
    init_db,
    create_job,
    get_job,
    get_audit_result,
    get_recent_jobs,
)
from .orchestrator import run_audit_pipeline
from .config import GEMINI_API_KEY
from .scraper import normalize_url, ScrapeError

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("geoauditor.api")

from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    logger.info("Database initialized successfully.")
    if not GEMINI_API_KEY:
        logger.warning(
            "WARNING: GEMINI_API_KEY is not set. Real AI queries will require setting GEMINI_API_KEY in backend/.env"
        )
    yield


app = FastAPI(
    title="GEOAuditor API",
    description="One-shot AI Brand Visibility and Technical Readiness Auditor API",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for local Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Also initialize immediately to ensure SQLite tables exist for any worker
init_db()


STAGE_LABELS = {
    JobStatus.PENDING.value: "Queued",
    JobStatus.CRAWLING.value: "Reading your site",
    JobStatus.EXTRACTING.value: "Checking technical signals",
    JobStatus.QUERYING_AI.value: "Asking AI engines about your brand",
    JobStatus.SCORING.value: "Calculating your GEO score",
    JobStatus.COMPLETED.value: "Audit Complete",
    JobStatus.FAILED.value: "Audit Failed",
}


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "GEOAuditor API",
        "gemini_configured": bool(GEMINI_API_KEY),
    }


@app.post("/api/audit", response_model=AuditCreateResponse, status_code=status.HTTP_201_CREATED)
async def start_audit(request: AuditCreateRequest, background_tasks: BackgroundTasks):
    raw_url = request.url.strip()
    if not raw_url:
        raise HTTPException(status_code=400, detail="Website URL cannot be empty.")

    try:
        normalized = normalize_url(raw_url)
    except ScrapeError as se:
        raise HTTPException(status_code=400, detail=str(se))

    job_id = str(uuid.uuid4())
    create_job(job_id=job_id, url=normalized)

    # Dispatch pipeline to background task
    background_tasks.add_task(run_audit_pipeline, job_id, normalized)

    return AuditCreateResponse(job_id=job_id, status=JobStatus.PENDING.value)


@app.get("/api/audits/{job_id}", response_model=JobStatusResponse)
async def get_audit_status(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Audit job '{job_id}' not found.")

    status_str = job["status"]
    stage_label = STAGE_LABELS.get(status_str, status_str.capitalize())

    report_data = None
    if status_str == JobStatus.COMPLETED.value:
        audit_res = get_audit_result(job_id)
        if audit_res and "report" in audit_res:
            report_data = audit_res["report"]

    return JobStatusResponse(
        id=job["id"],
        url=job["url"],
        status=JobStatus(status_str),
        error_message=job["error_message"],
        stage_label=stage_label,
        created_at=job["created_at"],
        updated_at=job["updated_at"],
        report=report_data,
    )


@app.get("/api/audits/{job_id}/report")
async def get_audit_report(job_id: str):
    job = get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Audit job '{job_id}' not found.")

    if job["status"] == JobStatus.FAILED.value:
        raise HTTPException(
            status_code=400,
            detail=f"Audit failed: {job.get('error_message', 'Unknown failure')}",
        )

    if job["status"] != JobStatus.COMPLETED.value:
        raise HTTPException(
            status_code=202,
            detail=f"Audit is still in progress (stage: {job['status']}).",
        )

    audit_res = get_audit_result(job_id)
    if not audit_res or "report" not in audit_res:
        raise HTTPException(status_code=404, detail="Audit report data missing.")

    return audit_res["report"]


@app.get("/api/audits")
async def list_recent_audits(limit: int = 10):
    """Returns recent real audits run on the platform."""
    return get_recent_jobs(limit=limit)


if __name__ == "__main__":
    import os
    import uvicorn

    raw_port = os.getenv("PORT", "8000")
    try:
        port = int(raw_port)
    except ValueError:
        port = 8000

    uvicorn.run("app.main:app", host="0.0.0.0", port=port)
