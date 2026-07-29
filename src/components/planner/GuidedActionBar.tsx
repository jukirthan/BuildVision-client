"use client";

/**
 * Always-visible “what do I do next?” guide for the planner.
 * Keeps the editor approachable for first-time users.
 */

import { CheckCircle2, Lightbulb, MousePointerClick, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useStructureStore } from "@/store/useStructureStore";
import type { EditTool } from "@/types/structure";

const STEPS: Record<
  EditTool,
  { title: string; body: string; tone: "info" | "action" | "warn" }
> = {
  select: {
    title: "Select & move",
    body: "Click any pillar, wall, door, or stair. Drag to move. Open Geometry to rotate stairs (0° / 90° / 180° / 270°). Esc clears.",
    tone: "info",
  },
  pillar: {
    title: "Place a pillar",
    body: "Click anywhere on the floor grid. Beams and slabs update automatically.",
    tone: "action",
  },
  wall: {
    title: "Draw a wall",
    body: "Click the start point, then click the end point. Esc cancels.",
    tone: "action",
  },
  door: {
    title: "Place a door",
    body: "Click on an existing wall. The opening is cut into the wall for you.",
    tone: "action",
  },
  window: {
    title: "Place a window",
    body: "Click on an existing wall where you want the window.",
    tone: "action",
  },
  stair: {
    title: "Place stairs",
    body: "Set the number of steps in the toolbox (rise & tread update from floor height), then click the floor to place.",
    tone: "action",
  },
  delete: {
    title: "Delete mode",
    body: "Click any object to remove it. Switch back to Select when finished.",
    tone: "warn",
  },
};

const TIPS_KEY = "bv-planner-tips-dismissed";

export default function GuidedActionBar() {
  const tool = useStructureStore((s) => s.tool);
  const wallDraftStart = useStructureStore((s) => s.wallDraftStart);
  const setTool = useStructureStore((s) => s.setTool);
  const activeFloor = useStructureStore((s) => s.activeFloor);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(TIPS_KEY)) setShowWelcome(true);
    } catch {
      setShowWelcome(true);
    }
  }, []);

  const step = STEPS[tool];
  const wallHalf =
    tool === "wall" && wallDraftStart
      ? "Now click the second corner to finish the wall."
      : null;

  const dismissWelcome = () => {
    setShowWelcome(false);
    try {
      localStorage.setItem(TIPS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 z-30 flex flex-col items-center gap-2 px-3 md:bottom-5">
      {showWelcome && (
        <div className="pointer-events-auto w-full max-w-lg rounded-2xl border border-[#c7d2fe] bg-white p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eef2ff] text-[#3D5AFE]">
              <Lightbulb size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-semibold text-[#121820]">
                Quick start (30 seconds)
              </p>
              <ol className="mt-2 space-y-1.5 text-sm text-[#5b6570]">
                <li className="flex gap-2">
                  <span className="font-semibold text-[#3D5AFE]">1.</span>
                  Choose a tool above (Pillar, Wall, Door…)
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-[#3D5AFE]">2.</span>
                  Click on the 3D floor to place it
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-[#3D5AFE]">3.</span>
                  Use Select to drag and adjust
                </li>
              </ol>
              <button
                type="button"
                onClick={dismissWelcome}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#121820] px-3 py-2 text-xs font-semibold text-white hover:bg-[#3D5AFE]"
              >
                <CheckCircle2 size={14} /> Got it — start designing
              </button>
            </div>
            <button
              type="button"
              onClick={dismissWelcome}
              className="rounded-lg p-1.5 text-[#94a3b8] hover:bg-[#f4f6f8] hover:text-[#121820]"
              aria-label="Dismiss tip"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div
        className={cn(
          "pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-lg backdrop-blur-xl sm:px-4",
          step.tone === "warn"
            ? "border-rose-200 bg-rose-50/95"
            : step.tone === "action"
              ? "border-[#bfdbfe] bg-[#eff6ff]/95"
              : "border-[#e2e8f0] bg-white/95"
        )}
      >
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            step.tone === "warn"
              ? "bg-rose-100 text-rose-600"
              : step.tone === "action"
                ? "bg-[#dbeafe] text-[#2563EB]"
                : "bg-[#f1f5f9] text-[#475569]"
          )}
        >
          <MousePointerClick size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#121820]">
            {step.title}
            <span className="ml-2 text-[11px] font-medium text-[#94a3b8]">
              Floor {activeFloor}
            </span>
          </p>
          <p className="text-xs leading-snug text-[#5b6570]">
            {wallHalf ?? step.body}
          </p>
        </div>
        {tool !== "select" && (
          <button
            type="button"
            onClick={() => setTool("select")}
            className="shrink-0 rounded-lg border border-[#d5dce5] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#334155] hover:border-[#3D5AFE] hover:text-[#3D5AFE]"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
