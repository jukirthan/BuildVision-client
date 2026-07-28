"use client";

import {
  Building2,
  Factory,
  GraduationCap,
  HardHat,
  Home,
  Landmark,
  Route,
  Sofa,
  Trees,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { ArchImage } from "@/components/app/ArchMedia";
import type { BrandAssetKey } from "@/lib/brand-assets";
import Reveal, { Stagger, StaggerItem } from "@/components/site/Reveal";

const PHOTO_CARDS: Array<{
  title: string;
  copy: string;
  icon: LucideIcon;
  asset: BrandAssetKey;
}> = [
  {
    title: "Architecture",
    copy: "Concept massing with structure validated from the first sketch.",
    icon: Building2,
    asset: "hero",
  },
  {
    title: "Civil Engineering",
    copy: "Load paths, spans and quantities on one live model.",
    icon: HardHat,
    asset: "skyline",
  },
  {
    title: "Construction Companies",
    copy: "BOQs and site measurements the crew actually trusts.",
    icon: Warehouse,
    asset: "detail",
  },
  {
    title: "Real Estate",
    copy: "Feasibility studies priced before land changes hands.",
    icon: Home,
    asset: "modern",
  },
];

const ICON_CARDS: Array<{ title: string; copy: string; icon: LucideIcon }> = [
  { title: "Interior Design", copy: "Full-height interiors inside real structure.", icon: Sofa },
  { title: "Government Projects", copy: "Transparent quantities for public tenders.", icon: Landmark },
  { title: "Education", copy: "Teach structural behaviour interactively.", icon: GraduationCap },
  { title: "Smart Cities", copy: "Blocks and districts, not just buildings.", icon: Trees },
  { title: "Infrastructure", copy: "Utility structures and support works.", icon: Route },
  { title: "Industrial", copy: "Warehouses and long-span frames.", icon: Factory },
];

export default function SolutionsSection() {
  return (
    <section id="solutions" className="border-b border-border bg-canvas-subtle py-section">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <Reveal className="max-w-2xl">
          <p className="section-eyebrow">Industry solutions</p>
          <h2 className="mt-3 font-display text-section text-text-primary">
            One platform, every discipline on site.
          </h2>
        </Reveal>

        <Stagger className="mt-14 grid gap-4 sm:grid-cols-2" gap={0.08}>
          {PHOTO_CARDS.map((card) => (
            <StaggerItem key={card.title}>
              <div className="group relative h-64 overflow-hidden rounded-3xl border border-border shadow-sm">
                <ArchImage
                  asset={card.asset}
                  className="absolute inset-0"
                  imageClassName="transition-transform duration-700 ease-out group-hover:scale-105"
                  sizes="(max-width: 640px) 100vw, 50vw"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-[#020617]/85 via-[#020617]/35 to-transparent"
                  aria-hidden
                />
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white backdrop-blur">
                    <card.icon size={16} />
                  </span>
                  <h3 className="mt-3 font-display text-lg font-semibold text-white">
                    {card.title}
                  </h3>
                  <p className="mt-1 max-w-sm text-sm leading-relaxed text-white/70">
                    {card.copy}
                  </p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        <Stagger className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" gap={0.05}>
          {ICON_CARDS.map((card) => (
            <StaggerItem key={card.title}>
              <div className="glass-card flex h-full items-start gap-3.5 rounded-2xl p-5">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <card.icon size={17} />
                </span>
                <div>
                  <h3 className="font-display text-base font-semibold text-text-primary">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-text-secondary">{card.copy}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
