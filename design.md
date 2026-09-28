# GEOAuditor — Design Guidelines

## 1. Core Principle: No AI Slop

This is the single most important rule in this document. Nothing in the shipped UI should be decorative-only, fake, or non-functional. Concretely, **never**:

- Add glowing/pulsing "AI-themed" chrome (gradient blobs, sparkle icons, animated glow rings) that doesn't communicate real state.
- Ship a link, button, or nav item that doesn't go anywhere or do anything.
- Show invented social-proof numbers ("12,000+ audits run", "trusted by 500+ brands") when the real number is zero, unknown, or not tracked. If there's no real number, don't show one — or show the real one, even if it's small.
- Use fake/placeholder testimonials, logos, or reviews.
- Animate a progress bar or loading state that isn't reflecting real backend progress (see `flow.md` — progress must map to real job status).
- Pad the report with generic filler text ("Your website has great potential!") instead of specific, evidence-backed findings.

**Test for every UI element before it ships:** "If I click this, does something real happen? If this shows a number, is it real? If this claims something, can I point to the exact data behind it?" If the answer to any of these is no, cut it or fix it.

## 2. Visual Direction

- Clean, content-first dashboard — the data (score, findings, evidence) is the design, not decoration around it.
- Tailwind CSS, minimal custom animation. Motion is fine where it communicates real state (a spinner while `status !== completed`, a smooth score-count-up on report load) — not fine as ambient decoration.
- Typography-led hierarchy: one clear score number, clear section headers for Technical / AI Visibility / Action Plan, monospace or distinct styling for anything that's literal evidence (raw AI response snippets, extracted meta tags).

## 3. Key Screens

**Home / Landing**
- Single clear headline stating what the tool does.
- One URL input + one primary action button. No secondary CTAs competing for attention.
- Optional: a short, honest explanation of the 7-step process — not a wall of marketing copy.

**Progress View**
- Current real stage name, not a generic "Loading...".
- Estimated time only if you can back it with real historical data; otherwise omit it rather than guess.

**Report View**
- Composite score as the visual anchor (large number, 0–100).
- Technical Score / AI Visibility Score shown as two clearly labeled sub-scores with their weights (40% / 60%) visible, not hidden.
- Findings grouped by the 🔴 Critical / 🟡 Warning / 🟢 Opportunity severity system — consistent color coding used nowhere else in the UI (so it stays meaningful).
- Each finding shows: what was checked, what was found (with real extracted evidence — the actual meta tag, the actual missing schema type, the actual AI response excerpt), and the specific fix.

## 4. Color & Severity System

- Reserve red/yellow/green **only** for issue severity. Don't reuse them decoratively elsewhere in the UI, or the severity system loses meaning.
- Neutral base palette (grays/one accent color) for everything else — nav, cards, backgrounds.

## 5. Copy Tone

- Direct and specific, not hype-y. "Missing JSON-LD Organization schema" beats "Your brand identity signals could be stronger!"
- Every claim in the UI should be traceable to a real check result. If you can't point to the data behind a sentence, don't write that sentence.

## 6. Accessibility & Responsiveness

- All interactive elements keyboard-navigable, real focus states (not removed for aesthetics).
- Report view must be usable on mobile — findings should stack cleanly, not rely on wide side-by-side layouts that break below ~768px.
