"use client";

import React, { useState } from "react";
import { TechnicalFindings, TechnicalSignalCheck } from "../lib/types";
import { CheckCircle2, AlertTriangle, XCircle, ChevronDown, ChevronUp, Bot, FileText, Code2, Layout } from "lucide-react";

interface TechnicalSignalsProps {
  findings: TechnicalFindings;
}

export function TechnicalSignals({ findings }: TechnicalSignalsProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const getStatusBadge = (status: "pass" | "warn" | "fail") => {
    switch (status) {
      case "pass":
        return {
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" />,
          label: "Pass",
          color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
        };
      case "warn":
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
          label: "Warning",
          color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
        };
      case "fail":
        return {
          icon: <XCircle className="w-4 h-4 text-rose-500" />,
          label: "Critical Gap",
          color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
        };
    }
  };

  const checks: Array<{
    key: string;
    check: TechnicalSignalCheck;
    icon: React.ReactNode;
    description: string;
  }> = [
    {
      key: "crawlability",
      check: findings.crawlability_bots,
      icon: <Bot className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />,
      description: "Permissions for AI crawlers (GPTBot, Google-Extended, PerplexityBot) in robots.txt, sitemap.xml, and /llms.txt.",
    },
    {
      key: "schema",
      check: findings.json_ld_schema,
      icon: <Code2 className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />,
      description: "Schema.org JSON-LD definitions identifying your brand, organization, products, and direct Q&A entities.",
    },
    {
      key: "metadata",
      check: findings.metadata_headings,
      icon: <FileText className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />,
      description: "Title length, meta description, and singular H1 heading structure fitted for AI context window chunking.",
    },
    {
      key: "semantic",
      check: findings.semantic_html,
      icon: <Layout className="w-4 h-4 text-zinc-600 dark:text-zinc-300" />,
      description: "Use of HTML5 semantic tags (<main>, <header>, <nav>, <section>) to isolate content from layout chrome.",
    },
  ];

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
      <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            Technical Machine-Readability Signals
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Evaluates whether generative AI parsers can scrape, parse, and accurately understand your site architecture.
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
            {findings.score} / 100
          </div>
          <div className="text-[11px] text-zinc-400">Total Tech Score</div>
        </div>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {checks.map(({ key, check, icon, description }) => {
          const badge = getStatusBadge(check.status);
          const isExp = expanded[key];

          return (
            <div key={key} className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start sm:items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    {icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {check.name}
                      </h3>
                      <span
                        className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.2 rounded-full border ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      {description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center">
                  <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {check.score} / {check.max_score} pts
                  </span>
                  <button
                    onClick={() => toggle(key)}
                    className="inline-flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium px-2 py-1 rounded bg-zinc-50 dark:bg-zinc-800 cursor-pointer"
                  >
                    <span>{isExp ? "Hide Evidence" : "Inspect Data"}</span>
                    {isExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="mt-2 text-xs text-zinc-600 dark:text-zinc-400 pl-11">
                {check.details}
              </div>

              {isExp && (
                <div className="mt-3 ml-11 bg-zinc-950 text-zinc-300 p-3.5 rounded-lg border border-zinc-800 font-mono text-xs overflow-x-auto">
                  <div className="text-[10px] uppercase text-zinc-400 mb-1.5 font-sans font-semibold">
                    Extracted Signal Evidence
                  </div>
                  <pre className="text-[11px] leading-relaxed whitespace-pre-wrap">
                    {JSON.stringify(check.evidence, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
