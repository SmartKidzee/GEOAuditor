import { jsPDF } from "jspdf";
import { ReportData } from "./types";

export interface PdfExportMeta {
  organizationName: string;
  targetName: string;
  subtitle: string;
  customNotes: string;
}

function cleanPdfText(text: string): string {
  // Standard PDF Helvetica supports Latin-1; normalize dashes/quotes and strip non-Latin-1 glyphs
  // so multilingual queries or symbols never render as broken boxes.
  return (text || "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2022/g, "*")
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function scoreRgb(score: number | null): [number, number, number] {
  if (score === null) return [100, 116, 139]; // slate-500
  if (score >= 80) return [5, 150, 105]; // emerald-600
  if (score >= 50) return [217, 119, 6]; // amber-600
  return [225, 29, 72]; // rose-600
}

function severityRgb(sev: string): [number, number, number] {
  if (sev === "critical") return [225, 29, 72];
  if (sev === "warning") return [217, 119, 6];
  return [5, 150, 105];
}

export function generateAuditPdf(report: ReportData, meta: PdfExportMeta): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let y = 0;

  const ensureSpace = (neededMm: number) => {
    if (y + neededMm > pageHeight - 18) {
      doc.addPage();
      y = 16;
    }
  };

  const drawSectionHeader = (title: string) => {
    ensureSpace(14);
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(margin, y, contentWidth, 7.5, 1.5, 1.5, "F");
    doc.setFillColor(79, 70, 229); // indigo-600 accent bar
    doc.rect(margin, y, 2.2, 7.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(cleanPdfText(title).toUpperCase(), margin + 5, y + 5.1);
    y += 11;
  };

  const writeWrapped = (
    text: string,
    x: number,
    maxWidth: number,
    fontSize = 8.5,
    color: [number, number, number] = [51, 65, 85],
    bold = false
  ) => {
    const cleaned = cleanPdfText(text);
    if (!cleaned) return;
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(cleaned, maxWidth) as string[];
    const lineH = fontSize * 0.44;
    for (const line of lines) {
      ensureSpace(lineH + 2);
      doc.text(line, x, y);
      y += lineH;
    }
  };

  // --- TOP NAVY HEADER BANNER ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 34, "F");
  doc.setFillColor(79, 70, 229); // indigo-600 thin bottom trim
  doc.rect(0, 34, pageWidth, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(165, 180, 252); // indigo-300
  doc.text("EXECUTIVE GENERATIVE ENGINE OPTIMIZATION (GEO) AUDIT", margin, 10);

  doc.setFontSize(17);
  doc.setTextColor(255, 255, 255);
  doc.text(cleanPdfText(meta.organizationName || "GEOAuditor"), margin, 18.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(cleanPdfText(meta.subtitle || "AI Brand Visibility & Technical Readiness Report"), margin, 25.5);

  // Right metadata block in header
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  const dateStr = new Date(report.created_at || Date.now()).toISOString().slice(0, 10);
  doc.text(`Target: ${cleanPdfText(report.domain)}`, pageWidth - margin, 12, { align: "right" });
  doc.text(`Brand: ${cleanPdfText(meta.targetName || report.brand_name)}`, pageWidth - margin, 17.5, { align: "right" });
  doc.text(`Date: ${dateStr}`, pageWidth - margin, 23, { align: "right" });
  doc.text(`Audit Ref: ${report.job_id.slice(0, 12)}`, pageWidth - margin, 28.5, { align: "right" });

  y = 42;

  // --- EXECUTIVE SUMMARY ---
  drawSectionHeader("Executive Summary");
  writeWrapped(meta.customNotes, margin, contentWidth, 8.5, [51, 65, 85]);
  y += 3;

  // --- PRIMARY SCORECARDS (3 cards) ---
  ensureSpace(28);
  const cardGap = 4;
  const cardW = (contentWidth - cardGap * 2) / 3;
  const cards = [
    {
      label: "COMPOSITE GEO SCORE",
      value: `${report.composite_score}`,
      suffix: "/100",
      sub:
        report.weight_ai_visibility > 0
          ? `${Math.round(report.weight_technical * 100)}% Tech + ${Math.round(report.weight_ai_visibility * 100)}% AI`
          : "Technical only",
      color: scoreRgb(report.composite_score),
    },
    {
      label: "TECHNICAL READINESS",
      value: `${report.technical_score}`,
      suffix: "/100",
      sub: "RFC 9309, Schema, /llms.txt",
      color: scoreRgb(report.technical_score),
    },
    {
      label: "AI VISIBILITY",
      value: report.ai_visibility_score === null ? "N/A" : `${report.ai_visibility_score}`,
      suffix: report.ai_visibility_score === null ? "" : "/100",
      sub: "Multi-probe Gemini signal",
      color: scoreRgb(report.ai_visibility_score),
    },
  ];

  cards.forEach((c, idx) => {
    const cx = margin + idx * (cardW + cardGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(cx, y, cardW, 24, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(c.label, cx + cardW / 2, y + 6, { align: "center" });

    doc.setFontSize(16);
    doc.setTextColor(...c.color);
    doc.text(`${c.value}${c.suffix}`, cx + cardW / 2, y + 14.5, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(c.sub, cx + cardW / 2, y + 20.5, { align: "center" });
  });
  y += 29;

  // --- AI VISIBILITY & ATTRIBUTION METRICS ---
  drawSectionHeader("AI Visibility & Brand Perception");
  const ai = report.ai_visibility_findings;
  ensureSpace(16);
  const kpis = [
    { label: "Organic Mention Rate", val: report.ai_visibility_score === null ? "N/A" : `${ai.mention_rate ?? 0}%` },
    { label: "Top-3 Rate", val: report.ai_visibility_score === null ? "N/A" : `${ai.recommendation_rate ?? 0}%` },
    { label: "Domain Citation Rate", val: report.ai_visibility_score === null ? "N/A" : `${ai.brand_citation_rate ?? 0}%` },
    { label: "Brand Perception", val: (ai.perception?.verdict || "unavailable").toUpperCase() },
  ];
  const kpiW = (contentWidth - 9) / 4;
  kpis.forEach((k, idx) => {
    const kx = margin + idx * (kpiW + 3);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(kx, y, kpiW, 14, 1.5, 1.5, "FD");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(k.label, kx + 3, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(k.val, kx + 3, y + 11);
  });
  y += 18;

  if (ai.perception?.model_description) {
    writeWrapped(`AI Perception Summary: ${ai.perception.model_description}`, margin, contentWidth, 8.2, [51, 65, 85]);
    if (ai.perception.explanation) {
      writeWrapped(`Fact-Check Verdict: ${ai.perception.explanation}`, margin, contentWidth, 8, [79, 70, 229], true);
    }
    y += 2;
  }

  // Brand Comparison & Trust Deep-Dive probes
  const deepDive = (ai.queries || []).filter(
    (q) => q.probe_type === "brand_comparison" || q.probe_type === "brand_reputation"
  );
  if (deepDive.length > 0) {
    for (const q of deepDive) {
      writeWrapped(`${q.intent_name}: ${q.evidence_excerpt}`, margin, contentWidth, 8, [51, 65, 85]);
      y += 1;
    }
    y += 2;
  }

  // --- MULTILINGUAL BENCHMARKS ---
  if (ai.multilingual_breakdown && ai.multilingual_breakdown.length > 0) {
    drawSectionHeader("Multilingual Market Visibility (EN / HI / KN)");
    ensureSpace(12);
    doc.setFillColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, 6.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text("Market & Language", margin + 3, y + 4.4);
    doc.text("Runs", margin + 78, y + 4.4);
    doc.text("Surfaced", margin + 98, y + 4.4);
    doc.text("Benchmark Reference", margin + 122, y + 4.4);
    y += 6.5;

    for (const item of ai.multilingual_breakdown) {
      ensureSpace(7);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 6, margin + contentWidth, y + 6);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.8);
      doc.setTextColor(51, 65, 85);
      doc.text(cleanPdfText(item.market), margin + 3, y + 4.2);
      doc.text(String(item.queries_evaluated), margin + 78, y + 4.2);
      doc.text(
        item.status === "unavailable" ? "N/A" : `${item.mentions ?? 0}/${item.queries_evaluated}`,
        margin + 98,
        y + 4.2
      );
      doc.text(cleanPdfText(item.benchmark_reference).slice(0, 34), margin + 122, y + 4.2);
      y += 6.5;
    }
    y += 4;
  }

  // --- COMPETITOR SHARE OF VOICE ---
  const sovEntries = Object.entries(ai.competitor_share_of_voice || {});
  if (sovEntries.length > 0) {
    drawSectionHeader("Competitor Share of Voice");
    for (const [name, pct] of sovEntries.slice(0, 6)) {
      ensureSpace(7);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(cleanPdfText(name).slice(0, 26), margin, y + 3.5);

      const barX = margin + 48;
      const barMax = contentWidth - 65;
      doc.setFillColor(226, 232, 240);
      doc.roundedRect(barX, y + 0.8, barMax, 3.2, 1, 1, "F");

      const isSelf = name.toLowerCase() === (report.brand_name || "").toLowerCase();
      doc.setFillColor(...(isSelf ? ([79, 70, 229] as [number, number, number]) : ([100, 116, 139] as [number, number, number])));
      const w = Math.max(2, (Math.min(100, pct) / 100) * barMax);
      doc.roundedRect(barX, y + 0.8, w, 3.2, 1, 1, "F");

      doc.setFont("helvetica", "bold");
      doc.text(`${pct}%`, margin + contentWidth, y + 3.5, { align: "right" });
      y += 6.2;
    }
    y += 3;
  }

  // --- TECHNICAL READINESS SIGNALS ---
  drawSectionHeader("Technical Machine-Readability Signals");
  const tf = report.technical_findings;
  const techChecks = [
    tf.crawlability_bots,
    tf.json_ld_schema,
    tf.metadata_headings,
    tf.semantic_html,
  ];
  for (const chk of techChecks) {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${cleanPdfText(chk.name)} (${chk.score}/${chk.max_score})`, margin, y + 3);
    const badgeColor =
      chk.status === "pass" ? ([5, 150, 105] as [number, number, number]) : chk.status === "warn" ? ([217, 119, 6] as [number, number, number]) : ([225, 29, 72] as [number, number, number]);
    doc.setTextColor(...badgeColor);
    doc.text(chk.status.toUpperCase(), margin + contentWidth, y + 3, { align: "right" });
    y += 5;
    writeWrapped(chk.details, margin + 2, contentWidth - 4, 7.8, [71, 85, 105]);
    y += 2;
  }

  // --- PRIORITIZED ACTION PLAN ---
  drawSectionHeader("Prioritized Action Plan");
  if (report.issues.length === 0) {
    writeWrapped("No critical or warning issues detected.", margin, contentWidth, 8.5, [5, 150, 105]);
  } else {
    for (const issue of report.issues.slice(0, 6)) {
      ensureSpace(16);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.3);
      doc.setTextColor(...severityRgb(issue.severity));
      doc.text(`[${issue.severity.toUpperCase()}]`, margin, y + 3);
      doc.setTextColor(15, 23, 42);
      doc.text(cleanPdfText(issue.title).slice(0, 72), margin + 22, y + 3);
      y += 5;
      writeWrapped(`Finding: ${issue.detail}`, margin + 2, contentWidth - 4, 7.8, [71, 85, 105]);
      writeWrapped(`Fix: ${issue.recommendation}`, margin + 2, contentWidth - 4, 7.8, [30, 41, 59], true);
      y += 2.5;
    }
  }

  // --- GDPR COMPLIANCE & DATA PRIVACY NOTICE ---
  drawSectionHeader("GDPR Compliance & Data Privacy Notice");
  ensureSpace(32);
  doc.setFillColor(240, 253, 244); // emerald-50
  doc.setDrawColor(167, 243, 208); // emerald-200
  doc.roundedRect(margin, y, contentWidth, 29, 2, 2, "FD");
  y += 5;
  writeWrapped(
    "Data Minimization (EU GDPR Art. 5(1)(c)): This diagnostic processes solely publicly accessible web metadata (HTML structure, robots.txt, sitemap.xml, llms.txt) and synthetic category/brand AI queries. Zero personal data (PII), user tracking cookies, or visitor profiles are collected or stored.",
    margin + 3,
    contentWidth - 6,
    7.6,
    [20, 83, 45]
  );
  y += 1;
  writeWrapped(
    `Lawful Basis & Retention (Art. 6(1)(f) / Art. 17): Executed on-demand for technical & brand visibility auditing. Audit records are keyed strictly by anonymous UUID (${report.job_id}) without third-party data brokering or advertising resale.`,
    margin + 3,
    contentWidth - 6,
    7.6,
    [20, 83, 45]
  );
  y += 5;

  // --- PAGE NUMBERS & FOOTER ON EVERY PAGE ---
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `GEOAuditor Executive Report | ${cleanPdfText(report.domain)} | GDPR-Compliant Diagnostic`,
      margin,
      pageHeight - 7
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 7, { align: "right" });
  }

  const fileSlug = (report.domain || "audit").replace(/[^a-zA-Z0-9.-]+/g, "-");
  doc.save(`geoauditor-report-${fileSlug}-${dateStr}.pdf`);
}

