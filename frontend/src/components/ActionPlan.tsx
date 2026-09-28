import React from "react";
import { ActionPlanItem, Severity } from "../lib/types";
import { AlertOctagon, AlertTriangle, Lightbulb, CheckCircle2 } from "lucide-react";

interface ActionPlanProps {
  issues: ActionPlanItem[];
}

export function ActionPlan({ issues }: ActionPlanProps) {
  const getSeverityBadge = (severity: Severity) => {
    switch (severity) {
      case "critical":
        return {
          icon: <AlertOctagon className="w-4 h-4 text-rose-500 shrink-0" />,
          label: "Critical Fix",
          bg: "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />,
          label: "Warning",
          bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400",
        };
      case "opportunity":
        return {
          icon: <Lightbulb className="w-4 h-4 text-emerald-500 shrink-0" />,
          label: "Opportunity",
          bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400",
        };
    }
  };

  const criticalCount = issues.filter((i) => i.severity === "critical").length;
  const warningCount = issues.filter((i) => i.severity === "warning").length;
  const oppCount = issues.filter((i) => i.severity === "opportunity").length;

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-xs">
      <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            Prioritized Action Plan
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Concrete fixes tied directly to the audit signals detected on your site.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {criticalCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full font-medium bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
              {criticalCount} Critical
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
              {warningCount} Warnings
            </span>
          )}
          {oppCount > 0 && (
            <span className="px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
              {oppCount} Opportunities
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {issues.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            No active issues detected. Your technical and AI visibility signals meet all criteria.
          </div>
        ) : (
          issues.map((item, idx) => {
            const badge = getSeverityBadge(item.severity);
            return (
              <div key={idx} className="p-5 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {badge.icon}
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.title}
                    </h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-zinc-400 font-mono">
                      {item.related_check}
                    </span>
                    <span
                      className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full border ${badge.bg}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400 pl-6 leading-relaxed">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">Finding:</span>{" "}
                  {item.detail}
                </p>

                <div className="mt-2.5 ml-6 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800 text-xs">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">Recommended Fix:</span>{" "}
                  <span className="text-zinc-700 dark:text-zinc-300">{item.recommendation}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
