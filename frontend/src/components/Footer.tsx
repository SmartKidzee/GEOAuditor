import React from "react";

export function Footer() {
  return (
    <footer className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 py-10 mt-16 text-zinc-500 dark:text-zinc-400 text-xs">
      <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <p className="font-semibold text-zinc-800 dark:text-zinc-200 text-sm">
            GEOAuditor
          </p>
          <p className="mt-1 max-w-md text-zinc-500 dark:text-zinc-400">
            Open audit tool combining technical machine-readability checks with real-world Google Gemini buyer queries.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-xs">
          <span>Standards & References:</span>
          <span className="text-zinc-600 dark:text-zinc-300">RFC 9309 (Robots)</span>
          <span className="hidden sm:inline">•</span>
          <span className="text-zinc-600 dark:text-zinc-300">llmstxt.org (Howard 2024)</span>
          <span className="hidden sm:inline">•</span>
          <span className="text-zinc-600 dark:text-zinc-300">Aggarwal et al. (KDD &apos;24)</span>
        </div>
      </div>
    </footer>
  );
}
