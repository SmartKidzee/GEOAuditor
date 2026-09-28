import { JobStatusResponse, ReportData, RecentJobItem } from "./types";

function getApiBase(): string {
  let url = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (url) {
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }
    return url.replace(/\/+$/, "");
  }
  return typeof window !== "undefined"
    ? "http://localhost:8000"
    : "http://127.0.0.1:8000";
}

const API_BASE = getApiBase();

async function safeFetch(url: string, options?: RequestInit) {
  try {
    const res = await fetch(url, options);
    return res;
  } catch (err: any) {
    if (err?.name === "TypeError" || err?.message?.includes("fetch")) {
      throw new Error(
        `Cannot connect to GEOAuditor backend at ${API_BASE}. Please make sure the backend server is running on port 8000.`
      );
    }
    throw err;
  }
}

export async function createAudit(url: string): Promise<{ job_id: string; status: string }> {
  const res = await safeFetch(`${API_BASE}/api/audit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Failed to start audit.");
  }
  return data;
}

export async function getAuditStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await safeFetch(`${API_BASE}/api/audits/${jobId}`, {
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Failed to fetch audit status.");
  }
  return data;
}

export async function getAuditReport(jobId: string): Promise<ReportData> {
  const res = await safeFetch(`${API_BASE}/api/audits/${jobId}/report`, {
    cache: "no-store",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Failed to load audit report.");
  }
  return data;
}

export async function getRecentAudits(): Promise<RecentJobItem[]> {
  try {
    const res = await safeFetch(`${API_BASE}/api/audits?limit=5`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    // Graceful fallback if backend is offline on initial page load
    console.warn("Backend not reachable for recent audits history:", err);
    return [];
  }
}
