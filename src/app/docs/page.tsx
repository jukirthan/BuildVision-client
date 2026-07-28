import Link from "next/link";
import { BookOpen, Camera, Calculator, Box } from "lucide-react";
import PublicHeader from "@/components/site/PublicHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";

const SECTIONS = [
  {
    icon: Box,
    title: "3D Planner",
    copy: "Tools, keyboard shortcuts, snapping, view modes, and floor editing.",
  },
  {
    icon: Calculator,
    title: "Material Estimator",
    copy: "How quantities and costs are calculated from your structural model.",
  },
  {
    icon: Camera,
    title: "Camera Measurement",
    copy: "Calibration, accuracy notes, and exporting a measurement report.",
  },
  {
    icon: BookOpen,
    title: "API & Data Export",
    copy: "Project data formats — JSON, CSV, and PDF report structure.",
  },
];

export default function DocsPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <PublicHeader />
      <main className="pt-28 sm:pt-36">
        <section className="mx-auto max-w-content px-4 pb-24 sm:px-6 lg:px-8">
          <Reveal className="max-w-xl">
            <p className="section-eyebrow">Documentation</p>
            <h1 className="mt-3 text-display-xl text-text-primary">
              Guides for every part of the workspace.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-text-secondary">
              Full in-app tooltips and empty-state guidance are available once
              you&apos;re signed in. This page covers the high-level concepts.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-5 sm:grid-cols-2">
            {SECTIONS.map((s, i) => (
              <Reveal key={s.title} delay={i * 0.05}>
                <div className="card card-hover h-full p-5">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <s.icon size={18} />
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold text-text-primary">
                    {s.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                    {s.copy}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1} className="mt-10 text-sm text-text-tertiary">
            Need a walkthrough?{" "}
            <Link href="/contact" className="text-accent hover:underline">
              Contact us
            </Link>{" "}
            and we&apos;ll set up a demo.
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
