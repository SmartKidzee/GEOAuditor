"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createAudit, getRecentAudits } from "../lib/api";
import { RecentJobItem } from "../lib/types";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { ArrowRight, Globe, Shield, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentAudits, setRecentAudits] = useState<RecentJobItem[]>([]);
  const router = useRouter();

  useEffect(() => {
    getRecentAudits().then(setRecentAudits);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Please enter a domain or URL to audit.");
      return;
    }

    // Basic domain validation
    if (!trimmed.includes(".") || trimmed.length < 4) {
      setError("Please enter a valid domain format (e.g. stripe.com or https://example.com).");
      return;
    }

    setLoading(true);
    try {
      const res = await createAudit(trimmed);
      router.push(`/audit/${res.job_id}`);
    } catch (err: any) {
      setError(err.message || "Failed to start audit. Please check your URL.");
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
            GEOAuditor audits both sides at once: technical machine-readability (robots.txt, schema, context fit) and live AI presence across 4 real buyer queries via Google Gemini.
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
                }}
                placeholder="Enter domain or URL (e.g. github.com)"
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
              <p className="text-zinc-500 mt-1">Queries Gemini API for brand citations and calculates 40/60 GEO score.</p>
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
