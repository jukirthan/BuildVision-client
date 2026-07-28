"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Bot,
  CheckCheck,
  FileOutput,
  LayoutGrid,
  Package,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Reveal, { Stagger, StaggerItem } from "@/components/site/Reveal";

const EASE = [0.16, 1, 0.3, 1] as const;

const CAPABILITIES = [
  {
    icon: LayoutGrid,
    title: "Generated floor plans",
    copy: "Column grids and slab layouts proposed from your footprint.",
  },
  {
    icon: ShieldCheck,
    title: "Structural suggestions",
    copy: "Span, load and spacing checks as you place every element.",
  },
  {
    icon: Package,
    title: "Material optimization",
    copy: "Cheaper, lighter alternatives with the same safety margin.",
  },
  {
    icon: CheckCheck,
    title: "Building validation",
    copy: "A full rule pass before anything reaches the site.",
  },
];

/** Columns for the generated plan preview — 6 × 4 grid. */
const PLAN_COLUMNS = Array.from({ length: 24 }).map((_, i) => ({
  cx: 40 + (i % 6) * 64,
  cy: 36 + Math.floor(i / 6) * 56,
}));

function PlanPreview() {
  const reduce = useReducedMotion();
  return (
    <svg
      viewBox="0 0 400 240"
      className="h-auto w-full"
      role="img"
      aria-label="AI-generated column grid for a 24 by 18 metre floor plate"
    >
      {/* Plate */}
      <rect x="16" y="12" width="368" height="216" rx="10" fill="#0f172a" />
      {/* Grid */}
      {Array.from({ length: 11 }).map((_, i) => (
        <line
          key={`v${i}`}
          x1={16 + 33.5 * (i + 0.5)}
          y1={12}
          x2={16 + 33.5 * (i + 0.5)}
          y2={228}
          stroke="rgba(148,187,255,0.09)"
          strokeWidth="1"
        />
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <line
          key={`h${i}`}
          x1={16}
          y1={12 + 30.8 * (i + 0.5)}
          x2={384}
          y2={12 + 30.8 * (i + 0.5)}
          stroke="rgba(148,187,255,0.09)"
          strokeWidth="1"
        />
      ))}
      {/* Beams between columns */}
      {PLAN_COLUMNS.map((c, i) =>
        i % 6 === 5 ? null : (
          <motion.line
            key={`b${i}`}
            x1={c.cx}
            y1={c.cy}
            x2={c.cx + 64}
            y2={c.cy}
            stroke="#2563eb"
            strokeOpacity="0.55"
            strokeWidth="2"
            initial={reduce ? undefined : { pathLength: 0 }}
            whileInView={reduce ? undefined : { pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 + i * 0.02, ease: EASE }}
          />
        )
      )}
      {/* Columns */}
      {PLAN_COLUMNS.map((c, i) => (
        <motion.rect
          key={i}
          x={c.cx - 5}
          y={c.cy - 5}
          width="10"
          height="10"
          rx="2"
          fill="#60a5fa"
          initial={reduce ? undefined : { opacity: 0, scale: 0 }}
          whileInView={reduce ? undefined : { opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, delay: 0.15 + i * 0.03, ease: EASE }}
          style={{ transformOrigin: `${c.cx}px ${c.cy}px` }}
        />
      ))}
      {/* Dimension line */}
      <line x1="40" y1="218" x2="360" y2="218" stroke="#06b6d4" strokeWidth="1" strokeDasharray="4 3" />
      <text x="200" y="212" textAnchor="middle" fill="#67e8f9" fontSize="9" fontFamily="monospace">
        24.0 m
      </text>
    </svg>
  );
}

export default function AIShowcase() {
  const reduce = useReducedMotion();

  return (
    <section id="ai" className="border-b border-border bg-canvas py-section">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="section-eyebrow">
            <Sparkles size={11} className="mr-1 inline -translate-y-px" />
            AI Showcase
          </p>
          <h2 className="mt-3 font-display text-section text-text-primary">
            An engineer that answers in <span className="text-gradient-brand">floor plans</span>.
          </h2>
          <p className="mt-4 text-body-lg text-text-secondary">
            Describe the building. BuildVision proposes the structure — then
            checks it, prices it, and explains why.
          </p>
        </Reveal>

        <div className="mt-14 grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
          {/* Conversation */}
          <Reveal direction="left">
            <div className="card overflow-hidden">
              <div className="flex items-center gap-2.5 border-b border-border px-5 py-3.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ai-soft text-ai">
                  <Bot size={15} />
                </span>
                <p className="text-sm font-semibold text-text-primary">AI Building Assistant</p>
                <span className="ml-auto flex items-center gap-1.5 text-[11px] text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" /> online
                </span>
              </div>

              <div className="space-y-4 px-5 py-6">
                <motion.div
                  initial={reduce ? undefined : { opacity: 0, y: 10 }}
                  whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, ease: EASE }}
                  className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm text-white"
                >
                  Generate a column layout for a 24 × 18 m footprint, 4 floors,
                  commercial loading.
                </motion.div>

                <motion.div
                  initial={reduce ? undefined : { opacity: 0, y: 10 }}
                  whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.25, ease: EASE }}
                  className="w-fit max-w-[90%] rounded-2xl rounded-bl-md border border-border bg-surface/60 px-4 py-3 text-sm text-text-primary"
                >
                  <p>
                    Proposing a <strong>6 × 4 balanced grid</strong> — 24 columns at
                    4.6 m spacing. All spans pass commercial load checks with a
                    1.6× safety factor.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {["24 columns", "38 beams", "4 slabs / floor", "$184k est."].map(
                      (chip) => (
                        <span
                          key={chip}
                          className="rounded-full border border-accent-border bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent"
                        >
                          {chip}
                        </span>
                      )
                    )}
                  </div>
                </motion.div>

                <motion.div
                  initial={reduce ? undefined : { opacity: 0 }}
                  whileInView={reduce ? undefined : { opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.6 }}
                  className="flex items-center gap-2 text-xs text-text-tertiary"
                >
                  <FileOutput size={13} />
                  Applied to Tower A · draft saved
                </motion.div>
              </div>
            </div>
          </Reveal>

          {/* Generated plan */}
          <Reveal direction="right" delay={0.1}>
            <div className="card overflow-hidden bg-ink p-2">
              <div className="flex items-center justify-between px-3 py-2">
                <p className="text-xs font-medium text-white/60">
                  Generated plan · Level 1
                </p>
                <span className="rounded-full bg-ai/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#c4b5fd]">
                  AI generated
                </span>
              </div>
              <PlanPreview />
            </div>
          </Reveal>
        </div>

        {/* Capability cards */}
        <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" gap={0.06}>
          {CAPABILITIES.map((cap) => (
            <StaggerItem key={cap.title}>
              <div className="glass-card h-full rounded-2xl p-5">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ai-soft text-ai">
                  <cap.icon size={17} />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold text-text-primary">
                  {cap.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                  {cap.copy}
                </p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
