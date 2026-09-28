import React from "react";
import { Cpu, Sparkles } from "lucide-react";

interface SubScoreCardProps {
  technicalScore: number;
  aiVisibilityScore: number;
  weightTechnical: number;
  weightAiVisibility: number;
}

export function SubScoreCard({
  technicalScore,
  aiVisibilityScore,
  weightTechnical,
  weightAiVisibility,
}: SubScoreCardProps) {
  const getSubScoreBadge = (score: number) => {
    if (score >= 80) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800";
    if (score >= 50) return "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800";
    return "bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800";
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Technical Readiness */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Technical Readiness
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Can AI web crawlers read, parse, and cite your site?
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {Math.round(weightTechnical * 100)}% Weight
          </span>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {technicalScore}
            </span>
            <span className="text-xs text-zinc-400">/ 100</span>
          </div>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${getSubScoreBadge(
              technicalScore
            )}`}
          >
            {technicalScore >= 80 ? "Pass" : technicalScore >= 50 ? "Needs Work" : "Failing"}
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex flex-wrap gap-x-3 gap-y-1">
          <span>• Robots.txt &amp; AI Bots (30%)</span>
          <span>• JSON-LD Schema (25%)</span>
          <span>• Metadata &amp; Headings (25%)</span>
          <span>• Semantic HTML (20%)</span>
        </div>
      </div>

      {/* AI Visibility */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                AI Visibility Signal
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Does your brand show up when users ask real buying queries?
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
            {Math.round(weightAiVisibility * 100)}% Weight
          </span>
        </div>

        <div className="mt-4 flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
              {aiVisibilityScore}
            </span>
            <span className="text-xs text-zinc-400">/ 100</span>
          </div>
          <span
            className={`text-xs px-2.5 py-0.5 rounded-full font-medium border ${getSubScoreBadge(
              aiVisibilityScore
            )}`}
          >
            {aiVisibilityScore >= 80 ? "Visible" : aiVisibilityScore >= 50 ? "Partial" : "Invisible"}
          </span>
        </div>

        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex flex-wrap gap-x-3 gap-y-1">
          <span>• Brand Discovery</span>
          <span>• Category Search</span>
          <span>• Comparative Analysis</span>
          <span>• Market Alternatives</span>
        </div>
      </div>
    </div>
  );
}
