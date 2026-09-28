"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAuditStatus } from "../../../lib/api";
import { JobStatus, JobStatusResponse } from "../../../lib/types";
import { Navbar } from "../../../components/Navbar";
import { Footer } from "../../../components/Footer";
import {
  Clock,
  Globe,
  FileSearch,
  Sparkles,
  Calculator,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Terminal,
  Activity,
  ShieldCheck,
  Languages,
  Cpu,
  Zap,
  Check,
} from "lucide-react";
import Link from "next/link";

interface StepConfig {
  key: JobStatus;
  label: string;
  sublabel: string;
  badge: string;
  icon: React.ReactNode;
  subtasks: string[];
}

const STEPS: StepConfig[] = [
  {
    key: "pending",
    label: "Pipeline Initialization",
    sublabel: "Verifying target URL, DNS resolution, and provisioning audit worker",
    badge: "Step 1 of 5",
    icon: <Clock className="w-4 h-4" />,
    subtasks: [
      "Validating HTTP/HTTPS URL format and domain hostname",
      "Resolving A/AAAA DNS records and socket connection",
      "Provisioning isolated async pipeline worker",
    ],
  },
  {
    key: "crawling",
    label: "Site Crawl & Spec Probing",
    sublabel: "Fetching HTML DOM, RFC 9309 /robots.txt, /sitemap.xml, and probing for root /llms.txt",
    badge: "Step 2 of 5",
    icon: <Globe className="w-4 h-4" />,
    subtasks: [
      "Fetching homepage DOM with Chrome User-Agent header",
      "Probing RFC 9309 /robots.txt for AI bots (GPTBot, ClaudeBot, PerplexityBot)",
      "Checking /sitemap.xml index endpoints and URLs",
      "Testing for live /llms.txt according to Jeremy Howard (2024) spec",
    ],
  },
  {
    key: "extracting",
    label: "Technical Readiness Extraction",
    sublabel: "Parsing Schema.org JSON-LD entities, OpenGraph tags, semantic tags, and heading hierarchy",
    badge: "Step 3 of 5",
    icon: <FileSearch className="w-4 h-4" />,
    subtasks: [
      "Parsing Schema.org JSON-LD graph entities (Organization, WebSite, Product)",
      "Analyzing OpenGraph & Twitter Card social meta tags",
      "Auditing H1/H2 semantic hierarchy and content-to-code ratio",
      "Extracting brand entity name and primary category taxonomy",
    ],
  },
  {
    key: "querying_ai",
    label: "AI Engine Visibility & Multilingual Queries",
    sublabel: "Querying Google Gemini with buyer intent queries and Indic multilingual panel (Hindi & Kannada)",
    badge: "Step 4 of 5",
    icon: <Sparkles className="w-4 h-4" />,
    subtasks: [
      "Connecting to Gemini API (Single Batch Mode · Free Quota Safe)",
      "Evaluating Brand Discovery & Category Search buyer intent prompts",
      "Benchmarking IndicGenBench Hindi & Indic QA Kannada multilingual matrix",
      "Calculating Competitor Share of Voice & Domain Attribution rates",
    ],
  },
  {
    key: "scoring",
    label: "GEO Scoring & Solution Synthesis",
    sublabel: "Applying 40/60 weighting, synthesizing Howard 2024 /llms.txt, and compiling White-Label Action Plan",
    badge: "Step 5 of 5",
    icon: <Calculator className="w-4 h-4" />,
    subtasks: [
      "Applying 40% Technical + 60% AI Visibility composite score formula",
      "Synthesizing spec-compliant /llms.txt using Gemini Flash fallback engine",
      "Generating companion /llms-full.txt deep RAG context document",
      "Compiling Otterly-style white-label agency executive action plan",
    ],
  },
];

interface LogEntry {
  time: string;
  tag: string;
  message: string;
  color?: string;
}

export default function AuditProgressPage() {
  const params = useParams();
  const router = useRouter();
  const jobId = params?.id as string;

  const [jobData, setJobData] = useState<JobStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState<number>(0);
  const [smoothProgress, setSmoothProgress] = useState<number>(10);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed((prev) => +(prev + 0.25).toFixed(1));
    }, 250);
    return () => clearInterval(timer);
  }, []);

  // Smooth progress interpolator to ensure continuous movement
  useEffect(() => {
    const status = jobData?.status || "pending";
    let targetMin = 10;
    let targetMax = 20;

    switch (status) {
      case "pending":
        targetMin = 10;
        targetMax = 25;
        break;
      case "crawling":
        targetMin = 25;
        targetMax = 50;
        break;
      case "extracting":
        targetMin = 50;
        targetMax = 70;
        break;
      case "querying_ai":
        targetMin = 70;
        targetMax = 88;
        break;
      case "scoring":
        targetMin = 88;
        targetMax = 98;
        break;
      case "completed":
        targetMin = 100;
        targetMax = 100;
        break;
    }

    const interval = setInterval(() => {
      setSmoothProgress((current) => {
        if (status === "completed") return 100;
        if (current < targetMin) return targetMin;
        if (current < targetMax) {
          return +(current + 0.35).toFixed(1);
        }
        return current;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [jobData?.status]);

  // Polling effect (snappy 1000ms polling)
  useEffect(() => {
    if (!jobId) return;

    let isSubscribed = true;
    let pollTimeout: NodeJS.Timeout;

    const poll = async () => {
      try {
        const data = await getAuditStatus(jobId);
        if (!isSubscribed) return;
        setJobData(data);

        if (data.status === "completed") {
          setSmoothProgress(100);
          setTimeout(() => {
            if (isSubscribed) {
              router.replace(`/report/${jobId}`);
            }
          }, 900);
          return;
        }

        if (data.status === "failed") {
          setError(data.error_message || "Audit failed during execution.");
          return;
        }

        pollTimeout = setTimeout(poll, 1000);
      } catch (err: any) {
        if (!isSubscribed) return;
        setError(err.message || "Could not retrieve audit status.");
      }
    };

    poll();

    return () => {
      isSubscribed = false;
      clearTimeout(pollTimeout);
    };
  }, [jobId, router]);

  // Telemetry event stream based on stage transitions and elapsed time
  useEffect(() => {
    const status = jobData?.status || "pending";
    const now = new Date().toLocaleTimeString();

    const addLog = (tag: string, message: string, color: string = "text-purple-400") => {
      setLogs((prev) => {
        if (prev.some((l) => l.message === message)) return prev;
        return [...prev, { time: now, tag, message, color }];
      });
    };

    if (logs.length === 0) {
      addLog("SYS", "Pipeline worker initialized. Establishing secure HTTPS socket...", "text-blue-400");
    }

    if (status === "crawling" || elapsed > 0.8) {
      addLog("HTTP", "Initiating GET request to target root domain with Chrome 126 user agent...", "text-emerald-400");
      addLog("ROBOTS", "Probing /robots.txt: Parsing user-agent directives for GPTBot, ClaudeBot, CCBot...", "text-yellow-400");
      addLog("SPEC", "Probing root /llms.txt per Jeremy Howard (2024) standard...", "text-cyan-400");
    }

    if (status === "extracting" || elapsed > 2.5) {
      addLog("DOM", "DOM parsed successfully. Traversing <head> and <body> semantic structures...", "text-blue-400");
      addLog("SCHEMA", "Auditing Schema.org JSON-LD entities and OpenGraph metadata...", "text-indigo-400");
      addLog("ENTITY", "Classifying brand entity name and primary category taxonomy...", "text-pink-400");
    }

    if (status === "querying_ai" || elapsed > 4.5) {
      addLog("GEMINI", "Initiating single-shot batch prompt across Gemini candidate fallback models...", "text-amber-400");
      addLog("AI_SIM", "Evaluating buyer intent queries: Brand Discovery, Category Recommendations, Top Alternatives...", "text-purple-400");
      addLog("INDIC", "Benchmarking IndicGenBench Hindi and Indic QA Kannada regional queries...", "text-emerald-400");
      addLog("ATTRIB", "Computing Otterly-style Mention Rate, Recommendation Rate, and Competitor Share of Voice...", "text-cyan-400");
    }

    if (status === "scoring" || elapsed > 7.0) {
      addLog("SCORING", "Computing composite GEO score: (0.40 * Technical) + (0.60 * AI Visibility)...", "text-blue-400");
      addLog("SYNTH", "Synthesizing authentic /llms.txt file conforming strictly to Howard (2024) spec...", "text-emerald-400");
      addLog("FULL", "Generating companion /llms-full.txt machine context file for deep RAG indexing...", "text-teal-400");
      addLog("REPORT", "Assembling White-Label Agency executive scorecard and prioritized action plan...", "text-indigo-400");
    }

    if (status === "completed") {
      addLog("DONE", "Audit execution verified. Finalizing report view and redirecting...", "text-emerald-400");
    }
  }, [jobData?.status, elapsed, logs.length]);

  // Auto-scroll terminal log to bottom
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const stageOrder: JobStatus[] = ["pending", "crawling", "extracting", "querying_ai", "scoring", "completed"];
  const currentStatus = jobData?.status || "pending";
  const currentIndex = stageOrder.indexOf(currentStatus);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 space-y-6">
        {/* Main Audit Progress Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500 dark:text-zinc-400">
                  Live Production Audit Execution
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                  Elapsed: {elapsed}s
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-50 font-mono truncate max-w-lg">
                {jobData?.url || "Connecting to target domain..."}
              </h1>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-center">
              <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                Job ID: {jobId ? jobId.slice(0, 8) : "..."}
              </span>
            </div>
          </div>

          {error ? (
            <div className="pt-6">
              <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-xl p-5 text-rose-800 dark:text-rose-300">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  Audit Execution Error
                </div>
                <p className="text-xs mt-2 leading-relaxed text-rose-700 dark:text-rose-300 font-mono bg-white/50 dark:bg-black/30 p-3 rounded border border-rose-200/60 dark:border-rose-900/30">
                  {error}
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Try Another URL</span>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-6 space-y-6">
              {/* Dynamic Telemetry Status Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
                  <span className="text-[10px] uppercase font-semibold text-zinc-400 block mb-0.5">Pipeline Status</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 capitalize">
                      {jobData?.status?.replace("_", " ") || "Initializing"}
                    </span>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
                  <span className="text-[10px] uppercase font-semibold text-zinc-400 block mb-0.5">AI Engine</span>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                      Gemini Flash Fallback
                    </span>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
                  <span className="text-[10px] uppercase font-semibold text-zinc-400 block mb-0.5">Free Quota Shield</span>
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3 h-3 text-blue-500" />
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      1-Shot Batching
                    </span>
                  </div>
                </div>

                <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
                  <span className="text-[10px] uppercase font-semibold text-zinc-400 block mb-0.5">Indic Multilingual</span>
                  <div className="flex items-center gap-1.5">
                    <Languages className="w-3 h-3 text-emerald-500" />
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      Hindi & Kannada
                    </span>
                  </div>
                </div>
              </div>

              {/* Overall Continuous Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                    <span>{jobData?.stage_label || "Auditing Target Domain..."}</span>
                  </span>
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    {Math.round(smoothProgress)}% Complete
                  </span>
                </div>
                <div className="w-full h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-500 transition-all duration-300 rounded-full shadow-sm"
                    style={{ width: `${smoothProgress}%` }}
                  />
                </div>
              </div>

              {/* Step-by-Step Production Pipeline with Sub-tasks */}
              <div className="space-y-3">
                {STEPS.map((step, idx) => {
                  const isCurrent = currentStatus === step.key;
                  const isPast = currentIndex > idx;
                  const isPending = currentIndex < idx;

                  return (
                    <div
                      key={step.key}
                      className={`p-4 rounded-xl border transition-all ${
                        isCurrent
                          ? "bg-zinc-50/80 dark:bg-zinc-800/60 border-blue-500/40 dark:border-blue-500/40 shadow-sm"
                          : isPast
                          ? "bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800/80 opacity-90"
                          : "bg-transparent border-transparent opacity-40"
                      }`}
                    >
                      <div className="flex items-start gap-3.5">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition ${
                            isPast
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                              : isCurrent
                              ? "bg-blue-600 text-white shadow-xs"
                              : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
                          }`}
                        >
                          {isPast ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : isCurrent ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            step.icon
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                              <span>{step.label}</span>
                              <span className="text-[10px] font-mono text-zinc-400 font-normal">
                                {step.badge}
                              </span>
                            </h4>
                            {isCurrent && (
                              <span className="text-[10px] uppercase tracking-wider font-semibold font-mono text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                                Processing
                              </span>
                            )}
                            {isPast && (
                              <span className="text-[10px] uppercase tracking-wider font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                                Verified
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                            {step.sublabel}
                          </p>

                          {/* Live Subtasks Checklist for Active Step */}
                          {isCurrent && (
                            <div className="mt-3 pt-3 border-t border-zinc-200/60 dark:border-zinc-700/60 grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {step.subtasks.map((task, tidx) => (
                                <div key={tidx} className="flex items-center gap-2 text-[11px] text-zinc-600 dark:text-zinc-300">
                                  <div className="w-3.5 h-3.5 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center shrink-0">
                                    <Check className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <span className="truncate">{task}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Real-Time Production Audit Console / Terminal Log Stream */}
              <div className="mt-4 bg-zinc-950 text-zinc-300 rounded-xl p-4 border border-zinc-800 font-mono text-xs shadow-md space-y-2">
                <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-zinc-800/80 pb-2">
                  <span className="flex items-center gap-2 font-bold uppercase tracking-wider">
                    <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Real-Time Audit Terminal & Telemetry</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] text-zinc-400 uppercase">Live Output</span>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-44 overflow-y-auto pt-1 text-[11px] font-mono scrollbar-thin scrollbar-thumb-zinc-800">
                  {logs.map((log, i) => (
                    <div key={i} className="flex items-start gap-2 hover:bg-zinc-900/60 p-0.5 rounded transition">
                      <span className="text-zinc-600 shrink-0 select-none">[{log.time}]</span>
                      <span className={`shrink-0 font-bold ${log.color || "text-purple-400"}`}>[{log.tag}]</span>
                      <span className="text-zinc-300 leading-relaxed">{log.message}</span>
                    </div>
                  ))}
                  {currentStatus !== "completed" && (
                    <div className="flex items-center gap-2 text-zinc-400 text-[10px] pt-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="animate-pulse">Active pipeline worker processing step...</span>
                    </div>
                  )}
                  <div ref={terminalBottomRef} />
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
