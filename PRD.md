# GEOAuditor — Product Requirements Document (PRD)

## 1. Summary

GEOAuditor is a free, one-shot **AI Brand Visibility Auditor**. A user submits a website URL, and the system tells them two things at once:

1. **Technical readiness** — is the site structured so AI crawlers (GPTBot, Google-Extended, PerplexityBot, etc.) can actually read and cite it?
2. **AI visibility** — when real buyer-style questions are asked to an AI engine (Gemini, as the reference implementation), does the brand actually show up, and how favorably?

These two signals are combined into a single **Composite GEO Score**, alongside a prioritized, actionable fix list — and critically, GEOAuditor doesn't stop at telling the user what's wrong. Where a fix is a well-defined file (a missing or misconfigured `robots.txt` or `llms.txt`), it **generates a correct, ready-to-download version** on the spot. This is what makes the tool solution-oriented rather than a report-only diagnostic.

## 2. Problem Statement

Search behavior is shifting from "10 blue links" to direct AI-generated answers (ChatGPT, Perplexity, Gemini, Copilot, Google AI Overviews). A brand can rank #1 on Google and still be **invisible** in AI answers if its site isn't machine-readable (missing schema, blocked bots, unclear structure) — and there's currently no simple, free way for a team to check both "can the AI read us" and "does the AI mention us" in one place.

## 3. Goals

- Let anyone audit a URL and get a clear, explainable GEO score in minutes, with no signup friction for the core audit.
- Tie technical fixes directly to AI-visibility outcomes, instead of reporting them as two disconnected dashboards.
- Don't just flag a missing/broken `robots.txt` or `llms.txt` — generate a correct one the user can download and drop straight into their site root.
- Make every score component transparent and reproducible — no black-box weighting.
- Ship an MVP that is fully functional end-to-end: submit URL → get real report. No mocked data anywhere in the shipped product.

## 4. Non-Goals (explicitly out of scope for this build)

- Scheduled/recurring monitoring (competitors like Profound, Peec AI, Otterly.ai do this — GEOAuditor is diagnostic, not a subscription tracker).
- Multi-brand side-by-side competitor benchmarking.
- Historical score tracking over time.
- Auto-generated code fixes/patches for the site's actual codebase (schema markup snippets, HTML restructuring, etc.) — out of scope for now. This is distinct from generating standalone `robots.txt` / `llms.txt` files, which **is** in scope (see §6 and §7a).
- User accounts, billing, teams/roles — unless the person explicitly asks for these later.

(These are future-roadmap items only. Nothing in this list should be scaffolded, stubbed, or half-built "for later" — build only what's in scope.)

## 5. Target Users

- Marketing/growth teams and founders who want a free first read on their AI visibility before paying for a monitoring SaaS.
- Students/developers evaluating GEO as a technical portfolio project.

## 6. Core Feature: The 7-Step Audit Workflow

1. **URL Input** — user enters a domain to audit.
2. **Crawl HTML** — system fetches the page's raw source.
3. **Tech & Content Extraction** — parses metadata, heading structure, and JSON-LD/schema.org data.
4. **Prompt Engine** — auto-generates realistic buyer-style questions for the brand's industry.
5. **AI Visibility Check** — runs those questions against the Gemini API to see if/how the brand appears.
6. **GEO Engine** — computes the dual-weighted composite score.
7. **Action Plan** — outputs a prioritized, categorized list of fixes, with ready-to-download `robots.txt` / `llms.txt` files generated inline wherever those are missing or misconfigured.

## 7. Scoring Model

```
Composite GEO Score = 0.40 × Technical Score + 0.60 × AI Visibility Score
```

AI Visibility is weighted higher because actual representation in AI answers is the end goal — technical readiness is a means to that end.

**Technical Score inputs:**
- Metadata & heading quality (title, description, H1–H6 structure fitting cleanly into an AI context window)
- JSON-LD / schema.org presence (Organization, Product, FAQPage, etc.)
- Crawlability (robots.txt and sitemap.xml don't block AI bots like GPTBot / Google-Extended)
- Semantic HTML (proper use of `<article>`, `<section>`, etc.)

**AI Visibility Score inputs — 4 query intents:**
- **Brand Discovery** — "Who is [Brand]?"
- **Category Search** — "What are the best tools in [Industry]?"
- **Comparative Analysis** — "[Brand] vs [Competitor]"
- **Market Alternatives** — "Top alternatives to [Market Leader]?"

**Issue severity categories:**
- 🔴 **Critical** — blocking AI bots, completely missing JSON-LD schema
- 🟡 **Warning** — weak heading structure, vague meta descriptions
- 🟢 **Opportunity** — strategic enhancements (e.g. adding FAQ schema)

## 7a. Solution Generation: `robots.txt` & `llms.txt`

This is the feature that turns the audit from a report into a fix.

**Trigger conditions (evaluated during the Crawlability check):**
- No `robots.txt` found at all → generate a full one from scratch.
- `robots.txt` exists but blocks known AI bots (GPTBot, Google-Extended, PerplexityBot, ClaudeBot, CCBot, etc.) → generate a corrected version that explicitly allows them, preserving any legitimate existing disallow rules for non-AI purposes rather than clobbering the whole file.
- No `llms.txt` found → generate one, using the real, extracted site content (title, meta description, actual page/section structure) — never placeholder text like "Company Name" or "Lorem ipsum."

**What "generate" means concretely:**
- Output is a real, syntactically valid file matching the actual spec (RFC 9309 for `robots.txt`; the llms.txt format per Howard, 2024 / llmstxt.org for `llms.txt`).
- `llms.txt` content is built from what was actually scraped — the audited site's real name, real description, real key pages/links — not a generic template with blanks.
- Presented in the report with a clear diff/explanation ("here's what was missing and why this fixes it"), plus a one-click **Download** button that saves the exact file, named correctly (`robots.txt`, `llms.txt`), ready to drop into the site's root directory.
- If the existing file is already correct, say so plainly instead of generating a redundant "fix" — don't manufacture work to look useful.

**Explicitly not in scope here:** editing the user's live site for them, pushing the file via FTP/API, or generating fixes for anything beyond these two well-defined, standardized files (schema markup, heading restructuring, etc. stay as reported *recommendations*, not auto-generated code — see §4 Non-Goals).

## 8. Tech Stack (reference implementation)

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (latest) + Tailwind CSS | Fast, modern dashboard UI |
| Backend | FastAPI (Python) | Async endpoints, doesn't block on long-running audits |
| Scraping | HTTPX + BeautifulSoup4 | Async fetch + reliable HTML parsing |
| AI evaluation | Google Gemini API | Real-world AI visibility signal |
| Database | SQLite | Lightweight, sufficient for job state + audit history at this scale |

## 9. Competitive Landscape

Existing players (Profound, Peec AI, Otterly.ai, Scrunch AI, Semrush AI Toolkit, Ahrefs Brand Radar, AthenaHQ) run scheduled buyer-question checks against ChatGPT/Perplexity/Gemini/Copilot/Google AI Overviews and report brand-mention frequency and competitor placement. They're subscription SaaS — Profound sits around enterprise pricing (~$499/mo), Peec AI starts near €89/mo, Otterly from $29/mo. A recurring criticism is that they measure well but under-deliver on **what to actually do about the gaps**.

**How GEOAuditor differs:**
1. **Diagnostic, not subscription monitoring** — free, one-shot audit vs. recurring paid tracking.
2. **Combines technical + AI-perception signals in one score** — most competitors only track the AI-mention side.
3. **Transparent and rule-based** — every check is visible and reproducible, not a black-box dashboard.
4. **Ships the fix, not just the finding** — generates a ready-to-download `robots.txt`/`llms.txt` on the spot instead of just telling the user they're missing one.

## 10. Success Criteria for the MVP

- A real URL, submitted end to end, produces a real Composite GEO Score backed by real scrape + real Gemini calls — no placeholder numbers anywhere.
- The report clearly separates "why the AI can't read you" from "why the AI doesn't mention you," and ties fixes to specific score components.
- The UI contains zero decorative-only elements — see `design.md` for the concrete "no AI slop" rules.
- Any generated `robots.txt`/`llms.txt` is syntactically valid, based on real extracted site content, and immediately usable if downloaded and dropped into the site root — not a template with placeholders.

## 11. References

- Aggarwal et al., *GEO: Generative Engine Optimization*, arXiv:2311.09735 / KDD '24 (DOI: 10.1145/3637528.3671900) — primary theoretical foundation; introduces "generative engines" and the GEO-bench visibility benchmark.
- Liu et al., *Evaluating Verifiability in Generative Search Engines*, arXiv:2304.09848 (2023) — background on how generative engines select/cite sources.
- Howard, J. (2024). *The /llms.txt file*. Answer.AI / llmstxt.org — motivates the robots.txt/llms.txt technical check.
- RFC 9309, *Robots Exclusion Protocol* (IETF, 2022) — formal standard behind the crawlability check.
