"use client";

/**
 * Friendly left rail: clear “Build” tools + simple building size.
 * Advanced engineering stays in the floating inspector.
 */

import type { ReactNode } from "react";
import {
  BrickWall,
  DoorOpen,
  Footprints,
  MousePointer2,
  PanelTop,
  Plus,
  SquareStack,
  Trash2,
  X,
} from "lucide-react";
import { useIsCompact } from "@/hooks/useMediaQuery";
import { computeStairFromSteps } from "@/lib/stair-geometry";
import { cn } from "@/lib/utils";
import { useStructureStore } from "@/store/useStructureStore";
import type { EditTool } from "@/types/structure";

const TOOLS: {
  id: EditTool;
  label: string;
  desc: string;
  icon: ReactNode;
}[] = [
  {
    id: "select",
    label: "Select",
    desc: "Click & drag objects",
    icon: <MousePointer2 size={18} />,
  },
  {
    id: "pillar",
    label: "Pillar",
    desc: "Click floor to place",
    icon: <SquareStack size={18} />,
  },
  {
    id: "wall",
    label: "Wall",
    desc: "Click start, then end",
    icon: <BrickWall size={18} />,
  },
  {
    id: "door",
    label: "Door",
    desc: "Click a wall",
    icon: <DoorOpen size={18} />,
  },
  {
    id: "window",
    label: "Window",
    desc: "Click a wall",
    icon: <PanelTop size={18} />,
  },
  {
    id: "stair",
    label: "Stairs",
    desc: "Click floor to place",
    icon: <Footprints size={18} />,
  },
  {
    id: "delete",
    label: "Delete",
    desc: "Click to remove",
    icon: <Trash2 size={18} />,
  },
];

function SimpleField({
  label,
  value,
  unit,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  unit: string;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <label className="block space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-[#64748b]">{label}</span>
        <span className="font-mono text-[#121820]">
          {value.toFixed(step < 1 ? 1 : 0)} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#e2e8f0] accent-[#2563EB]"
      />
    </label>
  );
}

function PanelBody({ onClose }: { onClose?: () => void }) {
  const tool = useStructureStore((s) => s.tool);
  const setTool = useStructureStore((s) => s.setTool);
  const building = useStructureStore((s) => s.building);
  const setBuilding = useStructureStore((s) => s.setBuilding);
  const activeFloor = useStructureStore((s) => s.activeFloor);
  const setActiveFloor = useStructureStore((s) => s.setActiveFloor);
  const addFloor = useStructureStore((s) => s.addFloor);
  const pillars = useStructureStore((s) => s.pillars);
  const floorPlates = useStructureStore((s) => s.floorPlates);
  const regenerateFromGrid = useStructureStore((s) => s.regenerateFromGrid);
  const stairStepCount = useStructureStore((s) => s.stairStepCount);
  const setStairStepCount = useStructureStore((s) => s.setStairStepCount);
  const plate = floorPlates.find((p) => p.floor === activeFloor);
  const stairPreview = computeStairFromSteps(
    building.floorHeight,
    stairStepCount
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <div className="flex items-start justify-between gap-2 border-b border-[#eef2f6] px-4 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2563EB]">
            Toolbox
          </p>
          <h2 className="mt-0.5 font-display text-lg font-semibold text-[#121820]">
            Build
          </h2>
          <p className="mt-1 text-xs text-[#94a3b8]">
            Pick a tool, then click the canvas
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#121820]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="touch-scroll flex-1 space-y-5 overflow-y-auto px-3 py-3 pb-safe">
        <div className="grid grid-cols-1 gap-1.5">
          {TOOLS.map((t) => {
            const active = tool === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTool(t.id)}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition",
                  active
                    ? t.id === "delete"
                      ? "border-rose-300 bg-rose-50 shadow-sm"
                      : "border-[#93c5fd] bg-[#eff6ff] shadow-sm"
                    : "border-transparent hover:border-[#e2e8f0] hover:bg-[#f8fafc]"
                )}
              >
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    active
                      ? t.id === "delete"
                        ? "bg-rose-600 text-white"
                        : "bg-[#2563EB] text-white"
                      : "bg-[#f1f5f9] text-[#475569]"
                  )}
                >
                  {t.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-[#121820]">
                    {t.label}
                  </span>
                  <span className="block text-xs text-[#94a3b8]">{t.desc}</span>
                </span>
              </button>
            );
          })}
        </div>

        {tool === "stair" && (
          <section className="space-y-3 rounded-2xl border border-[#93c5fd] bg-[#eff6ff] p-3">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#2563EB]">
              Stair steps
            </h3>
            <p className="text-xs text-[#64748b]">
              Set how many steps, then click the floor to place. Rise and tread
              come from floor height ({building.floorHeight.toFixed(2)} m).
            </p>
            <label className="block space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#64748b]">Number of steps</span>
                <span className="font-mono text-sm font-semibold text-[#121820]">
                  {stairPreview.stepCount}
                </span>
              </div>
              <input
                type="range"
                min={3}
                max={30}
                step={1}
                value={stairStepCount}
                onChange={(e) => setStairStepCount(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#bfdbfe] accent-[#2563EB]"
              />
              <input
                type="number"
                min={3}
                max={30}
                value={stairStepCount}
                onChange={(e) => setStairStepCount(Number(e.target.value) || 3)}
                className="w-full rounded-lg border border-[#bfdbfe] bg-white px-2.5 py-1.5 font-mono text-sm text-[#121820]"
              />
            </label>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg bg-white px-2.5 py-2">
                <p className="text-[#94a3b8]">Step height (rise)</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-[#121820]">
                  {stairPreview.riseMm} mm
                </p>
              </div>
              <div className="rounded-lg bg-white px-2.5 py-2">
                <p className="text-[#94a3b8]">Step depth (tread)</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-[#121820]">
                  {stairPreview.treadMm} mm
                </p>
              </div>
              <div className="col-span-2 rounded-lg bg-white px-2.5 py-2">
                <p className="text-[#94a3b8]">Going length · comfort 2R+T</p>
                <p className="mt-0.5 font-mono text-sm font-semibold text-[#121820]">
                  {stairPreview.depthM.toFixed(2)} m · {stairPreview.comfortMm}{" "}
                  mm
                  {!stairPreview.riseOk || !stairPreview.comfortOk ? (
                    <span className="ml-1 font-sans text-[10px] font-medium text-amber-600">
                      (adjust steps for comfort)
                    </span>
                  ) : (
                    <span className="ml-1 font-sans text-[10px] font-medium text-emerald-600">
                      OK
                    </span>
                  )}
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="space-y-3 rounded-2xl border border-[#eef2f6] bg-[#f8fafc] p-3">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#94a3b8]">
            Building size
          </h3>
          <SimpleField
            label="Width"
            value={building.width}
            unit="m"
            min={8}
            max={60}
            step={0.5}
            onChange={(width) => setBuilding({ width })}
          />
          <SimpleField
            label="Length"
            value={building.length}
            unit="m"
            min={8}
            max={60}
            step={0.5}
            onChange={(length) => setBuilding({ length })}
          />
          <SimpleField
            label="Floor height"
            value={building.floorHeight}
            unit="m"
            min={2.5}
            max={5}
            step={0.1}
            onChange={(floorHeight) => setBuilding({ floorHeight })}
          />
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#94a3b8]">
              Floors
            </h3>
            <button
              type="button"
              onClick={() => addFloor()}
              className="inline-flex items-center gap-1 rounded-lg bg-[#121820] px-2 py-1 text-[11px] font-semibold text-white hover:bg-[#2563EB]"
            >
              <Plus size={12} /> Add
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: building.floors }, (_, i) => i + 1).map(
              (f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setActiveFloor(f)}
                  className={cn(
                    "min-h-9 min-w-9 rounded-xl text-xs font-bold",
                    activeFloor === f
                      ? "bg-[#2563EB] text-white"
                      : "bg-[#f1f5f9] text-[#64748b]"
                  )}
                >
                  {f}
                </button>
              )
            )}
          </div>
        </section>

        <section className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#94a3b8]">
            Quick layout
          </h3>
          <p className="text-xs text-[#94a3b8]">
            Replace pillars with a neat grid (keeps walls on this floor).
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              [3, 2],
              [4, 3],
              [5, 4],
            ].map(([c, r]) => (
              <button
                key={`${c}x${r}`}
                type="button"
                onClick={() => regenerateFromGrid(c, r)}
                className="rounded-xl border border-[#e2e8f0] bg-white py-2 text-xs font-semibold text-[#334155] hover:border-[#2563EB] hover:text-[#2563EB]"
              >
                {c}×{r}
              </button>
            ))}
          </div>
        </section>

        <div className="rounded-xl bg-[#f1f5f9] px-3 py-2.5 text-[11px] leading-relaxed text-[#64748b]">
          Floor {activeFloor}: {pillars.length} pillars ·{" "}
          {plate?.walls.length ?? 0} walls · {plate?.openings.length ?? 0}{" "}
          openings
        </div>
      </div>
    </div>
  );
}

export default function LeftSidebar() {
  const compact = useIsCompact();
  const leftOpen = useStructureStore((s) => s.leftOpen);
  const setLeftOpen = useStructureStore((s) => s.setLeftOpen);

  if (compact) {
    if (!leftOpen) return null;
    return (
      <>
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#121820]/30 backdrop-blur-[1px]"
          aria-label="Close toolbox"
          onClick={() => setLeftOpen(false)}
        />
        <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(100vw-2.5rem,20rem)] flex-col border-r border-[#e2e8f0] bg-white shadow-2xl pt-safe">
          <PanelBody onClose={() => setLeftOpen(false)} />
        </aside>
      </>
    );
  }

  return (
    <aside
      className={cn(
        "relative z-20 hidden h-full shrink-0 flex-col border-r border-[#e2e8f0] bg-white transition-all duration-200 lg:flex",
        leftOpen ? "w-[17.5rem]" : "w-12"
      )}
    >
      {!leftOpen ? (
        <button
          type="button"
          onClick={() => setLeftOpen(true)}
          className="flex h-full w-full items-start justify-center pt-16"
          aria-label="Open toolbox"
        >
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#94a3b8] [writing-mode:vertical-rl]">
            Build
          </span>
        </button>
      ) : (
        <PanelBody onClose={() => setLeftOpen(false)} />
      )}
    </aside>
  );
}
