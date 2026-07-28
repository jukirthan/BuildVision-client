import {
  Box,
  Calculator,
  Camera,
  Layers3,
  Ruler,
  Sparkles,
  Users,
} from "lucide-react";
import PublicHeader from "@/components/site/PublicHeader";
import SiteFooter from "@/components/site/SiteFooter";
import Reveal from "@/components/site/Reveal";

const FEATURES = [
  {
    icon: Box,
    title: "3D structural planner",
    copy: "Place pillars, walls, beams, slabs, doors, windows, and stairs with live snapping and dependency checks. Orbit, walk-inside, section, and explode views included.",
  },
  {
    icon: Sparkles,
    title: "AI layout suggestions",
    copy: "Generate column and beam layout options for your footprint and apply the one that best fits load paths and spacing.",
  },
  {
    icon: Calculator,
    title: "Material & cost estimator",
    copy: "Live BOQ for concrete, steel, and finishes as you design, exportable as a report.",
  },
  {
    icon: Camera,
    title: "Camera measurement",
    copy: "Capture a photo from a webcam or phone, calibrate against a known reference length, and measure real-world distances directly on the image.",
  },
  {
    icon: Layers3,
    title: "Multi-floor editing",
    copy: "Isolate a floor, show all floors, or explode the stack to edit interiors without losing context.",
  },
  {
    icon: Users,
    title: "Team workspace",
    copy: "Keep projects, buildings, and reports organized for your whole team in one place.",
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-dvh bg-canvas">
      <PublicHeader />
      <main className="pt-28 sm:pt-36">
        <section className="mx-auto max-w-content px-4 pb-20 sm:px-6 lg:px-8">
          <Reveal className="max-w-2xl">
            <p className="section-eyebrow">Features</p>
            <h1 className="mt-3 text-display-xl text-text-primary">
              Everything you need to plan a structure.
            </h1>
            <p className="mt-5 text-base leading-relaxed text-text-secondary">
              Sign in to unlock the full workspace — the 3D planner, AI
              assistant, camera measurement, and reporting tools are only
              available to authenticated users.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={i * 0.04}>
                <div className="card card-hover h-full p-5">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
                    <f.icon size={18} />
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold text-text-primary">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                    {f.copy}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.1} className="mt-10 flex items-center gap-2 text-sm text-text-tertiary">
            <Ruler size={14} /> Full measurement accuracy details are in the
            documentation.
          </Reveal>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
