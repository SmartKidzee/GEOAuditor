import { JobStatusResponse, ReportData, RecentJobItem, BrandResolveResponse, PreflightResponse } from "./types";

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
  } catch (err: unknown) {
    const errName = err instanceof Error ? err.name : "";
    const errMsg = err instanceof Error ? err.message : "";
    if (errName === "TypeError" || errMsg.includes("fetch")) {
      throw new Error(
        `Cannot connect to GEOAuditor backend at ${API_BASE}. Please make sure the backend server is running on port 8000.`
      );
    }
    throw err;
  }
}

export interface AuditOverrides {
  brand_name?: string;
  category?: string;
  pasted_html?: string;
}

export async function resolveBrand(query: string): Promise<BrandResolveResponse> {
  const res = await safeFetch(`${API_BASE}/api/resolve-brand`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Failed to look up brand website.");
  }
  return data;
}

export async function preflightCheck(url: string): Promise<PreflightResponse> {
  const res = await safeFetch(`${API_BASE}/api/preflight`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Failed to reach website.");
  }
  return data;
}

export async function createAudit(
  url: string,
  overrides: AuditOverrides = {}
): Promise<{ job_id: string; status: string }> {
  const body: Record<string, string> = { url };
  if (overrides.brand_name?.trim()) body.brand_name = overrides.brand_name.trim();
  if (overrides.category?.trim()) body.category = overrides.category.trim();
  if (overrides.pasted_html?.trim()) body.pasted_html = overrides.pasted_html.trim();

  const res = await safeFetch(`${API_BASE}/api/audit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
