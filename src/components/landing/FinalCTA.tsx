"use client";

import { ShieldCheck } from "lucide-react";
import MagneticButton from "@/components/site/MagneticButton";
import Reveal, { RevealText } from "@/components/site/Reveal";

export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden bg-ink py-section">
      <div className="aurora absolute inset-0 opacity-80" aria-hidden />
      <div className="blueprint-grid absolute inset-0 opacity-60" aria-hidden />
      <div
        className="absolute inset-0 bg-gradient-to-b from-ink via-transparent to-ink"
        aria-hidden
      />

      <div className="relative mx-auto flex max-w-content flex-col items-center px-4 text-center sm:px-6 lg:px-8">
        <Reveal direction="fade">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-cyan backdrop-blur">
            <ShieldCheck size={20} />
          </span>
        </Reveal>

        <h2 className="mt-7 max-w-3xl font-display text-section text-white">
          <RevealText text="The future of construction" />
          <br />
          <RevealText text="starts in your browser." delay={0.2} className="text-gradient-light" />
        </h2>

        <Reveal delay={0.4} className="mt-5 max-w-xl">
          <p className="text-body-lg text-white/60">
            Join thousands of architects and engineers designing intelligent
            buildings with BuildVision — free to start, nothing to install.
          </p>
        </Reveal>

        <Reveal delay={0.55} className="mt-9">
          <div className="flex flex-wrap items-center justify-center gap-3.5">
            <MagneticButton href="/signup">Start Designing</MagneticButton>
            <MagneticButton href="/contact" variant="ghost">
              Talk to sales
            </MagneticButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
