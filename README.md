# GEOAuditor — AI Brand Visibility & Technical Readiness Auditor

A free, one-shot audit engine evaluating:
1. **Technical machine-readability** — robots.txt, schema.org JSON-LD, headings, semantic HTML, and /llms.txt.
2. **Real-world AI visibility** — 4 buyer intent queries run against Google Gemini.
3. **Composite GEO Score** — `0.40 × Technical + 0.60 × AI Visibility`.
4. **Actionable Solutions** — downloadable RFC 9309 `robots.txt` and Howard 2024 `llms.txt` generated from real site data.

---

## ⚡ Quick Start

### 1. Set your Gemini API Key
Add your Google Gemini API key to `backend/.env`:
```bash
GEMINI_API_KEY=AIzaSy...
```

### 2. Run Both Backend & Frontend (One Command)
```bash
./run.sh
```
This automatically starts:
- **Frontend Dashboard**: [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **API Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

## 🛠️ Running Manually in Separate Terminals

If you prefer running the backend and frontend in separate terminals:

### Terminal 1: Backend
```bash
cd backend
./venv/bin/uvicorn app.main:app --reload --port 8000
```

### Terminal 2: Frontend
```bash
cd frontend
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🧪 Running Automated Tests
```bash
cd backend
PYTHONPATH=. ./venv/bin/pytest tests/
```
All 10 tests verify the 40/60 scoring engine, robots.txt RFC 9309 parser, llms.txt generator, and API endpoints.
