"use client";

import React, { useState } from "react";
import {
  AiVisibilityFindings,
  AiVisibilityQueryFinding,
  PerceptionVerdict,
} from "../lib/types";
import {
  MessageSquareQuote,
  ChevronDown,
  ChevronUp,
  Languages,
  Users,
  Award,
  Link2,
  BarChart3,
  AlertCircle,
  ShieldCheck,
  Layers,
  Sparkles,
} from "lucide-react";

interface AiVisibilityPanelProps {
  findings: AiVisibilityFindings;
  brandName: string;
}

type Tab = "runs" | "perception" | "languages" | "competitors" | "breakdown";

const VERDICT_STYLES: Record<PerceptionVerdict, { label: string; cls: string; blurb: string }> = {
  accurate: {
    label: "Accurate",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
    blurb: "The model describes the brand correctly.",
  },
  partial: {
    label: "Partial",
    cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
    blurb: "The model knows the brand but is vague or incomplete.",
  },
  hallucinated: {
    label: "Hallucinated",
    cls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
    blurb: "The model's description contradicts the website.",
  },
  unknown: {
    label: "Unknown to AI",
    cls: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
    blurb: "The model said it does not recognise the brand.",
  },
  unavailable: {
    label: "Not measured",
    cls: "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700",
    blurb: "The perception probe could not run.",
  },
};

const COMPONENT_LABELS: Record<string, { label: string; help: string }> = {
  organic_discovery_en: {
    label: "Organic discovery (English)",
    help: "Share of English runs where the brand surfaced without being named.",
  },
  organic_discovery_indic: {
    label: "Organic discovery (Hindi & Kannada)",
    help: "Same test in Hindi and Kannada.",
  },
  rank_prominence: {
    label: "Rank prominence",
    help: "How high the brand was ranked when it did appear.",
  },
  perception_accuracy: {
    label: "Brand perception accuracy",
    help: "Whether the model describes the brand correctly.",
  },
  domain_citation: {
    label: "Domain citation",
    help: "Whether the model attached the brand's official domain.",
  },
};

const SOURCE_LABELS: Record<string, string> = {
  user: "set by you",
  gemini: "inferred from your site by Gemini",
  heuristic: "inferred by a keyword heuristic",
};

export function AiVisibilityPanel({ findings, brandName }: AiVisibilityPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("runs");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const available = findings.available !== false && findings.score !== null;
  const organicRuns = (findings.queries || []).filter(
    (q) => (q.probe_type ?? "organic_discovery") === "organic_discovery"
  );
  const perception = findings.perception ?? null;
  const verdictStyle = VERDICT_STYLES[(perception?.verdict ?? "unavailable") as PerceptionVerdict];
  const competitorSov = findings.competitor_share_of_voice || {};
  const languages = findings.multilingual_breakdown || [];
  const components = findings.score_components || {};
  const n = findings.organic_runs ?? 0;
  const k = findings.organic_mentions ?? 0;
  const source = findings.category_source ? SOURCE_LABELS[findings.category_source] : "";
  // Audits saved by the earlier single-batch version have no probe ids.
  const legacy = (findings.queries || []).some((q) => !q.probe_id);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "runs", label: `Organic Discovery Runs (${organicRuns.length})`, icon: <MessageSquareQuote className="w-3.5 h-3.5" /> },
    { id: "perception", label: "Brand Perception", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: "languages", label: "Languages", icon: <Languages className="w-3.5 h-3.5" /> },
    { id: "competitors", label: "Share of Voice", icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: "breakdown", label: "How the Score Is Built", icon: <Layers className="w-3.5 h-3.5" /> },
  ];

  const header = (
    <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
      <div className="min-w-0">
        <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">AI Visibility Measurement</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Every row below is a separate, real Gemini call. The AI is asked about your category without being told your
          brand name, then asked what it believes your brand is.
        </p>
        {findings.category_used && (
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2">
            Category asked about:{" "}
            <span className="font-mono text-zinc-800 dark:text-zinc-200">&ldquo;{findings.category_used}&rdquo;</span>
            {source && <span className="text-zinc-400"> ({source})</span>}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <div className="font-mono text-base font-bold text-zinc-900 dark:text-zinc-100">
          {available ? `${findings.score} / 100` : "Not measured"}
        </div>
        <div className="text-[11px] text-zinc-400">AI Visibility Score</div>
      </div>
    </div>
  );

  if (!available) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
        {header}
        <div className="p-5 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <div className="font-bold">AI check unavailable</div>
            <p className="mt-0.5 leading-relaxed">
              {findings.unavailable_reason || "The AI probes could not run."} No answers were estimated or generated, and
              no AI score was calculated.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const statusBadge = (q: AiVisibilityQueryFinding) => {
    if (q.status === "unavailable") {
      return (
        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
          Unavailable
        </span>
      );
    }
    return (
      <span
        className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${
          q.mentioned
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
            : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800"
        }`}
      >
        {q.mentioned ? (q.rank ? `Surfaced · rank #${q.rank}` : "Surfaced") : "Not surfaced"}
      </span>
    );
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
      {header}

      {/* KPI bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-zinc-100 dark:bg-zinc-800 text-xs">
        <div className="bg-white dark:bg-zinc-900 p-4">
          <div className="text-zinc-400 text-[11px] flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-blue-500" />
            <span>Organic Mention Rate</span>
          </div>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {findings.mention_rate ?? 0}%
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">
            Surfaced unprompted in {k} of {n} English run{n === 1 ? "" : "s"}
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4">
          <div className="text-zinc-400 text-[11px] flex items-center gap-1.5 mb-1">
            <Award className="w-3.5 h-3.5 text-emerald-500" />
            <span>Top-3 Rate</span>
          </div>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {findings.recommendation_rate ?? 0}%
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Ranked in the AI&apos;s top three</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4">
          <div className="text-zinc-400 text-[11px] flex items-center gap-1.5 mb-1">
            <Link2 className="w-3.5 h-3.5 text-purple-500" />
            <span>Domain Citation Rate</span>
          </div>
          <div className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
            {findings.brand_citation_rate ?? 0}%
          </div>
          <div className="text-[10px] text-zinc-500 mt-0.5">Official domain supplied by the AI</div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-4">
          <div className="text-zinc-400 text-[11px] flex items-center gap-1.5 mb-1">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            <span>Brand Perception</span>
          </div>
          <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full border ${verdictStyle.cls}`}>
            {verdictStyle.label}
          </span>
          <div className="text-[10px] text-zinc-500 mt-1">{verdictStyle.blurb}</div>
        </div>
      </div>

      {legacy && (
        <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800 flex items-start gap-2 text-[11px] text-zinc-600 dark:text-zinc-300">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px text-zinc-500" />
          <span>
            This audit was produced by an earlier version that used a single batched prompt with the brand named in it.
            Re-run the audit to get repeated, unbranded measurements and the brand-perception check.
          </span>
        </div>
      )}

      {/* Notes: coverage warnings, caps, caveats */}
      {findings.notes && findings.notes.length > 0 && (
        <div className="px-5 py-3 bg-amber-50/70 dark:bg-amber-950/20 border-b border-amber-100 dark:border-amber-900/40 space-y-1">
          {findings.notes.map((note, i) => (
            <div key={i} className="flex items-start gap-2 text-[11px] text-amber-900 dark:text-amber-200">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px text-amber-600" />
              <span>{note}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 px-5 pt-3 flex gap-4 text-xs font-medium overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`pb-2.5 border-b-2 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === t.id
                ? "border-zinc-900 dark:border-zinc-100 text-zinc-900 dark:text-zinc-100 font-semibold"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab: organic discovery runs */}
      {activeTab === "runs" && (
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {organicRuns.map((q, idx) => {
            const id = q.probe_id || `${q.intent_name}-${idx}`;
            const isExp = expanded[id];
            return (
              <div key={id} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {q.intent_name}
                      {(q.run_index ?? 1) > 0 && organicRuns.filter((o) => o.language === q.language).length > 1 && (
                        <span className="text-zinc-400 font-normal"> · run {q.run_index}</span>
                      )}
                    </h3>
                    {q.language_name && (
                      <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {q.language_name}
                      </span>
                    )}
                    {statusBadge(q)}
                    {q.recommended && (
                      <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                        Top 3
                      </span>
                    )}
                    {q.cited_brand_domain && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        Domain given
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    {q.status !== "unavailable" && (
                      <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                        {q.score} / 100
                      </span>
                    )}
                    {q.raw_response && (
                      <button
                        onClick={() => toggle(id)}
                        className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium px-2 py-1 rounded bg-zinc-50 dark:bg-zinc-800 cursor-pointer"
                      >
                        <span>{isExp ? "Hide Response" : "View AI Response"}</span>
                        {isExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded border border-zinc-100 dark:border-zinc-800/80">
                  <span className="text-zinc-400 font-sans font-semibold">{q.probe_id ? "Asked (brand not named): " : "Asked: "}</span>
                  &quot;{q.query}&quot;
                </div>

                <div className="mt-3 bg-zinc-950 text-zinc-200 p-3.5 rounded-lg border border-zinc-800 font-mono text-xs leading-relaxed">
                  <p className="italic">{q.evidence_excerpt}</p>
                  {q.status === "unavailable" && q.error && (
                    <p className="mt-1 text-[11px] text-zinc-500 not-italic">Reason: {q.error}</p>
                  )}
                </div>

                {q.cited_competitors && q.cited_competitors.length > 0 && (
                  <div className="mt-2.5 flex items-center gap-2 text-xs">
                    <span className="text-zinc-400 font-medium text-[11px]">Also recommended:</span>
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

                {isExp && (
                  <div className="mt-3 bg-zinc-900 text-zinc-300 p-4 rounded-lg border border-zinc-800 text-xs font-mono max-h-72 overflow-y-auto leading-relaxed">
                    <div className="text-[10px] uppercase font-sans font-bold text-zinc-400 mb-2 flex items-center justify-between">
                      <span>Full model response (raw)</span>
                      <span className="font-mono text-zinc-500">{q.model_used}</span>
                    </div>
                    <div className="whitespace-pre-wrap text-[11px] text-zinc-300">{q.raw_response}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab: brand perception */}
      {activeTab === "perception" && (
        <div className="p-6 space-y-5">
          {!perception || perception.verdict === "unavailable" ? (
            <p className="text-xs text-zinc-500">
              The perception probe could not run, so what the AI believes about {brandName} was not measured.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${verdictStyle.cls}`}>
                  {verdictStyle.label}
                </span>
                <span className="text-xs text-zinc-500">
                  Judged by {perception.judged_by || "n/a"}
                  {perception.judged_by === "heuristic" && " (keyword comparison; cannot prove a hallucination)"}
                </span>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  Asked (answer was not given your site&apos;s text)
                </div>
                <div className="text-xs font-mono bg-zinc-50 dark:bg-zinc-950 p-2.5 rounded border border-zinc-100 dark:border-zinc-800/80 text-zinc-600 dark:text-zinc-300">
                  &quot;{perception.query}&quot;
                </div>
              </div>

              <div>
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                  What the AI said
                </div>
                <div className="bg-zinc-950 text-zinc-200 p-3.5 rounded-lg border border-zinc-800 font-mono text-xs leading-relaxed italic">
                  {perception.model_description || "The model did not describe the brand."}
                </div>
              </div>

              {perception.explanation && (
                <p className="text-xs text-zinc-600 dark:text-zinc-300">
                  <span className="font-semibold">Verdict reasoning: </span>
                  {perception.explanation}
                </p>
              )}

              {perception.wrong_claims.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-rose-600 uppercase tracking-wider mb-1">
                    Claims that contradict your site
                  </div>
                  <ul className="list-disc pl-5 text-xs text-zinc-700 dark:text-zinc-300 space-y-0.5">
                    {perception.wrong_claims.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {perception.missing_facts.length > 0 && (
                <div>
                  <div className="text-[11px] font-semibold text-amber-600 uppercase tracking-wider mb-1">
                    Key facts the AI missed
                  </div>
                  <ul className="list-disc pl-5 text-xs text-zinc-700 dark:text-zinc-300 space-y-0.5">
                    {perception.missing_facts.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              <details className="text-xs">
                <summary className="cursor-pointer text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium">
                  Facts from your site used as ground truth
                </summary>
                <pre className="mt-2 bg-zinc-50 dark:bg-zinc-950 p-3 rounded border border-zinc-100 dark:border-zinc-800 overflow-x-auto text-[11px] text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">
                  {JSON.stringify(perception.site_facts, null, 2)}
                </pre>
              </details>
            </>
          )}
        </div>
      )}

      {/* Tab: languages */}
      {activeTab === "languages" && (
        <div className="p-6 space-y-5">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            The same unbranded category question is asked in each language. Factual recall can differ across Indic
            languages, so visibility in English does not guarantee visibility in Hindi or Kannada (see IndicGenBench /
            MILU for the motivation).
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Market &amp; Language</th>
                  <th className="py-2.5 px-3">Runs</th>
                  <th className="py-2.5 px-3">Brand Surfaced</th>
                  <th className="py-2.5 px-3">Avg. Prominence</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {languages.map((item, idx) => {
                  const measured = item.status !== "unavailable";
                  const rate = item.mention_rate ?? 0;
                  return (
                    <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                      <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                        {item.market} ({item.language})
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-600 dark:text-zinc-400">
                        {measured ? item.queries_evaluated : "—"}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        {measured ? `${item.mentions ?? 0} / ${item.queries_evaluated}` : "—"}
                      </td>
                      <td className="py-3 px-3 font-mono text-zinc-700 dark:text-zinc-300">
                        {measured ? `${item.average_score} / 100` : "—"}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            !measured
                              ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                              : rate >= 66
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                              : rate > 0
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                          }`}
                        >
                          {!measured ? "Unavailable" : rate >= 66 ? "Consistent" : rate > 0 ? "Inconsistent" : "Not surfaced"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: share of voice */}
      {activeTab === "competitors" && (
        <div className="p-6 space-y-5">
          <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Share of all brand slots in the AI&apos;s own recommendation lists across the organic runs. Competitors are
            whatever the models actually named, not a preset list.
          </p>
          <div className="space-y-4">
            {Object.entries(competitorSov).map(([name, pct]) => {
              const isTarget = name.toLowerCase() === brandName.toLowerCase();
              return (
                <div key={name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold flex items-center gap-1.5">
                      {name}
                      {isTarget && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900">
                          Your Brand
                        </span>
                      )}
                    </span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{pct}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isTarget ? "bg-zinc-900 dark:bg-zinc-100" : "bg-blue-500/70 dark:bg-blue-400/70"
                      }`}
                      style={{ width: `${Math.min(100, Math.max(pct > 0 ? 3 : 0, pct))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab: score breakdown + methodology */}
      {activeTab === "breakdown" && (
        <div className="p-6 space-y-5">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Component</th>
                  <th className="py-2.5 px-3">Measured</th>
                  <th className="py-2.5 px-3">Weight</th>
                  <th className="py-2.5 px-3">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {Object.entries(components).map(([key, c]) => {
                  const meta = COMPONENT_LABELS[key] ?? { label: key, help: "" };
                  return (
                    <tr key={key}>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-zinc-900 dark:text-zinc-100">{meta.label}</div>
                        <div className="text-[11px] text-zinc-500">{meta.help}</div>
                      </td>
                      <td className="py-3 px-3 font-mono">{c.value === null ? "not measured" : `${c.value}%`}</td>
                      <td className="py-3 px-3 font-mono">{c.value === null ? "—" : `${c.weight}%`}</td>
                      <td className="py-3 px-3 font-mono font-bold">{c.value === null ? "—" : c.points}</td>
                    </tr>
                  );
                })}
                <tr className="bg-zinc-50 dark:bg-zinc-800/40">
                  <td className="py-3 px-3 font-bold" colSpan={3}>
                    AI Visibility Score
                  </td>
                  <td className="py-3 px-3 font-mono font-bold">{findings.score}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {typeof findings.coverage === "number" && (
            <p className="text-[11px] text-zinc-500">
              Probe coverage: {Math.round(findings.coverage * 100)}% of planned probes returned an answer.
              {findings.engine_used && <> Models used: <span className="font-mono">{findings.engine_used}</span>.</>}
            </p>
          )}

          {findings.methodology && (
            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-lg p-4">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Methodology &amp; limits
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">{findings.methodology}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
