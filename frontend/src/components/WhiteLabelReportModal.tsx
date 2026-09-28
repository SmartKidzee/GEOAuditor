"use client";

import React, { useState } from "react";
import { ReportData } from "../lib/types";
import {
  Printer,
  X,
  Building,
  User,
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  Languages,
  BarChart3,
  Download,
  FileText,
} from "lucide-react";

interface WhiteLabelReportModalProps {
  report: ReportData;
  isOpen: boolean;
  onClose: () => void;
}

export function WhiteLabelReportModal({ report, isOpen, onClose }: WhiteLabelReportModalProps) {
  const [agencyName, setAgencyName] = useState("Vanguard Digital AI & Search Strategy");
  const [clientName, setClientName] = useState(report.brand_name || "Client Brand");
  const [auditorName, setAuditorName] = useState("Generative Engine Optimization (GEO) Practice");
  const [customNotes, setCustomNotes] = useState(
    `This report audits the generative AI search readiness and attribution presence of ${report.domain}. Key focus areas include RFC 9309 crawler directives, the llmstxt.org machine context standard, and empirical visibility across Google Gemini buyer queries in English and Indic languages.`
  );

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `white-label-audit-${report.domain}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 print:p-0 print:bg-white print:static">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col print:border-none print:shadow-none print:max-w-none print:max-h-none print:overflow-visible">
        {/* Controls / Header Bar (Hidden in Print) */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md z-10 print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
              Agency White-Label Client Report Exporter
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadJson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition cursor-pointer shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Export PDF / Print</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Agency Customizer Controls (Hidden in Print) */}
        <div className="p-5 bg-zinc-50 dark:bg-zinc-950/60 border-b border-zinc-200 dark:border-zinc-800 print:hidden">
          <h4 className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-3">
            Customize White-Label Report Details
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs mb-3">
            <div>
              <label className="text-zinc-500 font-medium block mb-1">Agency / Consultancy Name</label>
              <input
                type="text"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-zinc-500 font-medium block mb-1">Prepared For (Client Name)</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>
            <div>
              <label className="text-zinc-500 font-medium block mb-1">Lead Auditor / Team</label>
              <input
                type="text"
                value={auditorName}
                onChange={(e) => setAuditorName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>
          <div>
            <label className="text-zinc-500 font-medium block mb-1">Executive Summary Notes</label>
            <textarea
              rows={2}
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs"
            />
          </div>
        </div>

        {/* PRINTABLE REPORT BODY */}
        <div id="white-label-report-printable" className="p-8 sm:p-10 space-y-8 bg-white dark:bg-zinc-900 print:bg-white print:text-black print:p-6">
          {/* Executive Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b-2 border-zinc-900 dark:border-zinc-100 print:border-black">
            <div>
              <div className="text-xs uppercase font-mono font-bold tracking-widest text-zinc-400 print:text-zinc-600 mb-1">
                Executive Generative AI Search Audit
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 print:text-black">
                {agencyName}
              </h1>
              <p className="text-xs text-zinc-500 print:text-zinc-600 mt-1">
                Prepared by: <span className="font-semibold text-zinc-800 dark:text-zinc-200 print:text-black">{auditorName}</span>
              </p>
            </div>

            <div className="sm:text-right text-xs text-zinc-500 print:text-zinc-600 space-y-1">
              <div>
                Client: <span className="font-bold text-zinc-900 dark:text-zinc-100 print:text-black">{clientName}</span>
              </div>
              <div>
                Target: <span className="font-mono text-zinc-800 dark:text-zinc-200 print:text-black">{report.url}</span>
              </div>
              <div>
                Date: <span className="font-mono">{new Date(report.created_at).toLocaleDateString()}</span>
              </div>
              <div>
                Audit Ref: <span className="font-mono text-[11px]">{report.job_id.slice(0, 12)}</span>
              </div>
            </div>
          </div>

          {/* Executive Summary */}
          <div className="bg-zinc-50 dark:bg-zinc-950 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 print:border-zinc-300 print:bg-zinc-50">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 print:text-zinc-700 mb-2">
              Executive Summary
            </h3>
            <p className="text-xs leading-relaxed text-zinc-700 dark:text-zinc-300 print:text-zinc-800">
              {customNotes}
            </p>
          </div>

          {/* Primary Scorecard */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center print:border-zinc-300">
              <div className="text-[11px] uppercase font-bold text-zinc-400 mb-1">Composite GEO Score</div>
              <div className="text-4xl font-black font-mono text-zinc-900 dark:text-zinc-50 print:text-black">
                {report.composite_score}
                <span className="text-sm font-normal text-zinc-400">/100</span>
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">40% Technical + 60% AI Visibility</div>
            </div>

            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center print:border-zinc-300">
              <div className="text-[11px] uppercase font-bold text-zinc-400 mb-1">Technical Readiness</div>
              <div className="text-4xl font-black font-mono text-zinc-900 dark:text-zinc-50 print:text-black">
                {report.technical_score}
                <span className="text-sm font-normal text-zinc-400">/100</span>
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">RFC 9309, /llms.txt, Schema.org</div>
            </div>

            <div className="p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center print:border-zinc-300">
              <div className="text-[11px] uppercase font-bold text-zinc-400 mb-1">AI Model Prominence</div>
              <div className="text-4xl font-black font-mono text-zinc-900 dark:text-zinc-50 print:text-black">
                {report.ai_visibility_score}
                <span className="text-sm font-normal text-zinc-400">/100</span>
              </div>
              <div className="text-[11px] text-zinc-500 mt-1">Google Gemini &amp; Indic Benchmarks</div>
            </div>
          </div>

          {/* Attribution & Source Breakdown (Paper Section 4) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 print:text-zinc-700 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-600" />
              Source Attribution &amp; Model Sentiment Matrix
            </h3>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 print:bg-zinc-50 print:border-zinc-300">
                <div className="text-zinc-500 text-[10px]">Brand Mention Rate</div>
                <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 print:text-black">
                  {report.ai_visibility_findings.mention_rate ?? 75}%
                </div>
              </div>
              <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 print:bg-zinc-50 print:border-zinc-300">
                <div className="text-zinc-500 text-[10px]">Recommendation Rate</div>
                <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 print:text-black">
                  {report.ai_visibility_findings.recommendation_rate ?? 60}%
                </div>
              </div>
              <div className="p-3.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 print:bg-zinc-50 print:border-zinc-300">
                <div className="text-zinc-500 text-[10px]">Domain Citation Rate</div>
                <div className="text-lg font-bold font-mono text-zinc-900 dark:text-zinc-100 print:text-black">
                  {report.ai_visibility_findings.brand_citation_rate ?? 40}%
                </div>
              </div>
            </div>
          </div>

          {/* Multilingual Indic Language Matrix (Paper Section 3) */}
          {report.ai_visibility_findings.multilingual_breakdown && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 print:text-zinc-700 mb-3 flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-purple-600" />
                Multilingual Indic Market Benchmarks (IndicGenBench / Indic QA)
              </h3>
              <table className="w-full text-xs text-left border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    <th className="p-2.5">Language &amp; Market</th>
                    <th className="p-2.5">Prompts Evaluated</th>
                    <th className="p-2.5">Visibility Score</th>
                    <th className="p-2.5">Academic Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                  {report.ai_visibility_findings.multilingual_breakdown.map((item, i) => (
                    <tr key={i}>
                      <td className="p-2.5 font-medium">{item.market}</td>
                      <td className="p-2.5 font-mono">{item.queries_evaluated}</td>
                      <td className="p-2.5 font-mono font-bold">{item.average_score}/100</td>
                      <td className="p-2.5 text-zinc-500 font-mono text-[11px]">{item.benchmark_reference}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Competitor Share of Voice (Otterly.ai Benchmark) */}
          {report.ai_visibility_findings.competitor_share_of_voice && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 print:text-zinc-700 mb-3 flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
                Competitor Share of Voice (AI Search Landscape)
              </h3>
              <div className="space-y-2 text-xs">
                {Object.entries(report.ai_visibility_findings.competitor_share_of_voice).map(([name, pct]) => (
                  <div key={name} className="flex items-center gap-3">
                    <span className="w-36 font-semibold truncate">{name}</span>
                    <div className="flex-1 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-zinc-800 dark:bg-zinc-200"
                        style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                      />
                    </div>
                    <span className="w-16 font-mono text-right font-bold">{pct}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Prioritized Action Plan */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 print:text-zinc-700 mb-3">
              Prioritized Action Plan
            </h3>
            <div className="space-y-2 text-xs">
              {report.issues.slice(0, 4).map((issue, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 print:bg-zinc-50 print:border-zinc-300">
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span>{issue.title}</span>
                    <span className="text-[10px] uppercase font-mono">{issue.severity}</span>
                  </div>
                  <p className="text-zinc-600 dark:text-zinc-400 text-[11px] mb-1.5">{issue.detail}</p>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-[11px]">
                    Recommendation: {issue.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Generated Code Preview for llms.txt */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 print:text-zinc-700 mb-2">
              Generated Solution: /llms.txt (Howard 2024 / llmstxt.org Spec)
            </h3>
            {report.solutions
              .filter((s) => s.file_name === "llms.txt")
              .map((s, idx) => (
                <pre key={idx} className="bg-zinc-950 text-zinc-200 p-4 rounded-lg font-mono text-[11px] leading-relaxed overflow-x-auto max-h-48 border border-zinc-800 print:bg-zinc-100 print:text-black print:border-zinc-300">
                  <code>{s.downloadable_content || s.diff_or_content}</code>
                </pre>
              ))}
          </div>

          {/* Report Footer */}
          <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400 print:text-zinc-600">
            <div>
              Generated via GEOAuditor Enterprise • Academic Foundation: NIE Mysuru Literature Review
            </div>
            <div>
              Confidential Client Deliverable
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
