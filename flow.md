# GEOAuditor — User Flow

## 1. Entry

- User lands on the homepage. Hero section states plainly what the tool does ("Find out if AI engines can see your brand") with a single URL input + "Run Audit" button.
- No login wall. No fake social-proof counters. If there's zero real audit history to show, don't show a number at all.

## 2. Submitting an Audit

1. User types a domain (e.g. `example.com`) and hits **Run Audit**.
2. Client-side: basic validation (valid URL/domain format) before it ever hits the API.
3. Frontend sends `POST /api/audit { url }`.
4. Backend creates a job row in SQLite with status `pending`, returns `{ job_id }` immediately.
5. Frontend redirects (or transitions in-place) to a **progress view** for that `job_id`.

## 3. Progress / Waiting State

- Frontend polls `GET /audits/{job_id}` every few seconds.
- Progress view reflects real backend state, not a fake animated progress bar disconnected from reality. Show the actual stage the job is in:
  - `pending` → "Queued"
  - `crawling` → "Reading your site"
  - `extracting` → "Checking technical signals"
  - `querying_ai` → "Asking AI engines about your brand"
  - `scoring` → "Calculating your GEO score"
  - `completed` → redirect to report
  - `failed` → show a real, specific error (e.g. "Couldn't fetch this URL — check it's public and reachable"), with a retry option
- If a stage takes unusually long, say so honestly rather than looping a generic spinner indefinitely.

## 4. Report View

Once `status === "completed"`, the frontend fetches the full report and renders:

1. **Header** — Composite GEO Score (large, single number, 0–100), audited URL, timestamp.
2. **Score Breakdown** — Technical Score and AI Visibility Score shown side by side with their 40/60 weighting made explicit (not hidden math).
3. **Technical Signals panel** — pass/fail/warn per check (metadata, headings, JSON-LD/schema, robots.txt/sitemap, semantic HTML), each linking to the specific fix.
4. **AI Visibility panel** — the 4 query intents (Brand Discovery, Category Search, Comparative Analysis, Market Alternatives), each showing whether/how the brand appeared, using the actual Gemini response evidence — not a synthetic "yes/no."
5. **Action Plan** — issues grouped by severity (🔴 Critical / 🟡 Warning / 🟢 Opportunity), each with a concrete, specific fix tied to the exact signal that triggered it.

## 5. Re-Audit / Sharing

- User can re-run the audit on the same URL (new job, new report — no silent overwrite of history).
- Report has a shareable/permalink URL (`/report/{job_id}`) that reloads the same completed data without re-running the audit.

## 6. Error Paths

- Invalid/unreachable URL → clear inline error before a job is even created.
- Gemini API failure mid-job → job marked `failed` with the real cause surfaced, not silently returned as a passing score.
- Rate limiting (if applicable) → explicit message, not a spinner that hangs forever.
