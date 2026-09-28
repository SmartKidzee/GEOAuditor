import sqlite3
import json
from datetime import datetime
from typing import Optional, Dict, Any, List
from .config import DB_PATH
from .models import JobStatus


def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS jobs (
                id TEXT PRIMARY KEY,
                url TEXT NOT NULL,
                status TEXT NOT NULL,
                error_message TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS audit_results (
                job_id TEXT PRIMARY KEY,
                raw_html TEXT,
                technical_findings TEXT,
                ai_visibility_findings TEXT,
                technical_score REAL,
                ai_visibility_score REAL,
                composite_score REAL,
                issues TEXT,
                solutions TEXT,
                report_json TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (job_id) REFERENCES jobs (id)
            )
            """
        )
        conn.commit()


def create_job(job_id: str, url: str) -> Dict[str, Any]:
    now = datetime.utcnow().isoformat()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO jobs (id, url, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (job_id, url, JobStatus.PENDING.value, now, now),
        )
        conn.commit()
    return {"id": job_id, "url": url, "status": JobStatus.PENDING.value, "created_at": now}


def update_job_status(job_id: str, status: JobStatus, error_message: Optional[str] = None):
    now = datetime.utcnow().isoformat()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE jobs
            SET status = ?, error_message = ?, updated_at = ?
            WHERE id = ?
            """,
            (status.value, error_message, now, job_id),
        )
        conn.commit()


def get_job(job_id: str) -> Optional[Dict[str, Any]]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return dict(row)


def save_audit_result(
    job_id: str,
    raw_html: str,
    technical_findings: Dict[str, Any],
    ai_visibility_findings: Dict[str, Any],
    technical_score: float,
    ai_visibility_score: float,
    composite_score: float,
    issues: List[Dict[str, Any]],
    solutions: List[Dict[str, Any]],
    report_json: Dict[str, Any],
):
    now = datetime.utcnow().isoformat()
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT OR REPLACE INTO audit_results (
                job_id, raw_html, technical_findings, ai_visibility_findings,
                technical_score, ai_visibility_score, composite_score,
                issues, solutions, report_json, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                job_id,
                raw_html,
                json.dumps(technical_findings),
                json.dumps(ai_visibility_findings),
                technical_score,
                ai_visibility_score,
                composite_score,
                json.dumps(issues),
                json.dumps(solutions),
                json.dumps(report_json),
                now,
            ),
        )
        conn.commit()


def get_audit_result(job_id: str) -> Optional[Dict[str, Any]]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM audit_results WHERE job_id = ?", (job_id,))
        row = cursor.fetchone()
        if not row:
            return None
        data = dict(row)
        if data.get("report_json"):
            data["report"] = json.loads(data["report_json"])
        return data


def get_recent_jobs(limit: int = 10) -> List[Dict[str, Any]]:
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            """
            SELECT j.*, a.composite_score, a.technical_score, a.ai_visibility_score
            FROM jobs j
            LEFT JOIN audit_results a ON j.id = a.job_id
            ORDER BY j.created_at DESC
            LIMIT ?
            """,
            (limit,),
        )
        rows = cursor.fetchall()
        return [dict(r) for r in rows]
