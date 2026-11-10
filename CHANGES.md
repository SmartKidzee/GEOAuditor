# Changes: from "website reviewer" to "AI brand visibility auditor"

The technical checks (robots.txt, schema, metadata, llms.txt, generators) are unchanged.
The **AI visibility measurement** was rebuilt, because it is what the project objectives require.

## What was wrong
- One batched Gemini call asked the model to *write* answers to all six scenarios, with the
  brand name, domain and meta description in the prompt (circular: the model repeats what it is given).
- When Gemini failed, a template answer praising the brand was generated and scored as real data.
- Sentiment / recommendation came from keyword lists; competitors from a hardcoded SaaS catalogue.
- Each scenario was a single yes/no, so there was no measure of consistency.

## What it does now
| Area | Change |
|---|---|
| Probes | Each probe is its own Gemini call (`ai_simulator.py`). |
| Organic discovery | Category question asked **without the brand name**; English repeated (default 3 runs, sampled), plus Hindi and Kannada. Result is a rate ("2 of 3 runs"), a rank, and whether the domain was given. |
| Brand perception | Model is asked what the brand is (no site text provided); a judge call compares the answer with facts from the site: accurate / partial / hallucinated / unknown. |
| Competitors | Taken from the models' own ranked lists; share of voice computed from them. |
| Failure handling | Failed probes are `unavailable`, shown as such and excluded. No fabricated fallback. If no English probe succeeds, the AI score is `null` and the composite is the technical score, stated explicitly. |
| Scoring | Visibility = weighted components (organic EN 35, organic Indic 15, rank 15, perception 25, domain citation 10), renormalised over measured components, with knowledge-gating caps (unknown 45, hallucinated 40). Composite weights 25% technical / 75% AI visibility. |
| Matching | Strict brand matching (no substring matches such as "Render" / "Renderforest"). |
| Category | Inferred from the site text by Gemini (brand-free); manual brand/category override on the home page. |
| Action plan | New issues: not recommended unprompted, inconsistent visibility, missing in Hindi/Kannada, AI misdescribes brand, competitors dominate, blocked bots vs low visibility. |
| UI | AI panel shows run-by-run results, perception verdict, per-language table, share of voice, and a score breakdown with methodology. Invented default percentages in the white-label report were removed. |
| Tests | 10 -> 42, all offline with a scripted fake LLM. Also verified on Python 3.10 (the CI version) and end to end against a local fake Gemini API plus a fake website, using the real SDK, crawler and HTTP stack. |

## New configuration (backend/.env, all optional)
`GEO_PROBE_RUNS`, `GEO_INDIC_RUNS`, `GEO_PROBE_CONCURRENCY`, `GEO_PROBE_TEMPERATURE`, `GEO_CALL_TIMEOUT_SECONDS`

## Known limits (state these in the report)
- Gemini is a proxy for generative engines; ChatGPT / Perplexity may differ.
- Sampling makes results vary between audits; more runs give a steadier rate but cost more API calls.
- Category inference can be wrong on unusual sites; use the override.
- Not changed: CORS includes `"*"`, the crawler disables TLS verification, there is no private-IP (SSRF) guard,
  and background jobs are in-process. Address these before a public deployment.

## Bugs found and fixed during final testing
1. **Quota outage multiplied requests.** With every Gemini call returning 429, one audit sent 105 requests
   (about 21 per model). Backoff retries now apply only to the first model tried in a call, rate-limited
   models are skipped for 60 s, and the real failure reason is remembered. The same scenario now sends 7
   requests and finishes in about 9 s.
2. **Formatting failure was read as "model does not know the brand".** A non-JSON perception answer produced
   the verdict `unknown` and capped the score. A prose answer is now used as the description; only an
   explicit "I don't know" (or an empty answer) counts as unknown.
3. **Ignorance detector missed common phrasing** ("I do not have *any* information"). Broadened and covered
   by tests, including phrases that must not match.
4. **Edge cases:** empty category now falls back to a generic phrase; a site with no extractable text is not
   sent to the judge (reported as unverifiable instead of guessed).
5. **Old saved audits** still load; the report shows a notice that they came from the earlier method.

## Also verified
- Invalid API key: 1 request, clear message, audit still completes with the technical score.
- Model name that does not exist: tried once, then skipped for the rest of the audit.
- JSON mode, sampling temperature and API key are sent; organic prompts never contain the brand.
- Hindi and Kannada prompts arrive intact (UTF-8) through the real SDK.
- Frontend: TypeScript clean and production build passes (compile + static generation).
