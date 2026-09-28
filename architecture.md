# GEOAuditor — Architecture

## 1. High-Level Components

```
┌─────────────────────┐        ┌──────────────────────┐
│  Client Dashboard    │──HTTP──▶│  API Orchestrator     │
│  Next.js + Tailwind  │◀───────│  FastAPI              │
└─────────────────────┘        └──────────┬───────────┘
                                            │ dispatches
                     ┌──────────────────────┼──────────────────────┐
                     ▼                      ▼                      ▼
            ┌────────────────┐   ┌────────────────────┐   ┌──────────────────────┐
            │ Web Scraper     │   │ Content Analyzer    │   │ AI Query Simulator    │
            │ HTTPX           │   │ BeautifulSoup4       │   │ Gemini API            │
            └───────┬────────┘   └──────────┬──────────┘   └──────────┬───────────┘
                     └──────────────────────┼──────────────────────┘
                                             ▼
                                   ┌────────────────────┐
                                   │  Scoring Engine     │
                                   └──────────┬─────────┘
                                              ▼
                                   ┌────────────────────┐
                                   │  SQLite Database    │
                                   │  jobs / audits       │
                                   └────────────────────┘
```

## 2. Component Responsibilities

- **Client Dashboard (Next.js + Tailwind)** — URL submission, progress polling UI, report rendering. Talks only to the API Orchestrator, never directly to Gemini or the scraper.
- **API Orchestrator (FastAPI)** — the only entry point. Receives audit requests, creates job records, coordinates the pipeline stages, exposes job-status and report endpoints.
- **Web Scraper** — fetches raw HTML via HTTPX (async), handles timeouts/redirects, stores raw HTML for downstream parsing.
- **Content Analyzer** — parses the fetched HTML with BeautifulSoup4: metadata, heading hierarchy, JSON-LD/schema.org blocks, robots.txt + sitemap.xml checks, semantic tag usage.
- **AI Query Simulator** — builds the 4 intent-category prompts (Brand Discovery, Category Search, Comparative Analysis, Market Alternatives) using extracted brand/industry context, sends them to the Gemini API, and stores the raw responses as evidence.
- **Scoring Engine** — pure function(s) over the Content Analyzer output + AI Query Simulator output → Technical Score, AI Visibility Score, Composite Score, and the categorized issue list. Keep this logic isolated and testable — it's the one place "the rules" live.
- **SQLite Database** — stores job records (`id`, `url`, `status`, `created_at`), raw scraped HTML, raw AI query responses, and final computed reports.

## 3. Async Job Model

Audits are slow (network fetch + multiple AI calls), so the API never blocks a request on the full pipeline:

1. `POST /api/audit` → validates URL, inserts a `jobs` row with `status = "pending"`, returns `{ job_id }` immediately.
2. A background task (FastAPI `BackgroundTasks`, or a simple worker loop — no need for a heavy queue system like Celery/Redis at this scale) runs the pipeline stages in order, updating `jobs.status` as it progresses (`crawling` → `extracting` → `querying_ai` → `scoring` → `completed` / `failed`).
3. `GET /api/audits/{job_id}` → returns current status (and the full report once `completed`).

## 4. API Surface (reference)

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/audit` | Start a new audit for a URL. Returns `{ job_id }`. |
| `GET` | `/api/audits/{job_id}` | Poll job status; returns full report when completed. |
| `GET` | `/api/audits/{job_id}/report` | Fetch a completed report directly (used by the shareable report URL). |

## 5. Data Model (reference)

**`jobs`**
- `id` (uuid, pk)
- `url` (text)
- `status` (enum: pending / crawling / extracting / querying_ai / scoring / completed / failed)
- `error_message` (text, nullable)
- `created_at`, `updated_at`

**`audit_results`**
- `job_id` (fk → jobs.id)
- `raw_html` (text)
- `technical_findings` (json — per-check pass/fail + detail)
- `ai_visibility_findings` (json — per-intent result + raw Gemini response evidence)
- `technical_score`, `ai_visibility_score`, `composite_score` (float)
- `issues` (json — list of `{ severity, title, detail, related_check }`)

## 6. Why This Shape

- Keeping the Scoring Engine as a pure function over stored findings (rather than baking scoring into the scraper or the AI-query step) makes the "how is this number calculated" transparent and testable — matches the product's "transparent and rule-based" positioning.
- SQLite is sufficient at this stage: single-writer job table, no concurrent-write contention expected for an MVP. Move to Postgres only if/when real concurrent load justifies it — don't pre-build for scale that doesn't exist yet.
- No queue infrastructure (Celery/Redis/etc.) for the MVP — FastAPI background tasks are enough for single-worker, one-audit-at-a-time-ish load. Revisit only if real usage demands it.
