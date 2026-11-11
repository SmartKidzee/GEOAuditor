"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createAudit, getRecentAudits, preflightCheck, resolveBrand } from "../lib/api";
import { BrandCandidate, PreflightResponse, RecentJobItem } from "../lib/types";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { ArrowRight, Globe, Shield, Sparkles, AlertCircle, Check, ExternalLink, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [brandOverride, setBrandOverride] = useState("");
  const [categoryOverride, setCategoryOverride] = useState("");
  const [pastedHtml, setPastedHtml] = useState("");
  const [brandCandidates, setBrandCandidates] = useState<BrandCandidate[] | null>(null);
  const [resolvedQuery, setResolvedQuery] = useState("");
  const [preflightBlock, setPreflightBlock] = useState<{
    preflight: PreflightResponse;
    targetUrl: string;
    detectedBrand?: string;
  } | null>(null);
  const [recentAudits, setRecentAudits] = useState<RecentJobItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    getRecentAudits().then(setRecentAudits);
  }, []);

  const startAuditDirectly = async (targetUrl: string, detectedBrand?: string, htmlOverride?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await createAudit(targetUrl, {
        brand_name: brandOverride || detectedBrand,
        category: categoryOverride,
        pasted_html: htmlOverride ?? pastedHtml,
      });
      router.push(`/audit/${res.job_id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start audit. Please check your URL.");
      setLoading(false);
    }
  };

  const launchAudit = async (targetUrl: string, detectedBrand?: string) => {
    setLoading(true);
    setError(null);
    setPreflightBlock(null);
    try {
      // If user already supplied HTML manually, skip preflight and start immediately.
      if (pastedHtml.trim()) {
        await startAuditDirectly(targetUrl, detectedBrand, pastedHtml.trim());
        return;
      }

      // Fast preflight check (no Gemini calls) before burning time or AI quota.
      const pf = await preflightCheck(targetUrl);
      if (pf.blocked_by_waf) {
        setBrandCandidates(null);
        setPreflightBlock({ preflight: pf, targetUrl: pf.url, detectedBrand });
        setLoading(false);
        return;
      }

      await startAuditDirectly(pf.url, detectedBrand);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start audit. Please check your URL.");
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBrandCandidates(null);
    setPreflightBlock(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a brand name, domain, or URL to audit.");
      return;
    }

    // If user entered a direct domain/URL (contains a dot and no spaces), run directly.
    const looksLikeDomain = trimmed.includes(".") && !trimmed.includes(" ") && trimmed.length >= 4;
    if (looksLikeDomain) {
      await launchAudit(trimmed);
      return;
    }

    // Otherwise treat input as a brand name and ask AI to suggest the official site for confirmation.
    setLoading(true);
    try {
      const resolved = await resolveBrand(trimmed);
      if (resolved.is_direct_url && resolved.candidates.length > 0) {
        await launchAudit(resolved.candidates[0].url, resolved.candidates[0].brand_name);
        return;
      }
      setResolvedQuery(trimmed);
      setBrandCandidates(resolved.candidates);
      if (resolved.candidates.length === 0) {
        setError(`Could not automatically locate an official website for "${trimmed}". Please enter the full domain (e.g. example.com).`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resolve brand name. Please enter the website domain.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 sm:py-20">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
            <Sparkles className="w-3.5 h-3.5 text-zinc-500" />
            Free, One-Shot AI Brand Visibility Auditor
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 max-w-2xl mx-auto leading-tight">
            Find out if AI engines can see your brand.
          </h1>

          <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
            GEOAuditor audits both sides at once: technical machine-readability (robots.txt, schema, context fit) and whether AI recommends your brand unprompted, measured with repeated Gemini probes in English, Hindi and Kannada.
          </p>
        </div>

        {/* Audit Submission Box */}
        <div className="mt-8 sm:mt-10 max-w-2xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-zinc-900 p-2 sm:p-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1 flex items-center">
              <Globe className="w-4 h-4 text-zinc-400 absolute left-3.5" />
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError(null);
                  if (brandCandidates) setBrandCandidates(null);
                  if (preflightBlock) setPreflightBlock(null);
                }}
                placeholder="Enter domain, URL, or brand name (e.g. example.com or Acme)"
                className="w-full pl-10 pr-3 py-2.5 bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition disabled:opacity-50 cursor-pointer shadow-xs"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>Starting...</span>
                </>
              ) : (
                <>
                  <span>Run Audit</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-2.5 text-center">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 underline underline-offset-2 cursor-pointer"
            >
              {showAdvanced ? "Hide options" : "Brand or category detected wrongly? Set them manually"}
            </button>
          </div>

          {showAdvanced && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800">
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Brand name (optional)
                <input
                  type="text"
                  value={brandOverride}
                  onChange={(e) => setBrandOverride(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. Acme Corp"
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm font-normal text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none"
                  disabled={loading}
                />
              </label>
              <label className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Market category (optional)
                <input
                  type="text"
                  value={categoryOverride}
                  onChange={(e) => setCategoryOverride(e.target.value)}
                  maxLength={80}
                  placeholder="e.g. online payment gateways for businesses"
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm font-normal text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none"
                  disabled={loading}
                />
              </label>
              <p className="sm:col-span-2 text-[11px] text-zinc-400">
                The category decides what the AI is asked (without naming your brand). It is inferred from your site if left blank.
              </p>
              <label className="sm:col-span-2 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                Page HTML source (optional — for sites requiring manual human verification in your browser)
                <textarea
                  rows={3}
                  value={pastedHtml}
                  onChange={(e) => setPastedHtml(e.target.value)}
                  placeholder="Optional: paste page HTML source here if the site restricts automated crawlers..."
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-xs font-mono font-normal text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none"
                  disabled={loading}
                />
              </label>
            </div>
          )}

          {brandCandidates && brandCandidates.length > 0 && (
            <div className="mt-4 bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    Verify Official Website for &ldquo;{resolvedQuery}&rdquo;
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Please confirm that this is the correct site before starting the audit:
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setBrandCandidates(null)}
                  className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <div className="space-y-2">
                {brandCandidates.map((cand) => (
                  <div
                    key={cand.domain}
                    className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{cand.brand_name}</span>
                        <a
                          href={cand.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-mono text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          {cand.domain}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      {cand.description && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{cand.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => launchAudit(cand.url, cand.brand_name)}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition cursor-pointer shrink-0 disabled:opacity-50"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Confirm &amp; Run Audit</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {preflightBlock && (
            <div className="mt-4 bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-amber-300 dark:border-amber-800 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      Human Verification / Bot Protection Detected ({preflightBlock.preflight.status_code})
                    </h3>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                      <span className="font-mono font-semibold">{preflightBlock.preflight.domain}</span> returned{" "}
                      <span className="font-medium">{preflightBlock.preflight.block_reason}</span>. To get your full Technical &amp; Schema score without wasting an audit, paste the page source first:
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreflightBlock(null)}
                  className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer shrink-0"
                >
                  Dismiss
                </button>
              </div>

              <ol className="text-xs text-zinc-600 dark:text-zinc-300 space-y-1 pl-7 list-decimal">
                <li>
                  Open{" "}
                  <a
                    href={preflightBlock.targetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    {preflightBlock.preflight.domain}
                    <ExternalLink className="w-3 h-3" />
                  </a>{" "}
                  in your browser and complete any verification check.
                </li>
                <li>
                  Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px]">Cmd+U</kbd> /{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px]">Ctrl+U</kbd> (View Page Source), select all (<kbd className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px]">Ctrl+A</kbd>), and copy (<kbd className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-mono text-[11px]">Ctrl+C</kbd>).
                </li>
                <li>Paste the HTML below and run your full audit:</li>
              </ol>

              <textarea
                rows={4}
                value={pastedHtml}
                onChange={(e) => setPastedHtml(e.target.value)}
                placeholder="Paste full <!DOCTYPE html>... page source here..."
                className="w-full p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 outline-none"
                disabled={loading}
              />

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    startAuditDirectly(preflightBlock.targetUrl, preflightBlock.detectedBrand, "")
                  }
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer disabled:opacity-50"
                >
                  Skip HTML &amp; Run AI-Only Audit
                </button>
                <button
                  type="button"
                  disabled={loading || !pastedHtml.trim()}
                  onClick={() =>
                    startAuditDirectly(
                      preflightBlock.targetUrl,
                      preflightBlock.detectedBrand,
                      pastedHtml.trim()
                    )
                  }
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Run Full Audit with Provided HTML</span>
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-3 rounded-lg border border-rose-200 dark:border-rose-900/50">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* 7-Step Workflow Explanation */}
        <div className="mt-16 pt-12 border-t border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 text-center mb-6">
            The 7-Step Audit Workflow
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="bg-white dark:bg-zinc-900/60 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80">
              <div className="font-mono text-zinc-400 text-[11px] mb-1">01 / 02</div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">Crawl &amp; Parse</div>
              <p className="text-zinc-500 mt-1">Fetches site HTML, robots.txt, sitemap.xml, and /llms.txt at root.</p>
            </div>

            <div className="bg-white dark:bg-zinc-900/60 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80">
              <div className="font-mono text-zinc-400 text-[11px] mb-1">03 / 04</div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">Signals &amp; Prompts</div>
              <p className="text-zinc-500 mt-1">Extracts schema, headings, and generates 4 realistic buyer questions.</p>
            </div>

            <div className="bg-white dark:bg-zinc-900/60 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80">
              <div className="font-mono text-zinc-400 text-[11px] mb-1">05 / 06</div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">Gemini AI &amp; Scoring</div>
              <p className="text-zinc-500 mt-1">Runs separate, repeated Gemini probes and calculates the 35/65 GEO score.</p>
            </div>

            <div className="bg-white dark:bg-zinc-900/60 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80">
              <div className="font-mono text-zinc-400 text-[11px] mb-1">07</div>
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">Fixes &amp; Solutions</div>
              <p className="text-zinc-500 mt-1">Generates ready-to-download robots.txt and /llms.txt files.</p>
            </div>
          </div>
        </div>

        {/* Real Audit History (if available) */}
        {recentAudits.length > 0 && (
          <div className="mt-12">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
              Recent Audits
            </h3>
            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
              {recentAudits.map((item) => (
                <Link
                  key={item.id}
                  href={item.status === "completed" ? `/report/${item.id}` : `/audit/${item.id}`}
                  className="p-3.5 flex items-center justify-between text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition" />
                    <span className="font-mono font-medium text-zinc-800 dark:text-zinc-200">
                      {item.url}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.composite_score !== undefined && item.composite_score !== null ? (
                      <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {item.composite_score} / 100
                      </span>
                    ) : (
                      <span className="capitalize text-zinc-400">{item.status}</span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
