"use client";

import React, { useState } from "react";
import { Download, Copy, Check, FileCode, CheckCircle2, AlertCircle, Sparkles, ShieldCheck } from "lucide-react";
import { GeneratedSolution } from "../lib/types";

interface SolutionCardProps {
  solution: GeneratedSolution;
}

export function SolutionCard({ solution }: SolutionCardProps) {
  const [copied, setCopied] = useState(false);

  const handleDownload = () => {
    if (!solution.downloadable_content) return;
    const blob = new Blob([solution.downloadable_content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = solution.file_name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    if (!solution.downloadable_content) return;
    try {
      await navigator.clipboard.writeText(solution.downloadable_content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const isAlreadyValid = solution.status === "already_valid";
  const isGemini = solution.generated_by?.toLowerCase().includes("gemini");

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
      <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
            {isGemini ? <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" /> : <FileCode className="w-4 h-4" />}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                /{solution.file_name}
              </span>
              <span
                className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full border ${
                  isAlreadyValid
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                    : solution.status === "corrected"
                    ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                    : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800"
                }`}
              >
                {isAlreadyValid
                  ? "Already Implemented"
                  : solution.status === "corrected"
                  ? "Corrected Version Ready"
                  : "Generated From Live Content"}
              </span>

              {solution.generated_by && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  <Sparkles className="w-3 h-3 text-purple-500" />
                  {solution.generated_by}
                </span>
              )}

              {solution.spec_compliance && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                  <ShieldCheck className="w-3 h-3 text-zinc-500" />
                  {solution.spec_compliance}
                </span>
              )}
            </div>
            <h4 className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {solution.title}
            </h4>
          </div>
        </div>

        {!isAlreadyValid && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download {solution.file_name}</span>
            </button>
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-400 mb-4 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800/80">
          {isAlreadyValid ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          )}
          <p className="leading-relaxed">{solution.explanation}</p>
        </div>

        {!isAlreadyValid && solution.downloadable_content && (
          <div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5 font-mono">
              <span>File preview (ready to drop into site root):</span>
              <span>{solution.downloadable_content.split("\n").length} lines</span>
            </div>
            <pre className="bg-zinc-950 text-zinc-200 p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-64 border border-zinc-800 leading-relaxed selection:bg-zinc-800">
              <code>{solution.downloadable_content}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
