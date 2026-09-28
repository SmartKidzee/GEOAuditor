"use client";

import React, { useState } from "react";
import { AiVisibilityFindings, AiVisibilityQueryFinding } from "../lib/types";
import {
  MessageSquareQuote,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Search,
  Compass,
  GitCompare,
  Layers,
  Languages,
  Users,
  Award,
  Link2,
  Sparkles,
  BarChart3,
  Globe2,
} from "lucide-react";

interface AiVisibilityPanelProps {
  findings: AiVisibilityFindings;
  brandName: string;
}

export function AiVisibilityPanel({ findings, brandName }: AiVisibilityPanelProps) {
  const [activeTab, setActiveTab] = useState<"queries" | "multilingual" | "competitors">("queries");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (intent: string) => {
    setExpanded((prev) => ({ ...prev, [intent]: !prev[intent] }));
  };

  const getIntentIcon = (intent: string) => {
    if (intent.includes("Brand Discovery")) {
      return <Compass className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />;
    }
    if (intent.includes("Category Search")) {
      return <Search className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />;
    }
    if (intent.includes("Comparative Analysis")) {
      return <GitCompare className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />;
    }
    if (intent.includes("Market Alternatives")) {
      return <Layers className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />;
    }
    if (intent.includes("Indic") || intent.includes("Multilingual")) {
      return <Languages className="w-4 h-4 text-purple-600 dark:text-purple-400" />;
    }
    return <MessageSquareQuote className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />;
  };

  const mentionRate = findings.mention_rate ?? 0;
  const recommendationRate = findings.recommendation_rate ?? 0;
  const citationRate = findings.brand_citation_rate ?? 0;
  const competitorSov = findings.competitor_share_of_voice || {};
  const multilingualList = findings.multilingual_breakdown || [];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
      {/* Header */}
      <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              Generative Engine Visibility &amp; Attribution Matrix
            </h2>
            <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Otterly.ai &amp; IndicGenBench Aligned
            </span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Empirical measurements separating Brand Mentions, Recommendations, Official Citations, and Indic Language Performance.
          </p>
        </div>

        <div className="text-right">
          <div className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100">
            {findings.score} / 100
          </div>
          <div className="text-[11px] text-zinc-400">Total AI Visibility Score</div>
        </div>
      </div>

      {/* Attribution KPI Bar (Literature Review Section 4: Citation & Source Attribution) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-100 dark:bg-zinc-800 text-xs">
        <div className="bg-white dark:bg-zinc-900 p-4">
          <div className="text-zinc-400 text-[11px] flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span>Mention Rate</span>
          </div>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {mentionRate}%
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Brand named in answers</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4">
          <div className="text-zinc-400 text-[11px] flex items-center gap-1.5 mb-1">
            <Award className="w-3.5 h-3.5 text-emerald-500" />
            <span>Recommendation Rate</span>
          </div>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {recommendationRate}%
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Endorsed as top choice</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4">
          <div className="text-zinc-400 text-[11px] flex items-center gap-1.5 mb-1">
            <Link2 className="w-3.5 h-3.5 text-purple-500" />
            <span>Brand Citation Rate</span>
          </div>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {citationRate}%
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Official domain URL cited</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4">
          <div className="text-zinc-400 text-[11px] flex items-center gap-1.5 mb-1">
            <Globe2 className="w-3.5 h-3.5 text-amber-500" />
            <span>Languages Audited</span>
          </div>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {multilingualList.length || 3}
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">English, Hindi, Kannada</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 px-5 pt-3 flex gap-4 text-xs font-medium">
        <button
          onClick={() => setActiveTab("queries")}
          className={`pb-2.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === "queries"
              ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-semibold"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          <MessageSquareQuote className="w-3.5 h-3.5" />
          <span>Prompt Panel &amp; Responses ({findings.queries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("multilingual")}
          className={`pb-2.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === "multilingual"
              ? "border-purple-600 dark:border-purple-400 text-purple-700 dark:text-purple-300 font-semibold"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          <Languages className="w-3.5 h-3.5 text-purple-500" />
          <span>Indic Multilingual Matrix (IndicGenBench)</span>
        </button>

        <button
          onClick={() => setActiveTab("competitors")}
          className={`pb-2.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
            activeTab === "competitors"
              ? "border-blue-600 dark:border-blue-400 text-blue-700 dark:text-blue-300 font-semibold"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-blue-500" />
          <span>Competitor Share of Voice</span>
        </button>
      </div>

      {/* Tab 1: Queries and Responses */}
      {activeTab === "queries" && (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {findings.queries.map((q: AiVisibilityQueryFinding) => {
            const isExp = expanded[q.intent_name];

            return (
              <div key={q.intent_name} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                      {getIntentIcon(q.intent_name)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {q.intent_name}
                        </h3>

                        {q.language_name && (
                          <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                            {q.language_name}
                          </span>
                        )}

                        <span
                          className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${
                            q.mentioned
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                              : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
                          }`}
                        >
                          {q.mentioned ? "Brand Cited" : "Brand Omitted"}
                        </span>

                        {q.recommended && (
                          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                            Recommended
                          </span>
                        )}

                        {q.cited_brand_domain && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            Domain Linked
                          </span>
                        )}

                        {q.mentioned && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                            {q.position} • {q.sentiment}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                    <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {q.score} / 100 pts
                    </span>
                    <button
                      onClick={() => toggle(q.intent_name)}
                      className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium px-2 py-1 rounded bg-zinc-50 dark:bg-zinc-800 cursor-pointer"
                    >
                      <span>{isExp ? "Hide Response" : "View AI Response"}</span>
                      {isExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Prompt */}
                <div className="mt-2.5 ml-10.5 text-xs text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded border border-zinc-100 dark:border-zinc-800/80">
                  <span className="text-zinc-400 font-sans font-semibold">Prompt: </span>
                  &quot;{q.query}&quot;
                </div>

                {/* Verbatim Excerpt Evidence */}
                <div className="mt-3 ml-10.5">
                  <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <MessageSquareQuote className="w-3 h-3 text-zinc-400" />
                    Verbatim AI Evidence Excerpt
                  </div>
                  <div className="bg-zinc-950 text-zinc-200 p-3.5 rounded-lg border border-zinc-800 font-mono text-xs leading-relaxed">
                    {q.evidence_excerpt ? (
                      <p className="italic">{q.evidence_excerpt}</p>
                    ) : (
                      <p className="text-zinc-500 italic">No direct citation found.</p>
                    )}
                  </div>
                </div>

                {/* Competitors detected */}
                {q.cited_competitors && q.cited_competitors.length > 0 && (
                  <div className="mt-2.5 ml-10.5 flex items-center gap-2 text-xs">
                    <span className="text-zinc-400 font-medium text-[11px]">Competitors Surfaced:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {q.cited_competitors.map((comp) => (
                        <span
                          key={comp}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                        >
                          {comp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Full Raw AI Response Inspection */}
                {isExp && (
                  <div className="mt-3 ml-10.5 bg-zinc-900 text-zinc-300 p-4 rounded-lg border border-zinc-800 text-xs font-mono max-h-72 overflow-y-auto leading-relaxed">
                    <div className="text-[10px] uppercase font-sans font-bold text-zinc-400 mb-2 flex items-center justify-between">
                      <span>Full Gemini Response Transcript</span>
                      <span className="font-mono text-zinc-500">{q.language_name}</span>
                    </div>
                    <div className="whitespace-pre-wrap text-[11px] text-zinc-300">
                      {q.raw_response}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 2: Indic Multilingual Evaluation */}
      {activeTab === "multilingual" && (
        <div className="p-6 space-y-6">
          <div className="bg-purple-50 dark:bg-purple-950/30 p-4 rounded-xl border border-purple-200 dark:border-purple-900/50">
            <h3 className="text-xs font-bold text-purple-900 dark:text-purple-200 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Languages className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Academic Research Alignment (IndicGenBench / Indic QA Benchmark)
            </h3>
            <p className="text-xs text-purple-800 dark:text-purple-300 leading-relaxed">
              As established in Section 3 of the literature review (Singh et al. ACL 2024, NAACL 2025), language generation and factual recall differ across Indic scripts and morphology. Commercial AI systems cannot be assumed to maintain equal brand visibility across Indic languages without empirical testing.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Market &amp; Language</th>
                  <th className="py-2.5 px-3">Prompts Executed</th>
                  <th className="py-2.5 px-3">Average Score</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Benchmark Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {multilingualList.map((item, idx) => (
                  <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                    <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.market} ({item.language})
                    </td>
                    <td className="py-3 px-3 font-mono text-zinc-600 dark:text-zinc-400">
                      {item.queries_evaluated} matched prompts
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {item.average_score} / 100
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          item.average_score >= 80
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                            : item.average_score >= 60
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                            : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                        }`}
                      >
                        {item.average_score >= 80 ? "High Prominence" : item.average_score >= 60 ? "Moderate" : "Low Visibility"}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-zinc-500">
                      {item.benchmark_reference}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Competitor Share of Voice (Otterly.ai inspired) */}
      {activeTab === "competitors" && (
        <div className="p-6 space-y-6">
          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-xl border border-blue-200 dark:border-blue-900/50">
            <h3 className="text-xs font-bold text-blue-900 dark:text-blue-200 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Otterly.ai Competitive Benchmarking &amp; Share of Voice
            </h3>
            <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
              When generative engines answer category, comparative, and alternative queries, they allocate attention between competing platforms. This benchmark measures your brand&apos;s share of voice against industry peers.
            </p>
          </div>

          <div className="space-y-4">
            {Object.entries(competitorSov).map(([name, pct]) => {
              const isTargetBrand = name.toLowerCase() === brandName.toLowerCase();
              return (
                <div key={name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold flex items-center gap-1.5">
                      {name}
                      {isTargetBrand && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                          Your Brand
                        </span>
                      )}
                    </span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                      {pct}% Share
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isTargetBrand
                          ? "bg-zinc-900 dark:bg-zinc-100"
                          : "bg-blue-500/70 dark:bg-blue-400/70"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
