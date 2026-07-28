"use client";

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Box,
  Columns3,
  Eye,
  Grid3X3,
  Layers,
  MousePointer2,
  Redo2,
  Ruler,
  Sparkles,
  Spline,
  Square,
  Undo2,
} from "lucide-react";
import Reveal from "@/components/site/Reveal";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const TOOLS = [
  { icon: MousePointer2, label: "Select", active: true },
  { icon: Square, label: "Wall" },
  { icon: Columns3, label: "Pillar" },
  { icon: Spline, label: "Beam" },
  { icon: Box, label: "Slab" },
  { icon: Ruler, label: "Measure" },
];

const VIEWS = ["Perspective", "Top", "Front", "Section"] as const;

const LAYERS = [
  { name: "Foundation", on: true },
  { name: "Columns", on: true },
  { name: "Beams", on: true },
  { name: "Walls", on: true },
  { name: "Slabs", on: true },
  { name: "Roof", on: false },
];

/** Isometric structural frame drawn in SVG — reads as CAD, costs nothing. */
function IsoFrame({ view }: { view: (typeof VIEWS)[number] }) {
  const reduce = useReducedMotion();

  if (view === "Top") {
    return (
      <svg viewBox="0 0 360 240" className="h-full w-full" aria-hidden>
        <rect x="60" y="30" width="240" height="180" fill="none" stroke="#2563eb" strokeWidth="1.5" />
        {[0, 1, 2, 3].map((r) =>
          [0, 1, 2, 3, 4].map((c) => (
            <rect
              key={`${r}${c}`}
              x={60 + c * 60 - 4}
              y={30 + r * 60 - 4}
              width="8"
              height="8"
              fill="#60a5fa"
            />
          ))
        )}
        {[0, 1, 2, 3].map((r) => (
          <line key={r} x1="60" y1={30 + r * 60} x2="300" y2={30 + r * 60} stroke="#1d4ed8" strokeOpacity="0.6" />
        ))}
        {[0, 1, 2, 3, 4].map((c) => (
          <line key={c} x1={60 + c * 60} y1="30" x2={60 + c * 60} y2="210" stroke="#1d4ed8" strokeOpacity="0.6" />
        ))}
        <text x="180" y="228" textAnchor="middle" fill="#67e8f9" fontSize="9" fontFamily="monospace">24.0 m</text>
      </svg>
    );
  }

  if (view === "Front" || view === "Section") {
    const floors = [0, 1, 2, 3];
    return (
      <svg viewBox="0 0 360 240" className="h-full w-full" aria-hidden>
        {floors.map((f) => (
          <g key={f}>
            <rect
              x="70"
              y={190 - f * 42 - 8}
              width="220"
              height="8"
              fill={view === "Section" && f === 1 ? "#7c3aed" : "#2563eb"}
              opacity="0.9"
            />
            {[0, 1, 2, 3, 4].map((c) => (
              <rect key={c} x={70 + c * 53} y={190 - f * 42 - 42} width="5" height="42" fill="#475569" />
            ))}
          </g>
        ))}
        <line x1="60" y1="198" x2="300" y2="198" stroke="#64748b" strokeWidth="2" />
        <text x="310" y="130" fill="#67e8f9" fontSize="9" fontFamily="monospace" transform="rotate(90 310 130)">
          14.5 m
        </text>
      </svg>
    );
  }

  // Perspective — isometric frame
  const iso = (x: number, y: number, z: number): [number, number] => [
    180 + (x - y) * 26,
    150 + (x + y) * 13 - z * 30,
  ];
  const cols: JSX.Element[] = [];
  const beams: JSX.Element[] = [];
  const plates: JSX.Element[] = [];

  for (let level = 0; level < 3; level++) {
    // slabs
    const [ax, ay] = iso(0, 0, level * 1.4);
    const [bx, by] = iso(4, 0, level * 1.4);
    const [cx2, cy2] = iso(4, 3, level * 1.4);
    const [dx, dy] = iso(0, 3, level * 1.4);
    plates.push(
      <motion.polygon
        key={`p${level}`}
        points={`${ax},${ay} ${bx},${by} ${cx2},${cy2} ${dx},${dy}`}
        fill={level === 2 ? "rgba(96,165,250,0.16)" : "rgba(37,99,235,0.22)"}
        stroke="#3b82f6"
        strokeWidth="1.2"
        initial={reduce ? undefined : { opacity: 0 }}
        whileInView={reduce ? undefined : { opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 + level * 0.25, duration: 0.5, ease: EASE }}
      />
    );
    // columns to next level
    for (const [gx, gy] of [
      [0, 0],
      [4, 0],
      [4, 3],
      [0, 3],
      [2, 0],
      [2, 3],
    ] as const) {
      const [x1, y1] = iso(gx, gy, level * 1.4);
      const [x2, y2] = iso(gx, gy, level * 1.4 + 1.4);
      cols.push(
        <motion.line
          key={`c${level}-${gx}-${gy}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#94a3b8"
          strokeWidth="2.4"
          initial={reduce ? undefined : { pathLength: 0 }}
          whileInView={reduce ? undefined : { pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 + level * 0.25, duration: 0.4, ease: EASE }}
        />
      );
    }
    // edge beams on top of this level
    const pts: Array<[[number, number, number], [number, number, number]]> = [
      [
        [0, 0, level * 1.4 + 1.4],
        [4, 0, level * 1.4 + 1.4],
      ],
      [
        [4, 0, level * 1.4 + 1.4],
        [4, 3, level * 1.4 + 1.4],
      ],
      [
        [0, 3, level * 1.4 + 1.4],
        [4, 3, level * 1.4 + 1.4],
      ],
      [
        [0, 0, level * 1.4 + 1.4],
        [0, 3, level * 1.4 + 1.4],
      ],
    ];
    pts.forEach(([a, b], i) => {
      const [x1, y1] = iso(...a);
      const [x2, y2] = iso(...b);
      beams.push(
        <motion.line
          key={`b${level}-${i}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="#2563eb"
          strokeWidth="2"
          initial={reduce ? undefined : { pathLength: 0 }}
          whileInView={reduce ? undefined : { pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.35 + level * 0.25, duration: 0.45, ease: EASE }}
        />
      );
    });
  }

  return (
    <svg viewBox="0 0 360 240" className="h-full w-full" aria-hidden>
      {/* ground grid */}
      {Array.from({ length: 9 }).map((_, i) => {
        const [x1, y1] = iso(i - 2, -2, 0);
        const [x2, y2] = iso(i - 2, 5, 0);
        return <line key={`gx${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(148,187,255,0.12)" />;
      })}
      {Array.from({ length: 8 }).map((_, i) => {
        const [x1, y1] = iso(-2, i - 2, 0);
        const [x2, y2] = iso(6, i - 2, 0);
        return <line key={`gy${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(148,187,255,0.12)" />;
      })}
      {plates}
      {cols}
      {beams}
      {/* dimension */}
      <text x="290" y="215" fill="#67e8f9" fontSize="9" fontFamily="monospace">
        4.6 m grid
      </text>
    </svg>
  );
}

export default function PlannerMockup() {
  const [view, setView] = useState<(typeof VIEWS)[number]>("Perspective");

  return (
    <section id="planner" className="border-b border-border bg-canvas-subtle py-section">
      <div className="mx-auto max-w-wide px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="section-eyebrow">3D Planner</p>
          <h2 className="mt-3 font-display text-section text-text-primary">
            A full CAD workspace, zero installs.
          </h2>
          <p className="mt-4 text-body-lg text-text-secondary">
            Pillars, beams, walls, slabs and roofs — placed by drag and drop,
            checked by engineering rules, priced in real time.
          </p>
        </Reveal>

        <Reveal delay={0.15} direction="scale" className="mt-14">
          <div className="overflow-hidden rounded-3xl border border-ink-border bg-ink shadow-xl">
            {/* Toolbar */}
            <div className="flex items-center gap-1 border-b border-white/[0.07] px-3 py-2.5">
              <div className="mr-2 flex items-center gap-1.5 pl-1" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
              </div>
              <div className="flex items-center gap-0.5 rounded-lg bg-white/[0.05] p-1">
                {TOOLS.map((t) => (
                  <span
                    key={t.label}
                    title={t.label}
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-md",
                      t.active ? "bg-accent text-white" : "text-white/50"
                    )}
                  >
                    <t.icon size={14} />
                  </span>
                ))}
              </div>
              <div className="ml-2 hidden items-center gap-0.5 rounded-lg bg-white/[0.05] p-1 sm:flex">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white/50">
                  <Undo2 size={14} />
                </span>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-md text-white/25">
                  <Redo2 size={14} />
                </span>
              </div>
              {/* View tabs */}
              <div
                className="ml-auto flex items-center gap-0.5 rounded-lg bg-white/[0.05] p-1"
                role="tablist"
                aria-label="Viewport view"
              >
                {VIEWS.map((v) => (
                  <button
                    key={v}
                    role="tab"
                    aria-selected={view === v}
                    onClick={() => setView(v)}
                    className={cn(
                      "rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors",
                      view === v ? "bg-accent text-white" : "text-white/50 hover:text-white/80"
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid lg:grid-cols-[13rem_1fr_15rem]">
              {/* Layers panel */}
              <aside className="hidden border-r border-white/[0.07] p-4 lg:block">
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                  <Layers size={12} /> Layers
                </p>
                <ul className="mt-3 space-y-1">
                  {LAYERS.map((l) => (
                    <li
                      key={l.name}
                      className="flex items-center justify-between rounded-md px-2 py-1.5 text-xs text-white/70 hover:bg-white/[0.05]"
                    >
                      {l.name}
                      <Eye size={12} className={l.on ? "text-white/60" : "text-white/20"} />
                    </li>
                  ))}
                </ul>
                <p className="mt-5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                  <Grid3X3 size={12} /> Grid
                </p>
                <p className="mt-2 rounded-md bg-white/[0.05] px-2 py-1.5 font-mono text-[11px] text-white/60">
                  0.5 m · snap on
                </p>
              </aside>

              {/* Viewport */}
              <div className="relative aspect-[16/10] sm:aspect-[16/9] lg:aspect-auto lg:min-h-[26rem]">
                <div className="blueprint-grid absolute inset-0 opacity-60" aria-hidden />
                <IsoFrame view={view} />
                {/* Scan line */}
                <div className="pointer-events-none absolute inset-x-10 top-0 h-full overflow-hidden" aria-hidden>
                  <div className="h-px w-full animate-scan bg-gradient-to-r from-transparent via-cyan/60 to-transparent" />
                </div>
                {/* AI suggestion toast */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 1.2, duration: 0.4, ease: EASE }}
                  className="glass-ink absolute bottom-4 left-4 flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
                >
                  <Sparkles size={14} className="text-[#c4b5fd]" />
                  <p className="text-xs text-white/80">
                    AI: beam B-12 span exceeds 6 m —{" "}
                    <span className="font-semibold text-white">add a pillar?</span>
                  </p>
                </motion.div>
                {/* Mini map */}
                <div className="glass-ink absolute bottom-4 right-4 hidden h-20 w-28 rounded-lg p-1.5 sm:block" aria-hidden>
                  <div className="relative h-full w-full rounded border border-white/10">
                    <div className="absolute left-1/4 top-1/4 h-1/2 w-1/2 rounded-sm border border-accent bg-accent/20" />
                  </div>
                </div>
              </div>

              {/* Properties panel */}
              <aside className="hidden border-l border-white/[0.07] p-4 lg:block">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">
                  Properties · Pillar P-14
                </p>
                <dl className="mt-3 space-y-2.5">
                  {[
                    ["Section", "400 × 400 mm"],
                    ["Height", "3.50 m"],
                    ["Material", "Concrete M30"],
                    ["Load capacity", "1,240 kN"],
                    ["Utilisation", "64%"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between gap-2">
                      <dt className="text-xs text-white/45">{k}</dt>
                      <dd className="font-mono text-xs text-white/85">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan"
                    initial={{ width: 0 }}
                    whileInView={{ width: "64%" }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.6, duration: 0.8, ease: EASE }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] text-emerald-300/80">Within safe limits</p>

                <p className="mt-5 text-[11px] font-semibold uppercase tracking-wide text-white/40">
                  Material library
                </p>
                <div className="mt-2.5 grid grid-cols-4 gap-1.5" aria-hidden>
                  {["#64748b", "#94a3b8", "#78716c", "#a16207", "#0e7490", "#334155", "#7c3aed", "#2563eb"].map(
                    (c) => (
                      <span key={c} className="aspect-square rounded-md border border-white/10" style={{ background: c }} />
                    )
                  )}
                </div>
              </aside>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
