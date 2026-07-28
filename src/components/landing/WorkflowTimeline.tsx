"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ClipboardList,
  DraftingCompass,
  Hammer,
  ScanSearch,
  Calculator,
  Users,
  type LucideIcon,
} from "lucide-react";
import Reveal from "@/components/site/Reveal";

const EASE = [0.16, 1, 0.3, 1] as const;

const STEPS: Array<{ icon: LucideIcon; title: string; copy: string }> = [
  { icon: ClipboardList, title: "Plan", copy: "Footprint, floors and site constraints" },
  { icon: DraftingCompass, title: "Design", copy: "Model the structure in 3D" },
  { icon: ScanSearch, title: "Analyze", copy: "Loads, spans and validation" },
  { icon: Calculator, title: "Estimate", copy: "Quantities and live cost" },
  { icon: Users, title: "Collaborate", copy: "One shared source of truth" },
  { icon: Hammer, title: "Build", copy: "Exports the site team can use" },
  { icon: Activity, title: "Monitor", copy: "Progress against the model" },
];

export default function WorkflowTimeline() {
  const reduce = useReducedMotion();

  return (
    <section className="border-b border-border bg-canvas py-section">
      <div className="mx-auto max-w-wide px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="section-eyebrow">Construction workflow</p>
          <h2 className="mt-3 font-display text-section text-text-primary">
            Brief to building, one unbroken line.
          </h2>
        </Reveal>

        <div className="touch-scroll mt-16 overflow-x-auto pb-4">
          <ol className="relative mx-auto flex min-w-[56rem] max-w-6xl items-start">
            {/* Track */}
            <div className="absolute left-[7%] right-[7%] top-6 h-px bg-border" aria-hidden />
            <motion.div
              className="absolute left-[7%] top-6 h-px bg-gradient-to-r from-accent via-cyan to-ai"
              style={{ maxWidth: "86%" }}
              initial={reduce ? { width: "86%" } : { width: 0 }}
              whileInView={{ width: "86%" }}
              viewport={{ once: true, margin: "-15% 0px" }}
              transition={{ duration: 1.6, ease: EASE }}
              aria-hidden
            />

            {STEPS.map((step, i) => (
              <motion.li
                key={step.title}
                className="relative flex flex-1 flex-col items-center px-2 text-center"
                initial={reduce ? undefined : { opacity: 0, y: 16 }}
                whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-15% 0px" }}
                transition={{ duration: 0.5, delay: i * 0.18, ease: EASE }}
              >
                <span className="relative z-[1] flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-white text-accent shadow-sm">
                  <step.icon size={18} />
                </span>
                <p className="mt-3 font-display text-sm font-semibold text-text-primary">
                  {step.title}
                </p>
                <p className="mt-1 max-w-[9rem] text-xs leading-snug text-text-tertiary">
                  {step.copy}
                </p>
              </motion.li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
