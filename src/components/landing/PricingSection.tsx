"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import Reveal, { Stagger, StaggerItem } from "@/components/site/Reveal";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type Cycle = "monthly" | "yearly";

const PLANS = [
  {
    name: "Starter",
    monthly: 0,
    yearly: 0,
    copy: "For individuals exploring the planner and demo tools.",
    cta: "Start free",
    features: [
      "1 active project",
      "3D structural planner",
      "Live cost estimator",
      "Community support",
    ],
  },
  {
    name: "Studio",
    monthly: 29,
    yearly: 23,
    copy: "For architecture and engineering teams shipping real projects.",
    cta: "Start 14-day trial",
    featured: true,
    features: [
      "Unlimited projects",
      "AI layout suggestions",
      "Camera measurement",
      "Team workspaces",
      "BOQ & report exports",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    monthly: null,
    yearly: null,
    copy: "For firms that need governance, security and scale.",
    cta: "Talk to sales",
    features: [
      "Everything in Studio",
      "SSO & audit logs",
      "Dedicated success manager",
      "Custom integrations",
      "SLA & onboarding",
    ],
  },
];

export default function PricingSection() {
  const [cycle, setCycle] = useState<Cycle>("yearly");
  const reduce = useReducedMotion();

  return (
    <section id="pricing" className="border-b border-border bg-canvas-subtle py-section">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="section-eyebrow">Pricing</p>
          <h2 className="mt-3 font-display text-section text-text-primary">
            Simple pricing that scales with your firm.
          </h2>

          {/* Billing toggle */}
          <div
            className="relative mx-auto mt-8 inline-flex items-center rounded-full border border-border bg-white p-1 shadow-xs"
            role="radiogroup"
            aria-label="Billing cycle"
          >
            {(["monthly", "yearly"] as const).map((c) => (
              <button
                key={c}
                role="radio"
                aria-checked={cycle === c}
                onClick={() => setCycle(c)}
                className={cn(
                  "relative z-[1] rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors",
                  cycle === c ? "text-white" : "text-text-secondary hover:text-text-primary"
                )}
              >
                {cycle === c && (
                  <motion.span
                    layoutId="cycle-pill"
                    className="absolute inset-0 -z-[1] rounded-full bg-accent"
                    transition={
                      reduce ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 32 }
                    }
                  />
                )}
                {c}
                {c === "yearly" && (
                  <span
                    className={cn(
                      "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                      cycle === "yearly" ? "bg-white/20 text-white" : "bg-success-soft text-success"
                    )}
                  >
                    −20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </Reveal>

        <Stagger className="mt-12 grid gap-5 lg:grid-cols-3" gap={0.08}>
          {PLANS.map((plan) => {
            const price = cycle === "monthly" ? plan.monthly : plan.yearly;
            return (
              <StaggerItem key={plan.name} className="h-full">
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-3xl border bg-white p-7 transition-shadow duration-300",
                    plan.featured
                      ? "border-accent shadow-glow"
                      : "border-border shadow-xs hover:shadow-md"
                  )}
                >
                  {plan.featured && (
                    <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-accent px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
                      <Sparkles size={11} /> Most popular
                    </span>
                  )}

                  <p className="font-display text-base font-semibold text-text-primary">
                    {plan.name}
                  </p>

                  <div className="mt-3 flex h-12 items-baseline gap-1.5">
                    {price === null ? (
                      <span className="font-display text-4xl font-semibold tracking-tight text-text-primary">
                        Custom
                      </span>
                    ) : (
                      <>
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span
                            key={`${plan.name}-${cycle}`}
                            initial={reduce ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={reduce ? undefined : { opacity: 0, y: -8 }}
                            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                            className="font-display text-4xl font-semibold tabular-nums tracking-tight text-text-primary"
                          >
                            ${price}
                          </motion.span>
                        </AnimatePresence>
                        <span className="text-sm text-text-tertiary">
                          / user / month
                          {cycle === "yearly" && price > 0 && ", billed yearly"}
                        </span>
                      </>
                    )}
                  </div>

                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">{plan.copy}</p>

                  <ul className="mt-6 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-text-secondary">
                        <Check size={15} className="mt-0.5 shrink-0 text-success" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button
                    href={plan.name === "Enterprise" ? "/contact" : "/signup"}
                    variant={plan.featured ? "primary" : "secondary"}
                    className="mt-7 w-full"
                    size="lg"
                  >
                    {plan.cta} <ArrowRight size={15} />
                  </Button>
                </div>
              </StaggerItem>
            );
          })}
        </Stagger>

        <Reveal delay={0.2} className="mt-8 text-center">
          <p className="text-sm text-text-tertiary">
            All plans include unlimited viewers. Education and non-profit discounts available.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
