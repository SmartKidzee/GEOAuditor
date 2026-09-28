import React from "react";
import Link from "next/link";
import { ShieldCheck, PlusCircle } from "lucide-react";

export function Navbar() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 font-semibold text-sm">
            <ShieldCheck className="w-5 h-5 text-zinc-100 dark:text-zinc-900" />
          </div>
          <div>
            <div className="font-bold text-base tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
              GEOAuditor
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                MVP
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 -mt-0.5 hidden sm:block">
              AI Brand Visibility & Technical Readiness
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-200 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            New Audit
          </Link>
        </div>
      </div>
    </header>
  );
}
