# Production Hosting & Deployment Guide: GEOAuditor

This guide provides step-by-step instructions to publicly host GEOAuditor with:
- **Frontend (Next.js 16 / React 19)** hosted publicly on **Vercel**
- **Backend (FastAPI / Python 3.10)** hosted on **Render** (free/standard tier) or **Railway** / **Fly.io**

---

## Architecture Overview

```
                      +-----------------------------+
                      |       USER'S BROWSER        |
                      +--------------+--------------+
                                     |
                                     v
       +-----------------------------------------------------------+
       |                  FRONTEND (Vercel)                        |
       |  - Next.js 16 + React 19                                  |
       |  - Public Domain: https://your-project.vercel.app         |
       |  - Environment Variable: NEXT_PUBLIC_API_URL              |
       +-----------------------------+-----------------------------+
                                     |  REST API / CORS
                                     v
       +-----------------------------------------------------------+
       |                  BACKEND (Render / Railway)               |
       |  - FastAPI (Python 3.10)                                  |
       |  - Public Domain: https://your-backend.onrender.com       |
       |  - SQLite Database: geoauditor.db                         |
       |  - Google Gemini API (gemini-3.6-flash)                   |
       |  - RFC 9309 Crawler & llmstxt.org Spec Engine            |
       +-----------------------------------------------------------+
```

---

## Step 1: Deploy Backend to Render (3 Minutes)

Render provides free web service hosting for Python FastAPI apps.

1. **Push your code to GitHub**:
   ```bash
   git add .
   git commit -m "feat: complete GEO auditor with Gemini llms.txt, Indic benchmark and white-label export"
   git push origin main
   ```

2. **Create New Web Service on Render**:
   - Go to [dashboard.render.com](https://dashboard.render.com/) and click **New +** -> **Web Service**.
   - Connect your GitHub repository.
   - Configure the following settings:
     - **Name**: `geoauditor-backend`
     - **Root Directory**: `backend`
     - **Environment**: `Python 3`
     - **Build Command**: `pip install -r requirements.txt`
     - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
     - **Instance Type**: Free (or Starter)

3. **Add Environment Variables in Render**:
   Under the **Environment** tab on Render, add:
   - `GEMINI_API_KEY`: *(Your Google Gemini API Key from Google AI Studio)*
   - `GEMINI_MODEL`: `gemini-3.6-flash`
   - `DATABASE_PATH`: `./geoauditor.db`

4. **Deploy**:
   - Click **Create Web Service**.
   - Render will build and deploy the backend.
   - Once deployed, copy your backend URL:
     `https://geoauditor-backend.onrender.com`
   - Test it by opening `https://geoauditor-backend.onrender.com/api/health` in your browser. You should see:
     ```json
     {"status": "healthy", "service": "GEOAuditor API", "gemini_configured": true}
     ```

---

## Step 2: Deploy Frontend to Vercel (2 Minutes)

1. **Go to Vercel**:
   - Navigate to [vercel.com](https://vercel.com/) and log in with your GitHub account.
   - Click **Add New...** -> **Project**.
   - Select your GitHub repository.

2. **Configure the Project in Vercel**:
   - **Framework Preset**: `Next.js`
   - **Root Directory**: Click **Edit** and select `frontend`.
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (default)
   - **Install Command**: `npm install`

3. **Add Environment Variables in Vercel**:
   Under the **Environment Variables** section, add:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://geoauditor-backend.onrender.com` *(use your actual backend URL from Step 1, without trailing slash)*

4. **Deploy**:
   - Click **Deploy**.
   - Vercel will build and assign you a live production URL, such as:
     `https://geoauditor.vercel.app`

---

## Step 3: Verify Your Live Deployment

1. Open your live Vercel URL: `https://your-project.vercel.app`.
2. Enter any domain (e.g. `github.com` or `stripe.com`) and click **Run Audit**.
3. Watch the real-time pipeline execute:
   - Reading site HTML, `/robots.txt`, `/sitemap.xml`, and `/llms.txt`.
   - Parsing schema, metadata, and semantic tags.
   - Executing buyer intent queries and Indic language queries against Gemini.
   - Synthesizing `/llms.txt` via Gemini according to the Howard 2024 spec.
   - Displaying the Composite Score, Technical Readiness, AI Model Prominence, and Prioritized Action Plan.
4. Click **White-Label Client Report**:
   - Customize Agency Name, Client Name, and Executive Notes.
   - Click **Export PDF / Print** to save a pristine client deliverable.

---

## Alternative: Railway Deployment (Backend)

If you prefer Railway instead of Render:
1. Go to [railway.app](https://railway.app/) and create a **New Project from GitHub Repo**.
2. Set **Root Directory** to `backend`.
3. Add environment variables:
   - `GEMINI_API_KEY`: *(your key)*
   - `GEMINI_MODEL`: `gemini-3.6-flash`
   - `PORT`: `8000`
4. In **Settings -> Networking**, click **Generate Domain** to get your public backend URL.
5. Provide that URL to Vercel as `NEXT_PUBLIC_API_URL`.

---

## Summary of Environment Variables

| Variable | Target | Purpose | Example |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | Vercel (Frontend) | Points the Next.js UI to your public FastAPI server | `https://geoauditor-backend.onrender.com` |
| `GEMINI_API_KEY` | Render/Railway (Backend) | Google AI Studio key for live search queries & /llms.txt generation | `AIzaSy...` |
| `GEMINI_MODEL` | Render/Railway (Backend) | Gemini model identifier | `gemini-3.6-flash` |
| `DATABASE_PATH` | Render/Railway (Backend) | Path to SQLite database file | `./geoauditor.db` |
