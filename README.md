# GEOAuditor: A Market-Aware Multilingual Framework for Auditing and Improving Brand Visibility in Generative AI Search

[![License: CC BY-NC-ND 4.0](https://img.shields.io/badge/License-CC%20BY--NC--ND%204.0%20(Strict)-red.svg)](LICENSE)
[![Python: 3.10+](https://img.shields.io/badge/Python-3.10%2B-informational.svg)](https://www.python.org/)
[![Framework: FastAPI](https://img.shields.io/badge/Backend-FastAPI-success.svg)](https://fastapi.tiangolo.com/)
[![Frontend: Next.js 16](https://img.shields.io/badge/Frontend-Next.js%2016-black.svg)](https://nextjs.org/)
[![Spec: RFC 9309](https://img.shields.io/badge/Spec-RFC%209309-orange.svg)](https://www.rfc-editor.org/rfc/rfc9309)
[![Spec: llmstxt.org](https://img.shields.io/badge/Spec-Howard%20(2024)-purple.svg)](https://llmstxt.org)

## Abstract

As conversational large language models (LLMs) and generative search engines (e.g., Google Search Generative Experience, OpenAI Search, Perplexity AI) increasingly mediate web information retrieval, traditional Search Engine Optimization (SEO) fails to guarantee digital visibility. Generative Engine Optimization (GEO) requires auditing both machine-readable technical accessibility and probabilistic brand presence in natural language answers.

**GEOAuditor** is a specialized empirical auditing framework and remediation engine. Designed according to research conducted at **The National Institute of Engineering (NIE), Mysuru**, this framework operationalizes GEO principles by combining automated technical signal validation, repeated, separate generative-model probes (unbranded category questions in English, Hindi and Kannada, plus a brand-perception fact-check), attribution metrics (organic Mention Rate, Top-3 Rate, Domain Citation Rate, and Competitor Share of Voice drawn from the models' own answers), and dynamic synthesis of RFC 9309 compliant `robots.txt` and Jeremy Howard (2024) `llmstxt.org` context files.

---

## Authors & Institutional Affiliation

* **Dhanush Gowda S.** &mdash; Department of Computer Science and Engineering (AI & ML), The National Institute of Engineering, Mysuru
* **Shreyas J.** &mdash; Department of Computer Science and Engineering (AI & ML), The National Institute of Engineering, Mysuru
* **Shreedhar Shivappa Hegade** &mdash; Department of Computer Science and Engineering (AI & ML), The National Institute of Engineering, Mysuru
* **Ritun Jain** &mdash; Department of Computer Science and Engineering (AI & ML), The National Institute of Engineering, Mysuru

---

## Theoretical Foundations & Literature Alignment

The architectural design of GEOAuditor directly integrates five core pillars from recent academic literature in information retrieval and natural language processing:

1. **Generative Engine Optimization (GEO)**: Operationalizes the findings of *Aggarwal et al. (KDD 2024)*, which demonstrated that structured entity citations, technical authority signals, and direct factual summaries improve source visibility in generative engine responses by up to 40%.
2. **Multilingual and Regional Evaluation (IndicGenBench / Indic QA)**: While existing GEO studies focus almost exclusively on English, regional search queries in non-Latin scripts suffer significant representation disparities. GEOAuditor implements multilingual testing across Hindi (Devanagari script) and Kannada (Dravidian language family) alongside English to measure linguistic bias in generative engine discovery.
3. **Fine-Grained Attribution & Share of Voice**: Drawing upon attribution modeling in retrieval-augmented generation (RAG) and industry standards established by platforms such as Otterly.ai, GEOAuditor disaggregates brand presence into three orthogonal metrics:
   * **Mention Rate ($M_r$)**: The percentage of evaluative queries where the target brand is present.
   * **Recommendation Rate ($R_r$)**: The percentage of queries where the generative model affirmatively recommends the brand as a top choice.
   * **Domain Citation Rate ($C_r$)**: The percentage of queries where the engine explicitly attributes authority to the brand's verified domain hostname.
   * **Competitor Share of Voice ($SoV$)**: The relative distribution of citations across competing entities identified in the generative responses.
4. **IETF RFC 9309 Compliance**: Evaluates robots exclusion directives against explicit AI crawler user agents (`GPTBot`, `ClaudeBot`, `Google-Extended`, `PerplexityBot`, `CCBot`, `Applebot-Extended`, `Amazonbot`), validating that legitimate discovery crawlers are not inadvertently disallowed.
5. **Jeremy Howard (2024) `/llms.txt` Standard**: Implements validation and real-time generative synthesis of machine-readable context files (`/llms.txt` and companion `/llms-full.txt`) conforming strictly to the specification hosted at `llmstxt.org`.

---

## Mathematical Formulation

GEOAuditor computes an empirical, deterministic composite score $S_{\text{composite}} \in [0, 100]$. If the AI probes cannot run (no API key, quota exhausted), $S_{\text{vis}}$ is reported as *not measured* and the composite equals $S_{\text{tech}}$ with the report saying so; no AI data is ever estimated:

$$S_{\text{composite}} = w_{\text{tech}} \cdot S_{\text{tech}} + w_{\text{vis}} \cdot S_{\text{vis}}$$

Where:
* $w_{\text{tech}} = 0.25$ (Technical Readiness Weight)
* $w_{\text{vis}} = 0.75$ (AI Visibility Weight)
* $w_{\text{tech}} + w_{\text{vis}} = 1.00$

### 1. Technical Readiness Score ($S_{\text{tech}} \in [0, 100]$)

$$S_{\text{tech}} = S_{\text{meta}} + S_{\text{schema}} + S_{\text{crawl}} + S_{\text{semantic}}$$

* **Metadata & Headings ($S_{\text{meta}} \in [0, 25]$)**: Page title presence, length bounds (30-65 chars), meta description presence and quality (100-165 chars), and strict single `<h1>` hierarchy.
* **Schema.org Structured Data ($S_{\text{schema}} \in [0, 25]$)**: Validation of JSON-LD entity structures (`Organization`, `WebSite`, `Product`, `SoftwareApplication`, `FAQPage`, `Article`).
* **Crawler & Spec Accessibility ($S_{\text{crawl}} \in [0, 25]$)**: RFC 9309 compliance, absence of broad AI bot disallows, XML sitemap discovery.
* **Semantic Architecture & Machine Context ($S_{\text{semantic}} \in [0, 25]$)**: Content-to-HTML density ratio, OpenGraph protocol compliance, and live `/llms.txt` verification.

### 2. AI Visibility Score ($S_{\text{vis}} \in [0, 100]$)

Every probe is a **separate Gemini call**. The model is never given the site's own description to answer from.

| Probe | Brand named in prompt? | Runs | What it measures |
|---|---|---|---|
| Organic discovery (English) | No | 3 (configurable, sampled) | Does the brand surface when asked "What are the best {category}?" |
| Organic discovery (Hindi, Kannada) | No | 1 each | Same question in each language |
| Brand perception | Yes | 1 (+1 judge call) | What does the model believe the brand is, compared with facts from the site: accurate / partial / hallucinated / unknown |
| Category inference | No | 1 | Derives the category phrase from the site text (or use the manual override) |

Each organic answer is a structured ranked list, so the brand's presence, rank, supplied domain, and the **competitors the model actually named** are read directly from it.

$$S_{\text{vis}} = \min\left(\text{cap}(v),\; \frac{\sum_{k} w_k \, c_k}{\sum_{k \text{ measured}} w_k} \cdot 100\right)$$

| Component $c_k$ | Weight $w_k$ | Definition |
|---|---|---|
| Organic discovery (EN) | 35 | mentions / successful English runs |
| Organic discovery (HI, KN) | 15 | mean of per-language mention rates |
| Rank prominence | 15 | mean rank score of runs where the brand appeared (rank 1 = 1.0, 2 = 0.85, 3 = 0.7, 4 = 0.55, 5 = 0.4) |
| Perception accuracy | 25 | accurate 1.0, partial 0.6, unknown 0.15, hallucinated 0.05 |
| Domain citation | 10 | share of English runs where the model supplied the brand's domain |

* **Knowledge gating:** $\text{cap}(v)$ is 45 when the model does not know the brand and 40 when it describes it wrongly, because a brand the model cannot describe is not "visible" even if a name match occurred.
* **No fabrication:** a probe whose call fails is marked *unavailable*, shown as such, and excluded; remaining weights are renormalised and the report states the coverage. If no English organic probe succeeds the AI score is not computed.
* **Limits:** Gemini is a proxy for generative engines in general; other engines may behave differently. Sampling makes results vary run to run, which is why the English probe is repeated.

---

## System Architecture

```text
                  +----------------------------------------------+
                  |           User / Browser Client              |
                  |  Next.js 16 (React, Tailwind CSS, Lucide)    |
                  +----------------------+-----------------------+
                                         | HTTP / JSON (REST)
                                         v
                  +----------------------------------------------+
                  |         FastAPI Orchestration Layer          |
                  |     (Uvicorn ASGI, SQLite Audit Storage)     |
                  +----------------------+-----------------------+
                                         |
         +-------------------------------+-------------------------------+
         |                               |                               |
         v                               v                               v
+------------------+           +-------------------+           +-------------------+
|  Async Crawler   |           | Technical Analyzer|           | AI Simulator      |
|  & Spec Prober   |           | & Schema Parser   |           | (Google Gemini)   |
|  - RFC 9309      |           | - JSON-LD Schema  |           | - Single-Shot     |
|  - robots.txt    |           | - Heading Tree    |           |   Batch Prompt    |
|  - sitemap.xml   |           | - OpenGraph Tags  |           | - English Queries |
|  - /llms.txt     |           | - Semantic HTML   |           | - Indic Queries   |
+--------+---------+           +---------+---------+           +---------+---------+
         |                               |                               |
         +-------------------------------+-------------------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |            Deterministic Scoring             |
                  |       25% Technical + 75% AI Visibility      |
                  +----------------------+-----------------------+
                                         |
                                         v
                  +----------------------------------------------+
                  |          Solution Synthesis Engine           |
                  |  - RFC 9309 robots.txt remediation           |
                  |  - Howard (2024) /llms.txt synthesis         |
                  |  - Deep RAG /llms-full.txt context           |
                  |  - White-Label Agency PDF Export             |
                  +----------------------------------------------+
```

---

## Repository Structure

```text
GEOAuditor/
|-- .github/
|   |-- workflows/
|   |   `-- ci.yml                   # Automated backend pytest & frontend Next.js CI
|   |-- ISSUE_TEMPLATE/
|   |   |-- bug_report.md            # Formal bug report template
|   |   `-- feature_request.md       # Research enhancement proposal template
|   `-- pull_request_template.md     # Pull request verification checklist
|-- backend/
|   |-- app/
|   |   |-- __init__.py
|   |   |-- ai_simulator.py          # Multi-probe AI visibility engine (repeated unbranded probes, perception check)
|   |   |-- ranking.py               # Rank-position scoring shared by probes and scoring
|   |   |-- analyzer.py              # Technical signal & Schema.org JSON-LD extractor
|   |   |-- config.py                # Scoring constants, AI bot list, environment config
|   |   |-- database.py              # SQLite storage with parameterized queries
|   |   |-- generator.py             # RFC 9309 robots.txt & Howard 2024 llms.txt generator
|   |   |-- main.py                  # FastAPI routing & CORS configuration
|   |   |-- models.py                # Pydantic v2 schemas and data transfer objects
|   |   |-- orchestrator.py          # Async pipeline workflow controller
|   |   |-- scoring.py               # Deterministic mathematical scoring engine
|   |   `-- scraper.py               # Async HTTP crawler & spec probe client
|   |-- tests/
|   |   |-- test_api_endpoints.py    # FastAPI endpoint unit & integration tests
|   |   `-- test_audit_engine.py     # Deterministic scoring & parser verification tests
|   |-- .env.example                 # Environment variables template (no secrets)
|   |-- .gitignore                   # Backend exclusion rules
|   |-- Dockerfile                   # Container build definition for production deployment
|   |-- Procfile                     # Process file for PaaS deployments (Render/Railway)
|   |-- pytest.ini                   # Python testing path configuration
|   `-- requirements.txt             # Python dependency manifest
|-- frontend/
|   |-- src/
|   |   |-- app/
|   |   |   |-- audit/[id]/page.tsx  # Production execution console & real-time telemetry
|   |   |   |-- report/[id]/page.tsx # Comprehensive scorecard, matrix, and action plan
|   |   |   |-- globals.css          # Styling tokens and print-to-PDF rules
|   |   |   |-- layout.tsx           # Global Next.js application layout
|   |   |   `-- page.tsx             # Audit submission interface
|   |   |-- components/
|   |   |   |-- ActionPlan.tsx       # Prioritized remediation tasks
|   |   |   |-- AiVisibilityPanel.tsx# Multilingual Indic matrix & Competitor SOV tabs
|   |   |   |-- Footer.tsx           # Institutional attribution footer
|   |   |   |-- Navbar.tsx           # Navigation header
|   |   |   |-- ScoreGauge.tsx       # Circular composite score visualization
|   |   |   |-- SolutionCard.tsx     # Spec-compliant /llms.txt copy & download panel
|   |   |   |-- SubScoreCard.tsx     # Technical vs. AI Visibility metric cards
|   |   |   |-- TechnicalSignals.tsx # Signal breakdown checklist
|   |   |   `-- WhiteLabelReportModal.tsx # Customizable agency export & print-to-PDF
|   |   `-- lib/
|   |       |-- api.ts               # Type-safe API client
|   |       `-- types.ts             # TypeScript interface definitions
|   |-- package.json                 # Node.js dependency manifest
|   |-- tsconfig.json                # TypeScript compiler configuration
|   `-- vercel.json                  # Vercel production hosting configuration
|-- .gitignore                       # Repository-wide git exclusion rules
|-- CODE_OF_CONDUCT.md               # Contributor Covenant Code of Conduct
|-- CONTRIBUTING.md                  # Development setup & PR submission guide
|-- HOSTING_GUIDE.md                 # Production deployment documentation (Vercel & Render)
|-- LICENSE                          # MIT License
|-- PRD.md                           # Product Requirements Document
|-- README.md                        # Academic research documentation
|-- SECURITY.md                      # Security vulnerability reporting policy
`-- run.sh                           # Single-command local execution script
```

---

## Installation & Local Execution

### Prerequisites

* Python 3.10 or higher
* Node.js 18 or higher (LTS recommended)
* A valid Google Gemini API Key ([Google AI Studio](https://aistudio.google.com/))

### 1. Clone the Repository

```bash
git clone https://github.com/SmartKidzee/GEOAuditor.git
cd GEOAuditor
```

### 2. Configure Environment Variables

Create your local backend environment configuration:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and supply your Gemini API key:

```ini
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-3.8-flash
DATABASE_PATH=./geoauditor.db
```

*Note: `backend/.env` is strictly excluded by `.gitignore` to prevent credential leakage.*

### 3. Launch Development Environment

Execute the provided launcher script:

```bash
chmod +x run.sh
./run.sh
```

This single command:
1. Provisions the Python virtual environment in `backend/venv` (if not present).
2. Installs required Python packages (`fastapi`, `uvicorn`, `google-genai`, `beautifulsoup4`, `httpx`).
3. Installs frontend dependencies via `npm install` (if not present).
4. Launches the FastAPI backend at `http://127.0.0.1:8000`.
5. Launches the Next.js frontend at `http://localhost:3000`.

To terminate both servers cleanly, press `Ctrl+C`.

---

## Manual Execution (Independent Terminals)

If you prefer to manage backend and frontend processes independently:

### Terminal 1: Backend Server

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

* Interactive Swagger Documentation: `http://127.0.0.1:8000/docs`
* Health Check Endpoint: `http://127.0.0.1:8000/api/health`

### Terminal 2: Frontend Server

```bash
cd frontend
npm run dev -- -p 3000
```

Access the user interface at `http://localhost:3000`.

---

## Verification & Automated Testing

The backend includes a comprehensive suite of unit and integration tests covering the probe engine (matching, parsing, repeated runs, perception judging, failure handling with no fabricated data), the scoring formula, spec generators, the full pipeline, and API endpoints. All tests use a scripted fake LLM, so they run offline:

```bash
cd backend
pytest tests/
```

Expected output:
```text
tests/test_ai_probes.py ............................                 [ 67%]
tests/test_api_endpoints.py ....                                         [ 76%]
tests/test_audit_engine.py ......                                        [ 90%]
tests/test_pipeline.py ....                                              [100%]

======================== 42 passed in 1.0s ==========================
```

To verify frontend TypeScript compilation and production bundle generation:

```bash
cd frontend
npm run build
```

---

## Production Deployment

Complete, step-by-step instructions for deploying GEOAuditor publicly are documented in [HOSTING_GUIDE.md](HOSTING_GUIDE.md):

* **Frontend**: Deployable as a serverless application on [Vercel](https://vercel.com/) with zero configuration using `frontend/vercel.json`.
* **Backend**: Deployable as an ASGI container service on [Render](https://render.com/) or [Railway](https://railway.app/) using `backend/Dockerfile` or `backend/Procfile`.

---

## Citation

If you use GEOAuditor or incorporate its multilingual framework into your academic research, please cite:

```bibtex
@misc{geoauditor2026,
  title={GEOAuditor: A Market-Aware Multilingual Framework for Auditing and Improving Brand Visibility in Generative AI Search},
  author={Shreyas, J. and Gowda S., Dhanush and Hegade, Shreedhar Shivappa and Jain, Ritun},
  year={2026},
  institution={The National Institute of Engineering (NIE), Mysuru},
  department={Department of Computer Science and Engineering (AI & ML)},
  howpublished={\url{https://github.com/SmartKidzee/GEOAuditor}}
}
```

---

## References

1. **Aggarwal, P., et al.** (2024). *GEO: Generative Engine Optimization*. In Proceedings of the 30th ACM SIGKDD Conference on Knowledge Discovery and Data Mining (KDD '24).
2. **Howard, J.** (2024). *The `/llms.txt` File: A Proposal to Provide Machine-Readable Context for Large Language Models*. Hosted at [llmstxt.org](https://llmstxt.org).
3. **Koster, M., & Illyes, G.** (2022). *Robots Exclusion Protocol*. IETF Request for Comments (RFC 9309). [RFC 9309](https://www.rfc-editor.org/rfc/rfc9309).
4. **Kakwani, D., et al.** (2020). *IndicNLPSuite: Monolingual Corpora and Evaluation Benchmarks for Indic Languages*. In Findings of the Association for Computational Linguistics (EMNLP 2020).
5. **Doddapaneni, S., et al.** (2023). *Towards Leaving No Indic Language Behind: Building Monolingual and Multilingual Models for 22 Indic Languages*. In ACL 2023.

---

## License & Legal Jurisdiction

This project is licensed under a **Strict Proprietary & Non-Commercial License (Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International with Statutory Enforcement)**.

* **Strict Prohibition on Copying & Derivative Works**: Unauthorized copying, modification, redistribution, reverse-engineering, or mirroring of this software, its scoring algorithms, or its architecture without prior explicit written permission is strictly prohibited.
* **No Commercial Exploitation**: Commercial use, monetized distribution, or integration into proprietary platforms is forbidden without an express commercial license granted in writing by the authors.
* **Statutory Legal Prosecution**: Any infringement or unauthorized reproduction will be prosecuted to the maximum extent permitted under **The Copyright Act, 1957 (India)**, the **Information Technology Act, 2000 (India)**, and applicable international copyright treaties.
* **Exclusive Legal Jurisdiction**: All disputes, claims, and actions are irrevocably subject to the exclusive jurisdiction of the competent courts in the **State of Karnataka, India** (including the Courts of Mysuru and Bengaluru, Karnataka).

For the full legal terms, refer to [LICENSE](LICENSE).
