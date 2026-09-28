"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getAuditStatus } from "../../../lib/api";
import { ReportData } from "../../../lib/types";
import { Navbar } from "../../../components/Navbar";
import { Footer } from "../../../components/Footer";
import { ScoreGauge } from "../../../components/ScoreGauge";
import { SubScoreCard } from "../../../components/SubScoreCard";
import { SolutionCard } from "../../../components/SolutionCard";
import { ActionPlan } from "../../../components/ActionPlan";
import { TechnicalSignals } from "../../../components/TechnicalSignals";
import { AiVisibilityPanel } from "../../../components/AiVisibilityPanel";
import { WhiteLabelReportModal } from "../../../components/WhiteLabelReportModal";
import {
  RotateCcw,
  AlertCircle,
  FileText,
  Download,
  Printer,
  Sparkles,
  BookOpen,
  ArrowUpRight,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function ReportPage() {
  const params = useParams();
  const jobId = params?.id as string;

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWhiteLabelModal, setShowWhiteLabelModal] = useState(false);

  useEffect(() => {
    if (!jobId) return;

    let isSubscribed = true;

    async function loadReport() {
      try {
        const jobStatus = await getAuditStatus(jobId);
        if (!isSubscribed) return;

        if (jobStatus.status === "failed") {
          setError(jobStatus.error_message || "Audit failed to complete.");
          setLoading(false);
          return;
        }

        if (jobStatus.status !== "completed" || !jobStatus.report) {
          setError("Audit is still being processed or report data is unavailable.");
          setLoading(false);
          return;
        }

        setReport(jobStatus.report);
        setLoading(false);
      } catch (err: any) {
        if (!isSubscribed) return;
        setError(err.message || "Failed to load audit report.");
        setLoading(false);
      }
    }

    loadReport();

    return () => {
      isSubscribed = false;
    };
  }, [jobId]);

  const handleDownloadLlmsTxt = () => {
    if (!report) return;
    const llmsSol = report.solutions.find((s) => s.file_name === "llms.txt");
    const content = llmsSol?.downloadable_content || llmsSol?.diff_or_content;
    if (!content) return;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "llms.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
        <Navbar />
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-20 flex flex-col items-center justify-center text-center">
          <div className="w-8 h-8 border-2 border-zinc-900 dark:border-zinc-100 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400 font-mono">
            Loading audit report...
          </p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
        <Navbar />
        <main className="flex-1 max-w-xl w-full mx-auto px-4 py-20">
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-6 text-rose-800 dark:text-rose-300 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
            <h2 className="text-base font-bold text-rose-900 dark:text-rose-200">
              Unable to Load Report
            </h2>
            <p className="text-xs mt-2 text-rose-700 dark:text-rose-300 font-mono bg-white/50 dark:bg-black/30 p-3 rounded-lg border border-rose-200/60 dark:border-rose-900/30">
              {error}
            </p>
            <div className="mt-5 flex justify-center">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 transition"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Start a New Audit</span>
              </Link>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12 space-y-8">
        {/* Top Action Bar: White-Label Export & Quick Tools */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-700 dark:text-purple-300 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                  Otterly.ai-Grade White-Label Agency Reporting
                </span>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Ready to Deliver
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Brand this audit with your agency name, custom executive notes, and export a clean PDF for clients.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDownloadLlmsTxt}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-zinc-800 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download /llms.txt</span>
            </button>

            <button
              onClick={() => setShowWhiteLabelModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition cursor-pointer shadow-xs"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>White-Label Client Report</span>
            </button>
          </div>
        </div>

        {/* Visual Anchor: Composite GEO Score */}
        <ScoreGauge
          compositeScore={report.composite_score}
          url={report.url}
          domain={report.domain}
          brandName={report.brand_name}
          createdAt={report.created_at}
        />

        {/* Sub-scores: Technical vs AI Visibility */}
        <SubScoreCard
          technicalScore={report.technical_score}
          aiVisibilityScore={report.ai_visibility_score}
          weightTechnical={report.weight_technical}
          weightAiVisibility={report.weight_ai_visibility}
        />

        {/* Academic Literature Review Research Framework Banner */}
        {report.literature_framework && (
          <div className="bg-gradient-to-r from-purple-50/70 via-white to-blue-50/70 dark:from-purple-950/20 dark:via-zinc-900 dark:to-blue-950/20 border border-purple-200/80 dark:border-purple-900/50 rounded-2xl p-5 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center text-purple-700 dark:text-purple-300 shrink-0 mt-0.5">
                <BookOpen className="w-4 h-4" />
              </div>
              <div className="space-y-2 flex-1">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-purple-700 dark:text-purple-300">
                    Academic Research Foundation • NIE Mysuru
                  </div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                    {report.literature_framework.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {report.literature_framework.authors} — {report.literature_framework.institution}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1 text-xs">
                  {report.literature_framework.core_pillars.slice(0, 3).map((pillar, i) => (
                    <div key={i} className="bg-white/80 dark:bg-zinc-900/80 p-2.5 rounded-lg border border-zinc-200/60 dark:border-zinc-800/60">
                      <div className="font-semibold text-zinc-800 dark:text-zinc-200 text-[11px]">
                        {pillar.code}: {pillar.reference}
                      </div>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{pillar.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Actionable Solutions: robots.txt, llms.txt & llms-full.txt */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                Generated Solutions &amp; Code Fixes
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Ready-to-deploy standardized configuration files synthesized via Google Gemini and Howard 2024 specifications.
              </p>
            </div>
            <span className="text-xs text-zinc-400 font-mono hidden sm:inline">
              RFC 9309 • llmstxt.org
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {report.solutions.map((sol, index) => (
              <SolutionCard key={index} solution={sol} />
            ))}
          </div>
        </section>

        {/* Prioritized Action Plan */}
        <ActionPlan issues={report.issues} />

        {/* Technical Signals Breakdown */}
        <TechnicalSignals findings={report.technical_findings} />

        {/* Real-world AI Visibility & Multilingual Evidence */}
        <AiVisibilityPanel findings={report.ai_visibility_findings} brandName={report.brand_name} />

        {/* Re-Audit & Sharing Bar */}
        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-zinc-500 dark:text-zinc-400">
            Audit ID: <span className="font-mono text-zinc-700 dark:text-zinc-300">{report.job_id}</span> • Permanent permalink
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowWhiteLabelModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Export White-Label Report</span>
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Audit Another Website</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />

      {/* White-Label Export Modal */}
      <WhiteLabelReportModal
        report={report}
        isOpen={showWhiteLabelModal}
        onClose={() => setShowWhiteLabelModal(false)}
      />
    </div>
  );
}
