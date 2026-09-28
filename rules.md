# GEOAuditor — Build Rules

These are practical guardrails for whoever (human or AI) is building this, not a rigid spec. Use judgment inside them.

## 1. General Approach

- Build only what's in `PRD.md`'s scope. Don't scaffold future-roadmap features (monitoring, multi-brand comparison, history tracking, auto-fix generation) "just in case" — they add complexity for nothing being used yet.
- Prefer the simplest implementation that actually works over a clever/optimized one. This is an MVP — correctness and clarity beat premature optimization.
- No mocked or hardcoded data anywhere in the shipped app. Every score, every finding, every AI-visibility result must come from a real scrape + a real Gemini call. If Gemini or the scraper fails, surface a real error — don't fall back to fake-but-plausible data.
- No decorative-only code — every animation, every displayed number, every link must map to something real. (See `design.md` §1 for the full "no AI slop" list — this is a build rule, not just a visual one.)

## 2. Code Style

- Keep it readable over clever. Straightforward, brute-force-friendly logic is fine, especially in the Scoring Engine — it's meant to be transparent and auditable, not the fastest possible implementation.
- Isolate the Scoring Engine as its own module/function set, independent of the scraping and AI-query code, so the scoring rules stay inspectable and testable on their own.
- Handle errors explicitly at each pipeline stage (scrape failure, parse failure, Gemini API failure) rather than letting one silent failure produce a misleading "completed" report.

## 3. Frontend Rules

- Next.js, latest stable version, with Tailwind CSS.
- Poll real job status for progress (see `flow.md`) — never simulate a progress bar with a timer disconnected from backend state.
- No components that render fake counts, fake testimonials, or non-functional links/buttons. If a feature isn't built yet, don't put its button in the UI.

## 4. Backend Rules

- FastAPI, async endpoints throughout (the scrape + AI calls are the slow parts — don't block the event loop on them).
- One clear job-status state machine (`pending → crawling → extracting → querying_ai → scoring → completed/failed`) — every stage transition should be visible to the frontend via polling.
- SQLite is fine for this scale. Don't introduce Postgres, Redis, or a task queue unless a real, demonstrated need shows up — not preemptively.
- Never expose the raw Gemini API key or scraping internals to the client; all external calls happen server-side.

## 5. Scoring Rules

- The 40/60 (Technical/AI Visibility) weighting from `PRD.md` is the default — it's a judgment call, not a hard law from a standards body, so it's fine to tune it if testing shows it needs adjusting. Just keep it a named, visible constant, not a buried magic number.
- Every issue surfaced in the Action Plan must trace back to a specific, real check — no generic "improve your SEO" filler advice.

## 6. What "Practical, Not Strict" Means Here

These rules exist to prevent obvious failure modes (fake data, scope creep, AI-slop UI, silent errors) — not to dictate exact function names, file layout, or micro-level style choices. Where a rule and a genuinely better practical solution conflict, use judgment and note why you deviated.
