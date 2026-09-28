"use client";

import React, { useState, useEffect } from "react";
import { Share2, Check, ExternalLink } from "lucide-react";

interface ScoreGaugeProps {
  compositeScore: number;
  url: string;
  domain: string;
  brandName: string;
  createdAt: string;
}

export function ScoreGauge({
  compositeScore,
  url,
  domain,
  brandName,
  createdAt,
}: ScoreGaugeProps) {
  const [copied, setCopied] = useState(false);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10";
    if (score >= 50) return "text-amber-600 dark:text-amber-400 border-amber-500/20 bg-amber-500/10";
    return "text-rose-600 dark:text-rose-400 border-rose-500/20 bg-rose-500/10";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Optimized for AI Visibility";
    if (score >= 50) return "Moderate AI Visibility with Gaps";
    return "Critical AI Visibility & Technical Gaps";
  };

  const [formattedDate, setFormattedDate] = useState<string>("");

  useEffect(() => {
    if (createdAt) {
      try {
        setFormattedDate(
          new Date(createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        );
      } catch {
        setFormattedDate(createdAt);
      }
    }
  }, [createdAt]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-zinc-400">
              Audit Target
            </span>
            <span className="text-xs text-zinc-400">•</span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono" suppressHydrationWarning>
              {formattedDate || "Just now"}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mt-1">
            {brandName}
          </h1>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 mt-1 font-mono transition"
          >
            {domain}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Link Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                <span>Share Report</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="flex items-baseline gap-4">
          <div className="text-6xl sm:text-7xl font-black tracking-tight text-zinc-900 dark:text-zinc-50 font-mono">
            {compositeScore}
          </div>
          <div className="space-y-1">
            <div className="text-sm font-semibold text-zinc-400 dark:text-zinc-500">
              / 100
            </div>
            <div
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getScoreColor(
                compositeScore
              )}`}
            >
              {getScoreLabel(compositeScore)}
            </div>
          </div>
        </div>

        <div className="max-w-xs text-left sm:text-right text-xs text-zinc-500 dark:text-zinc-400 space-y-1">
          <div className="font-semibold text-zinc-700 dark:text-zinc-300">
            Composite GEO Formula
          </div>
          <div className="font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800/80 px-2 py-1 rounded inline-block">
            0.40 × Technical + 0.60 × AI Visibility
          </div>
          <p className="text-[11px] leading-relaxed">
            AI visibility weighted higher because actual presence in generative answers is the primary objective.
          </p>
        </div>
      </div>
    </div>
  );
}
