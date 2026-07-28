"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Pause, Play } from "lucide-react";
import Reveal from "@/components/site/Reveal";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

const STAGES = ["Foundation", "Structure", "Walls", "Roof", "Materials", "Lighting"] as const;
const STAGE_MS = 2400;

/**
 * Building elevation that assembles stage by stage.
 * `stage` is the index into STAGES; every group knows when to appear.
 */
function BuildingStage({ stage }: { stage: number }) {
  const material = stage >= 4;
  const lit = stage >= 5;

  const show = (from: number) => ({
    opacity: stage >= from ? 1 : 0,
    y: stage >= from ? 0 : 14,
  });

  const floors = [0, 1, 2];

  return (
    <svg viewBox="0 0 480 300" className="h-auto w-full" role="img" aria-label={`Demo building — ${STAGES[stage]}`}>
      {/* Sky changes when lighting stage lands */}
      <motion.rect
        x="0"
        y="0"
        width="480"
        height="300"
        animate={{ fill: lit ? "#1e1b4b" : "#020617" }}
        transition={{ duration: 1 }}
      />
      {lit && (
        <motion.circle
          cx="392"
          cy="66"
          r="20"
          fill="#fbbf24"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.9 }}
          transition={{ duration: 1 }}
        />
      )}

      {/* Ground */}
      <motion.g animate={show(0)} transition={{ duration: 0.6, ease: EASE }}>
        <rect x="0" y="252" width="480" height="48" fill="#0f172a" />
        <line x1="0" y1="252" x2="480" y2="252" stroke="#334155" strokeWidth="1.5" />
        <rect x="118" y="240" width="244" height="12" rx="2" fill={material ? "#44403c" : "#1d4ed8"} />
      </motion.g>

      {/* Structure: columns + plates */}
      <motion.g animate={show(1)} transition={{ duration: 0.6, ease: EASE }}>
        {floors.map((f) => (
          <g key={f}>
            {[0, 1, 2, 3, 4].map((c) => (
              <motion.rect
                key={c}
                x={128 + c * 55}
                y={240 - (f + 1) * 56}
                width="7"
                height="56"
                animate={{ fill: material ? "#78716c" : "#475569" }}
                transition={{ duration: 0.8 }}
              />
            ))}
            <motion.rect
              x="120"
              y={240 - (f + 1) * 56 - 9}
              width="240"
              height="9"
              rx="1.5"
              animate={{ fill: material ? "#a8a29e" : "#2563eb" }}
              transition={{ duration: 0.8 }}
            />
          </g>
        ))}
      </motion.g>

      {/* Walls / glazing */}
      <motion.g animate={show(2)} transition={{ duration: 0.6, ease: EASE }}>
        {floors.map((f) =>
          [0, 1, 2, 3].map((c) => (
            <motion.rect
              key={`${f}${c}`}
              x={137 + c * 55}
              y={240 - (f + 1) * 56 + 8}
              width="46"
              height="40"
              rx="2"
              animate={{
                fill: lit
                  ? "rgba(251,191,36,0.5)"
                  : material
                    ? "rgba(103,232,249,0.28)"
                    : "rgba(96,165,250,0.18)",
                stroke: material ? "#67e8f9" : "#3b82f6",
              }}
              strokeWidth="1"
              transition={{ duration: 0.8 }}
            />
          ))
        )}
      </motion.g>

      {/* Roof */}
      <motion.g animate={show(3)} transition={{ duration: 0.6, ease: EASE }}>
        <motion.rect
          x="114"
          y={240 - 3 * 56 - 20}
          width="252"
          height="12"
          rx="3"
          animate={{ fill: material ? "#57534e" : "#1e40af" }}
          transition={{ duration: 0.8 }}
        />
        <rect x="150" y={240 - 3 * 56 - 34} width="30" height="14" rx="2" fill="#334155" />
        <rect x="310" y={240 - 3 * 56 - 30} width="14" height="10" rx="2" fill="#334155" />
      </motion.g>

      {/* Blueprint dimension while unbuilt */}
      <motion.g animate={{ opacity: stage < 4 ? 1 : 0 }} transition={{ duration: 0.5 }}>
        <line x1="380" y1="240" x2="380" y2="72" stroke="#06b6d4" strokeWidth="1" strokeDasharray="4 3" />
        <text x="390" y="160" fill="#67e8f9" fontSize="10" fontFamily="monospace">
          14.5 m
        </text>
      </motion.g>
    </svg>
  );
}

export default function LiveDemo() {
  const reduce = useReducedMotion();
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (reduce || !playing) return;
    const id = setInterval(() => {
      setStage((s) => (s + 1) % STAGES.length);
    }, STAGE_MS);
    return () => clearInterval(id);
  }, [reduce, playing]);

  return (
    <section id="demo" className="border-b border-border bg-canvas py-section">
      <div className="mx-auto max-w-content px-4 sm:px-6 lg:px-8">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="section-eyebrow">Live demo</p>
          <h2 className="mt-3 font-display text-section text-text-primary">
            Watch a building come together.
          </h2>
          <p className="mt-4 text-body-lg text-text-secondary">
            Foundation to lighting in thirty seconds — the same sequence your
            projects follow inside the planner.
          </p>
        </Reveal>

        <Reveal delay={0.15} direction="scale" className="mx-auto mt-12 max-w-4xl">
          <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-lg">
            {/* Browser chrome */}
            <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
              <span className="ml-3 flex-1 truncate rounded-md bg-surface px-3 py-1 text-center text-xs text-text-tertiary">
                buildvision.app/planner/tower-a
              </span>
            </div>

            <BuildingStage stage={stage} />

            {/* Controls */}
            <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3.5">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white transition-colors hover:bg-accent-hover"
                aria-label={playing ? "Pause demo" : "Play demo"}
              >
                {playing && !reduce ? <Pause size={14} /> : <Play size={14} className="translate-x-px" />}
              </button>
              <div className="flex flex-1 flex-wrap items-center gap-1.5" role="tablist" aria-label="Construction stage">
                {STAGES.map((s, i) => (
                  <button
                    key={s}
                    role="tab"
                    aria-selected={stage === i}
                    onClick={() => {
                      setStage(i);
                      setPlaying(false);
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      stage === i
                        ? "border-accent bg-accent text-white"
                        : i < stage
                          ? "border-accent-border bg-accent-soft text-accent"
                          : "border-border bg-white text-text-tertiary hover:border-border-strong"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
