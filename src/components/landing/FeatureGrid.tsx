"use client";

import {
  Boxes,
  CalendarClock,
  ClipboardCheck,
  Columns3,
  DollarSign,
  FileBarChart2,
  Footprints,
  History,
  LayoutGrid,
  ShieldCheck,
  Spline,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Reveal, { Stagger, StaggerItem } from "@/components/site/Reveal";

type Tone = "accent" | "cyan" | "ai";

const TONES: Record<Tone, string> = {
  accent: "bg-accent-soft text-accent",
  cyan: "bg-cyan-soft text-cyan",
  ai: "bg-ai-soft text-ai",
};

const FEATURES: Array<{ icon: LucideIcon; title: string; copy: string; tone: Tone }> = [
  { icon: LayoutGrid, title: "AI Floor Planning", copy: "Grid options generated from your footprint and brief.", tone: "ai" },
  { icon: Columns3, title: "Smart Pillars", copy: "Placement guided by spacing and load rules.", tone: "accent" },
  { icon: Spline, title: "Auto Beam Detection", copy: "Beams inferred between supports as you design.", tone: "cyan" },
  { icon: ShieldCheck, title: "Structural Validation", copy: "Every element checked before it reaches site.", tone: "accent" },
  { icon: DollarSign, title: "Real-time Cost", copy: "Concrete, steel and finishes priced as you draw.", tone: "cyan" },
  { icon: Footprints, title: "3D Walkthrough", copy: "Step inside any floor before it exists.", tone: "ai" },
  { icon: UsersRound, title: "Cloud Collaboration", copy: "Everyone on the latest model, always.", tone: "accent" },
  { icon: History, title: "Version History", copy: "Roll back any decision without losing work.", tone: "cyan" },
  { icon: FileBarChart2, title: "AI Reports", copy: "BOQ and measurement exports written for humans.", tone: "ai" },
  { icon: CalendarClock, title: "Construction Scheduling", copy: "Sequence work from the structure itself.", tone: "accent" },
  { icon: Boxes, title: "Progress Tracking", copy: "Compare built reality against the plan.", tone: "cyan" },
  { icon: ClipboardCheck, title: "Site Inspection", copy: "Camera measurements filed against the model.", tone: "ai" },
];

export default function FeatureGrid() {
  return (
    <section id="features" className="border-b border-border bg-canvas-subtle py-section">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="section-eyebrow">Platform</p>
          <h2 className="mt-3 font-display text-section text-text-primary">
            Everything a building needs,
            <br />
            <span className="text-gradient-brand">before it exists.</span>
          </h2>
        </Reveal>

        <Stagger className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" gap={0.045}>
          {FEATURES.map((f) => (
            <StaggerItem key={f.title}>
              <div className="glass-card group h-full rounded-2xl p-5">
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 ease-out group-hover:scale-110 ${TONES[f.tone]}`}
                >
                  <f.icon size={17} />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold text-text-primary">
                  {f.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">{f.copy}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
