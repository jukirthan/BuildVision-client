"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Minus,
  Plus,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/cost-estimator";
import { computeStairFromSteps, defaultStepCount } from "@/lib/stair-geometry";
import { useLengthUnit } from "@/lib/use-length-unit";
import { useStructureStore } from "@/store/useStructureStore";
import type {
  BarDiameterMm,
  ConcreteGrade,
  MemberStatus,
  SectionShape,
  SteelGrade,
  StairType,
  StirrupHook,
  StirrupShape,
} from "@/types/structure";
import {
  MAIN_BAR_DIAMETERS_MM,
  STIRRUP_DIAMETERS_MM,
  STIRRUP_SPACINGS_MM,
} from "@/types/structure";

type Tab =
  | "general"
  | "geometry"
  | "steel"
  | "zones"
  | "loads"
  | "ai"
  | "check"
  | "site";

const TABS: { id: Tab; label: string }[] = [
  { id: "general", label: "General" },
  { id: "geometry", label: "Geometry" },
  { id: "steel", label: "Rebar" },
  { id: "zones", label: "Zones" },
  { id: "loads", label: "Loads" },
  { id: "ai", label: "AI" },
  { id: "check", label: "Check" },
  { id: "site", label: "Footing" },
];

function StatusBadge({ status }: { status?: MemberStatus }) {
  if (!status) return null;
  const map = {
    safe: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-700 border-amber-500/30",
    fail: "bg-red-500/15 text-red-600 border-red-500/30",
  };
  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        map[status]
      )}
    >
      {status}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";

function NumInput({
  value,
  onChange,
  step = 0.05,
  min,
  max,
  unit,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
}) {
  const {
    label: lengthLabel,
    step: lengthStep,
    decimals,
    toDisplay,
    fromDisplay,
  } = useLengthUnit();

  const isLength = unit === "m";
  const displayValue = isLength ? toDisplay(value) : value;
  const displayStep = isLength ? lengthStep : step;
  const displayMin =
    min !== undefined ? (isLength ? toDisplay(min) : min) : undefined;
  const displayMax =
    max !== undefined ? (isLength ? toDisplay(max) : max) : undefined;
  const displayUnit = isLength ? lengthLabel : unit;

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        value={
          Number.isFinite(displayValue)
            ? Number(displayValue.toFixed(isLength ? decimals : 4))
            : 0
        }
        step={displayStep}
        min={displayMin}
        max={displayMax}
        onChange={(e) => {
          const raw = Number(e.target.value);
          onChange(isLength ? fromDisplay(raw) : raw);
        }}
        className={cn(inputCls, "font-mono")}
      />
      {displayUnit && (
        <span className="shrink-0 text-xs text-slate-400">{displayUnit}</span>
      )}
    </div>
  );
}

function SelectInput<T extends string | number>({
  value,
  options,
  onChange,
  format,
}: {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  return (
    <select
      className={inputCls}
      value={String(value)}
      onChange={(e) => {
        const raw = e.target.value;
        const parsed = (typeof options[0] === "number"
          ? Number(raw)
          : raw) as T;
        onChange(parsed);
      }}
    >
      {options.map((o) => (
        <option key={String(o)} value={String(o)}>
          {format ? format(o) : String(o)}
        </option>
      ))}
    </select>
  );
}

function Stepper({
  value,
  onChange,
  min = 0,
  max = 24,
  label,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="rounded-lg border border-slate-200 p-2 hover:bg-slate-100"
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Decrease"
      >
        <Minus size={14} />
      </button>
      <span className="min-w-[3rem] text-center font-mono text-sm font-semibold">
        {value}
        {label ? ` ${label}` : ""}
      </span>
      <button
        type="button"
        className="rounded-lg border border-slate-200 p-2 hover:bg-slate-100"
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Increase"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

export default function PropertyInspector() {
  const [tab, setTab] = useState<Tab>("general");
  const inspectorOpen = useStructureStore((s) => s.inspectorOpen);
  const setInspectorOpen = useStructureStore((s) => s.setInspectorOpen);
  const selectedPillarId = useStructureStore((s) => s.selectedPillarId);
  const selectedBeamId = useStructureStore((s) => s.selectedBeamId);
  const selectedSlabId = useStructureStore((s) => s.selectedSlabId);
  const selectedWallId = useStructureStore((s) => s.selectedWallId);
  const selectedStairId = useStructureStore((s) => s.selectedStairId);
  const selectedOpeningId = useStructureStore((s) => s.selectedOpeningId);
  const multiSelectedPillarIds = useStructureStore(
    (s) => s.multiSelectedPillarIds
  );
  const pillars = useStructureStore((s) => s.pillars);
  const beams = useStructureStore((s) => s.beams);
  const slabs = useStructureStore((s) => s.slabs);
  const floorPlates = useStructureStore((s) => s.floorPlates);
  const building = useStructureStore((s) => s.building);
  const advisor = useStructureStore((s) => s.advisor);
  const recommendations = useStructureStore((s) => s.recommendations);
  const designOptions = useStructureStore((s) => s.designOptions);
  const updatePillar = useStructureStore((s) => s.updatePillar);
  const updateBeam = useStructureStore((s) => s.updateBeam);
  const updateSlab = useStructureStore((s) => s.updateSlab);
  const updateWall = useStructureStore((s) => s.updateWall);
  const updateStair = useStructureStore((s) => s.updateStair);
  const updateOpening = useStructureStore((s) => s.updateOpening);
  const removeStair = useStructureStore((s) => s.removeStair);
  const removeOpening = useStructureStore((s) => s.removeOpening);
  const setSite = useStructureStore((s) => s.setSite);
  const setDesign = useStructureStore((s) => s.setDesign);
  const setFoundation = useStructureStore((s) => s.setFoundation);
  const applyEngineeringRecommendation = useStructureStore(
    (s) => s.applyEngineeringRecommendation
  );
  const applyDesignOption = useStructureStore((s) => s.applyDesignOption);
  const { format: formatLen } = useLengthUnit();

  const pillar = pillars.find((p) => p.id === selectedPillarId);
  const beam = beams.find((b) => b.id === selectedBeamId);
  const wall = floorPlates
    .flatMap((p) => p.walls)
    .find((w) => w.id === selectedWallId);
  const stair = floorPlates
    .flatMap((p) => p.stairs)
    .find((s) => s.id === selectedStairId);
  const opening = floorPlates
    .flatMap((p) => p.openings)
    .find((o) => o.id === selectedOpeningId);
  const slab = slabs.find((s) => s.id === selectedSlabId);
  const groupCount = multiSelectedPillarIds.length;
  const hasSelection = Boolean(
    pillar || beam || wall || stair || opening || slab || groupCount > 0
  );

  const kind = groupCount
    ? "group"
    : pillar
      ? "column"
      : beam
        ? "beam"
        : wall
          ? "wall"
          : stair
            ? "stair"
            : opening
              ? opening.type
              : slab
                ? "slab"
                : "site";
  const memberName = groupCount
    ? `${groupCount} pillars`
    : pillar?.name ??
      beam?.name ??
      wall?.name ??
      stair?.name ??
      opening?.name ??
      slab?.name ??
      "Building & foundation";
  const status =
    pillar?.check?.status ?? beam?.check?.status ?? slab?.check?.status;

  const relatedAdvisor = useMemo(
    () =>
      advisor.filter(
        (a) =>
          !a.memberId ||
          a.memberId === selectedPillarId ||
          a.memberId === selectedBeamId ||
          a.memberId === selectedSlabId ||
          a.memberKind === "building" ||
          a.memberKind === "footing" ||
          a.memberKind === "wall"
      ),
    [advisor, selectedPillarId, selectedBeamId, selectedSlabId]
  );

  if (!inspectorOpen) return null;

  if (groupCount > 0) {
    return (
      <aside className="pointer-events-auto absolute right-3 top-20 z-40 w-[min(100%-1.5rem,340px)] rounded-2xl border border-[#e2e8f0] bg-white/95 p-4 shadow-xl backdrop-blur-xl md:right-4 md:top-24">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2563EB]">
              Group selected
            </p>
            <h2 className="mt-1 font-display text-lg font-semibold text-[#121820]">
              {groupCount} pillars
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setInspectorOpen(false)}
            className="rounded-xl p-2 text-[#94a3b8] hover:bg-[#f1f5f9] hover:text-[#121820]"
            aria-label="Close inspector"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
          Drag any orange pillar to move the group. Arrow keys nudge · Delete
          removes · Esc clears.
        </p>
      </aside>
    );
  }

  if (!hasSelection) {
    return (
      <aside className="pointer-events-auto absolute right-3 top-20 z-40 w-[min(100%-1.5rem,320px)] rounded-2xl border border-[#e2e8f0] bg-white/95 p-4 shadow-xl backdrop-blur-xl md:right-4 md:top-24">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2563EB]">
              Properties
            </p>
            <h2 className="mt-1 font-display text-base font-semibold text-[#121820]">
              Nothing selected
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setInspectorOpen(false)}
            className="rounded-xl p-2 text-[#94a3b8] hover:bg-[#f1f5f9]"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-[#64748b]">
          Click a pillar, wall, door, or stair in the 3D view to edit its size
          and materials here.
        </p>
        <ol className="mt-3 space-y-1.5 text-xs text-[#64748b]">
          <li>
            <span className="font-semibold text-[#2563EB]">1.</span> Choose{" "}
            <span className="font-semibold">Pillar</span> or{" "}
            <span className="font-semibold">Wall</span> in the toolbar
          </li>
          <li>
            <span className="font-semibold text-[#2563EB]">2.</span> Click the
            floor (or wall) to place it
          </li>
          <li>
            <span className="font-semibold text-[#2563EB]">3.</span> Click the
            object again to edit details here
          </li>
        </ol>
        <p className="mt-3 text-[11px] text-[#94a3b8]">
          Tip: keep <span className="font-semibold text-[#334155]">Edit</span>{" "}
          view on (top bar) — it hides the roof so placement is easier.
        </p>
      </aside>
    );
  }

  return (
    <aside className="pointer-events-auto absolute right-3 top-20 z-40 flex max-h-[min(70vh,720px)] w-[min(100%-1.5rem,380px)] flex-col overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white/95 shadow-xl backdrop-blur-xl md:right-4 md:top-24">
      <div className="flex items-start justify-between gap-3 border-b border-[#eef2f6] px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2563EB]">
            {kind} properties
          </p>
          <div className="mt-1 flex items-center gap-2">
            <h2 className="font-display text-lg font-semibold text-[#121820]">
              {memberName}
            </h2>
            <StatusBadge status={status} />
          </div>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {building.design?.designCode ?? "IS456"} · live dependency engine
          </p>
        </div>
        <button
          type="button"
          onClick={() => setInspectorOpen(false)}
          className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close inspector"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-2 py-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition",
              tab === t.id
                ? "bg-primary text-white"
                : "text-slate-500 hover:bg-slate-100"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="touch-scroll flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {/* ——— GENERAL ——— */}
        {tab === "general" && (
          <>
            {pillar && (
              <>
                <Field label="Column name">
                  <input
                    className={inputCls}
                    value={pillar.name}
                    onChange={(e) =>
                      updatePillar(pillar.id, { name: e.target.value })
                    }
                  />
                </Field>
                <Field label="Material">
                  <SelectInput
                    value={(pillar.material === "steel" ? "steel" : "concrete") as "concrete" | "steel"}
                    options={["concrete", "steel"] as const}
                    onChange={(material) =>
                      updatePillar(pillar.id, { material })
                    }
                  />
                </Field>
                <Field label="Concrete grade">
                  <SelectInput
                    value={
                      (pillar.concreteGrade ??
                        building.design?.concreteGrade ??
                        "M25") as ConcreteGrade
                    }
                    options={["M20", "M25", "M30", "M35", "M40"] as const}
                    onChange={(concreteGrade) =>
                      updatePillar(pillar.id, { concreteGrade })
                    }
                  />
                </Field>
                <Field label="Steel grade">
                  <SelectInput
                    value={
                      (pillar.steelGrade ??
                        building.design?.steelGrade ??
                        "Fe500") as SteelGrade
                    }
                    options={["Fe415", "Fe500", "Fe550"] as const}
                    onChange={(steelGrade) =>
                      updatePillar(pillar.id, { steelGrade })
                    }
                  />
                </Field>
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                  Connected beams: {pillar.connectedBeamIds?.length ?? 0} ·
                  Footing linked · Loads cascade on edit
                </p>
              </>
            )}

            {beam && (
              <>
                <Field label="Beam name">
                  <input
                    className={inputCls}
                    value={beam.name}
                    onChange={(e) =>
                      updateBeam(beam.id, { name: e.target.value })
                    }
                  />
                </Field>
                <Field label="Concrete grade">
                  <SelectInput
                    value={
                      (beam.concreteGrade ??
                        building.design?.concreteGrade ??
                        "M25") as ConcreteGrade
                    }
                    options={["M20", "M25", "M30", "M35", "M40"] as const}
                    onChange={(concreteGrade) =>
                      updateBeam(beam.id, { concreteGrade })
                    }
                  />
                </Field>
                <Field label="Steel grade">
                  <SelectInput
                    value={
                      (beam.steelGrade ??
                        building.design?.steelGrade ??
                        "Fe500") as SteelGrade
                    }
                    options={["Fe415", "Fe500", "Fe550"] as const}
                    onChange={(steelGrade) =>
                      updateBeam(beam.id, { steelGrade })
                    }
                  />
                </Field>
                <Field label="Support condition">
                  <SelectInput
                    value={beam.supportCondition ?? "continuous"}
                    options={["simply", "continuous", "cantilever"] as const}
                    onChange={(supportCondition) =>
                      updateBeam(beam.id, { supportCondition })
                    }
                  />
                </Field>
              </>
            )}

            {slab && !pillar && !beam && !wall && (
              <>
                <Field label="Slab system">
                  <SelectInput
                    value={slab.system ?? "two_way"}
                    options={["one_way", "two_way", "flat", "drop_panel"] as const}
                    onChange={(system) => updateSlab(slab.id, { system })}
                    format={(v) => v.replace("_", " ")}
                  />
                </Field>
                <Field label="Project concrete grade">
                  <SelectInput
                    value={(building.design?.concreteGrade ?? "M25") as ConcreteGrade}
                    options={["M20", "M25", "M30", "M35", "M40"] as const}
                    onChange={(concreteGrade) => setDesign({ concreteGrade })}
                  />
                </Field>
                <Field label="Project steel grade">
                  <SelectInput
                    value={(building.design?.steelGrade ?? "Fe500") as SteelGrade}
                    options={["Fe415", "Fe500", "Fe550"] as const}
                    onChange={(steelGrade) => setDesign({ steelGrade })}
                  />
                </Field>
              </>
            )}

            {wall && (
              <>
                <Field label="Wall name">
                  <input
                    className={inputCls}
                    value={wall.name}
                    onChange={(e) =>
                      updateWall(wall.id, { name: e.target.value })
                    }
                  />
                </Field>
                <Field label="Material">
                  <SelectInput
                    value={
                      (["brick", "aac", "concrete"].includes(wall.material)
                        ? wall.material
                        : "brick") as "brick" | "aac" | "concrete"
                    }
                    options={["brick", "aac", "concrete"] as const}
                    onChange={(material) => updateWall(wall.id, { material })}
                  />
                </Field>
                <Field label="Bearing">
                  <SelectInput
                    value={wall.bearing ?? "non_load_bearing"}
                    options={["load_bearing", "non_load_bearing"] as const}
                    onChange={(bearing) => updateWall(wall.id, { bearing })}
                    format={(v) =>
                      v === "load_bearing" ? "Load bearing" : "Non load bearing"
                    }
                  />
                </Field>
                <Field label="Lintel">
                  <SelectInput
                    value={wall.hasLintel ? "yes" : "no"}
                    options={["yes", "no"] as const}
                    onChange={(v) =>
                      updateWall(wall.id, {
                        hasLintel: v === "yes",
                        lintelDepthMm: v === "yes" ? wall.lintelDepthMm ?? 150 : undefined,
                      })
                    }
                  />
                </Field>
              </>
            )}

            {stair && (
              <>
                <Field label="Stair name">
                  <input
                    className={inputCls}
                    value={stair.name}
                    onChange={(e) =>
                      updateStair(stair.id, { name: e.target.value })
                    }
                  />
                </Field>
                <Field label="Stair type">
                  <SelectInput
                    value={(stair.stairType ?? "straight") as StairType}
                    options={["straight", "dog_legged", "spiral"] as const}
                    onChange={(stairType) =>
                      updateStair(stair.id, { stairType })
                    }
                    format={(v) => v.replace("_", " ")}
                  />
                </Field>
                <p className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                  Connects floor {stair.floor} → {stair.floor + 1}. Set the
                  number of steps in Geometry — rise and tread update from
                  the building floor height.
                </p>
                <button
                  type="button"
                  onClick={() => removeStair(stair.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} /> Remove stair
                </button>
              </>
            )}

            {opening && (
              <>
                <Field label={`${opening.type === "door" ? "Door" : "Window"} name`}>
                  <input
                    className={inputCls}
                    value={opening.name}
                    onChange={(e) =>
                      updateOpening(opening.id, { name: e.target.value })
                    }
                  />
                </Field>
                <Field label="Type">
                  <SelectInput
                    value={opening.type}
                    options={["door", "window"] as const}
                    onChange={(type) => updateOpening(opening.id, { type })}
                  />
                </Field>
                <button
                  type="button"
                  onClick={() => removeOpening(opening.id)}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={14} /> Remove {opening.type}
                </button>
              </>
            )}
          </>
        )}

        {/* ——— GEOMETRY ——— */}
        {tab === "geometry" && pillar && (
          <>
            <Field label="Shape">
              <SelectInput
                value={(pillar.shape ?? "rectangle") as SectionShape}
                options={["square", "rectangle", "circular"] as const}
                onChange={(shape) => {
                  if (shape === "square") {
                    const s = Math.max(pillar.width, pillar.depth);
                    updatePillar(pillar.id, { shape, width: s, depth: s });
                  } else if (shape === "circular") {
                    const d = Math.max(pillar.width, pillar.depth);
                    updatePillar(pillar.id, { shape, width: d, depth: d });
                  } else {
                    updatePillar(pillar.id, { shape });
                  }
                }}
              />
            </Field>
            <Field label={pillar.shape === "circular" ? "Diameter" : "Width"}>
              <NumInput
                value={pillar.width}
                step={0.05}
                min={0.2}
                max={1.2}
                unit="m"
                onChange={(width) => {
                  if (pillar.shape === "square" || pillar.shape === "circular") {
                    updatePillar(pillar.id, { width, depth: width });
                  } else {
                    updatePillar(pillar.id, { width });
                  }
                }}
              />
            </Field>
            {pillar.shape !== "circular" && pillar.shape !== "square" && (
              <Field label="Length (depth)">
                <NumInput
                  value={pillar.depth}
                  step={0.05}
                  min={0.2}
                  max={1.2}
                  unit="m"
                  onChange={(depth) => updatePillar(pillar.id, { depth })}
                />
              </Field>
            )}
            <Field label="Height">
              <NumInput
                value={pillar.height}
                step={0.1}
                min={2}
                max={6}
                unit="m"
                onChange={(height) => updatePillar(pillar.id, { height })}
              />
            </Field>
            <Field label="X position">
              <NumInput
                value={pillar.x}
                step={0.05}
                min={0}
                max={building.width}
                unit="m"
                onChange={(x) => updatePillar(pillar.id, { x })}
              />
            </Field>
            <Field label="Y position (plan)">
              <NumInput
                value={pillar.y}
                step={0.05}
                min={0}
                max={building.length}
                unit="m"
                onChange={(y) => updatePillar(pillar.id, { y })}
              />
            </Field>
            <p className="rounded-xl bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-600">
              Position · X={formatLen(pillar.x)} · Y={formatLen(pillar.y)} ·
              Z base=0 · top={formatLen(pillar.height)}
            </p>
            <Field label="Rotation">
              <NumInput
                value={pillar.rotationDeg ?? 0}
                step={5}
                min={0}
                max={360}
                unit="°"
                onChange={(rotationDeg) =>
                  updatePillar(pillar.id, { rotationDeg })
                }
              />
            </Field>
            <p className="rounded-xl bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600">
              Section {formatLen(pillar.width)} × {formatLen(pillar.depth)}
            </p>
          </>
        )}

        {tab === "geometry" && beam && (
          <>
            <Field label="Width">
              <NumInput
                value={beam.width}
                step={0.05}
                min={0.2}
                max={0.6}
                unit="m"
                onChange={(width) => updateBeam(beam.id, { width })}
              />
            </Field>
            <Field label="Depth">
              <NumInput
                value={beam.depth}
                step={0.05}
                min={0.25}
                max={1.2}
                unit="m"
                onChange={(depth) => updateBeam(beam.id, { depth })}
              />
            </Field>
            <Field label="Anchorage">
              <NumInput
                value={beam.anchorageMm ?? 640}
                step={10}
                min={200}
                max={2000}
                unit="mm"
                onChange={(anchorageMm) => updateBeam(beam.id, { anchorageMm })}
              />
            </Field>
            <p className="text-xs text-slate-500">
              Span L = {formatLen(beam.length)} · teaching L/14 ≈{" "}
              {formatLen(beam.length / 14)}
            </p>
          </>
        )}

        {tab === "geometry" && slab && !pillar && !beam && !wall && (
          <>
            <Field label="Thickness">
              <NumInput
                value={slab.thickness}
                step={0.025}
                min={0.1}
                max={0.4}
                unit="m"
                onChange={(thickness) => updateSlab(slab.id, { thickness })}
              />
            </Field>
            <Field label="Steel direction">
              <SelectInput
                value={slab.steelDirection ?? "both"}
                options={["x", "y", "both"] as const}
                onChange={(steelDirection) =>
                  updateSlab(slab.id, { steelDirection })
                }
              />
            </Field>
            <Field label="Finish load">
              <NumInput
                value={slab.finishLoadKNm2 ?? 1}
                step={0.25}
                min={0}
                max={5}
                unit="kN/m²"
                onChange={(finishLoadKNm2) =>
                  updateSlab(slab.id, { finishLoadKNm2 })
                }
              />
            </Field>
            <Field label="Live load">
              <NumInput
                value={slab.liveLoadKNm2 ?? 2}
                step={0.5}
                min={0}
                max={10}
                unit="kN/m²"
                onChange={(liveLoadKNm2) =>
                  updateSlab(slab.id, { liveLoadKNm2 })
                }
              />
            </Field>
            <Field label="Waterproof layer">
              <NumInput
                value={slab.waterproofLayerMm ?? 0}
                step={5}
                min={0}
                max={50}
                unit="mm"
                onChange={(waterproofLayerMm) =>
                  updateSlab(slab.id, { waterproofLayerMm })
                }
              />
            </Field>
            <button
              type="button"
              className="w-full rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:border-primary hover:text-primary"
              onClick={() => {
                const openings = [
                  ...(slab.openings ?? []),
                  {
                    id: `op-${Date.now()}`,
                    name: `Opening-${(slab.openings?.length ?? 0) + 1}`,
                    x: slab.centerX,
                    y: slab.centerY,
                    width: 1.2,
                    length: 1.2,
                  },
                ];
                updateSlab(slab.id, { openings });
              }}
            >
              + Add slab opening
            </button>
            {(slab.openings ?? []).map((o) => (
              <div
                key={o.id}
                className="rounded-xl border border-slate-100 p-2 text-xs"
              >
                <p className="font-semibold">{o.name}</p>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <NumInput
                    value={o.width}
                    step={0.1}
                    unit="m W"
                    onChange={(width) =>
                      updateSlab(slab.id, {
                        openings: slab.openings!.map((x) =>
                          x.id === o.id ? { ...x, width } : x
                        ),
                      })
                    }
                  />
                  <NumInput
                    value={o.length}
                    step={0.1}
                    unit="m L"
                    onChange={(length) =>
                      updateSlab(slab.id, {
                        openings: slab.openings!.map((x) =>
                          x.id === o.id ? { ...x, length } : x
                        ),
                      })
                    }
                  />
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "geometry" && wall && (
          <Field label="Thickness">
            <NumInput
              value={wall.thickness}
              step={0.025}
              min={0.1}
              max={0.4}
              unit="m"
              onChange={(thickness) => updateWall(wall.id, { thickness })}
            />
          </Field>
        )}

        {tab === "geometry" && stair && (
          <>
            <Field label="Number of steps">
              <NumInput
                value={
                  stair.stepCount ??
                  defaultStepCount(building.floorHeight, stair.riseMm ?? 175)
                }
                step={1}
                min={3}
                max={30}
                unit="steps"
                onChange={(stepCount) => updateStair(stair.id, { stepCount })}
              />
            </Field>
            {(() => {
              const geo = computeStairFromSteps(
                building.floorHeight,
                stair.stepCount ??
                  defaultStepCount(building.floorHeight, stair.riseMm ?? 175),
                stair.treadMm
              );
              return (
                <div className="space-y-2 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] text-slate-600">
                  <p className="font-mono">
                    Floor height {formatLen(building.floorHeight)} ÷{" "}
                    {geo.stepCount} steps
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-slate-400">Step height (rise)</p>
                      <p className="font-mono text-sm font-semibold text-slate-800">
                        {geo.riseMm} mm
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400">Step depth (tread)</p>
                      <p className="font-mono text-sm font-semibold text-slate-800">
                        {geo.treadMm} mm
                      </p>
                    </div>
                  </div>
                  <p>
                    Comfort 2R+T = {geo.comfortMm} mm{" "}
                    {geo.riseOk && geo.comfortOk ? (
                      <span className="text-emerald-600">· OK</span>
                    ) : (
                      <span className="text-amber-600">
                        · try more/fewer steps
                      </span>
                    )}
                  </p>
                </div>
              );
            })()}
            <Field label="Width">
              <NumInput
                value={stair.width}
                step={0.05}
                min={0.7}
                max={2.5}
                unit="m"
                onChange={(width) => updateStair(stair.id, { width })}
              />
            </Field>
            <Field label="Length (run)">
              <NumInput
                value={stair.depth}
                step={0.1}
                min={1}
                max={8}
                unit="m"
                onChange={(depth) => updateStair(stair.id, { depth })}
              />
            </Field>
            <Field label="X position">
              <NumInput
                value={stair.x}
                step={0.05}
                min={0}
                max={building.width}
                unit="m"
                onChange={(x) => updateStair(stair.id, { x })}
              />
            </Field>
            <Field label="Y position (plan)">
              <NumInput
                value={stair.y}
                step={0.05}
                min={0}
                max={building.length}
                unit="m"
                onChange={(y) => updateStair(stair.id, { y })}
              />
            </Field>
            <Field label="Rotation">
              <NumInput
                value={stair.rotationDeg ?? 0}
                step={15}
                min={0}
                max={360}
                unit="°"
                onChange={(rotationDeg) => {
                  const normalized =
                    ((Math.round(rotationDeg) % 360) + 360) % 360;
                  updateStair(stair.id, { rotationDeg: normalized });
                }}
              />
            </Field>
            <div className="flex flex-wrap gap-1.5">
              {[0, 90, 180, 270].map((deg) => (
                <button
                  key={deg}
                  type="button"
                  onClick={() => updateStair(stair.id, { rotationDeg: deg })}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
                    (stair.rotationDeg ?? 0) === deg
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  )}
                >
                  {deg}°
                </button>
              ))}
            </div>
          </>
        )}

        {tab === "geometry" && opening && (
          <>
            <Field label="Width">
              <NumInput
                value={opening.width}
                step={0.05}
                min={0.6}
                max={2.4}
                unit="m"
                onChange={(width) => updateOpening(opening.id, { width })}
              />
            </Field>
            <Field label="Height">
              <NumInput
                value={opening.height}
                step={0.05}
                min={0.4}
                max={2.6}
                unit="m"
                onChange={(height) => updateOpening(opening.id, { height })}
              />
            </Field>
            <Field label="Sill height">
              <NumInput
                value={opening.sillHeight}
                step={0.05}
                min={0}
                max={2}
                unit="m"
                onChange={(sillHeight) =>
                  updateOpening(opening.id, { sillHeight })
                }
              />
            </Field>
            <Field label="Position along wall">
              <NumInput
                value={opening.t}
                step={0.02}
                min={0.05}
                max={0.95}
                onChange={(t) => updateOpening(opening.id, { t })}
              />
            </Field>
          </>
        )}

        {/* ——— STEEL / REBAR ——— */}
        {tab === "steel" && pillar && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Main bars ·{" "}
              {pillar.longitudinalBars?.count ?? 6} ×{" "}
              {pillar.longitudinalBars?.diameterMm ?? 16} mm
            </p>
            <Field label="Bar diameter">
              <SelectInput
                value={
                  (pillar.longitudinalBars?.diameterMm ?? 16) as BarDiameterMm
                }
                options={MAIN_BAR_DIAMETERS_MM}
                onChange={(diameterMm) =>
                  updatePillar(pillar.id, {
                    longitudinalBars: {
                      diameterMm,
                      count: pillar.longitudinalBars?.count ?? 6,
                    },
                  })
                }
                format={(d) => `${d} mm`}
              />
            </Field>
            <Field label="Quantity">
              <Stepper
                value={pillar.longitudinalBars?.count ?? 6}
                min={4}
                max={16}
                onChange={(count) =>
                  updatePillar(pillar.id, {
                    longitudinalBars: {
                      diameterMm: pillar.longitudinalBars?.diameterMm ?? 16,
                      count,
                    },
                  })
                }
              />
            </Field>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold hover:bg-slate-50"
                onClick={() =>
                  updatePillar(pillar.id, {
                    longitudinalBars: {
                      diameterMm: pillar.longitudinalBars?.diameterMm ?? 16,
                      count: Math.min(
                        16,
                        (pillar.longitudinalBars?.count ?? 6) + 2
                      ),
                    },
                  })
                }
              >
                + Add bars (+2)
              </button>
              <button
                type="button"
                className="flex-1 rounded-xl border border-slate-200 py-2 text-xs font-semibold hover:bg-slate-50"
                onClick={() =>
                  updatePillar(pillar.id, {
                    longitudinalBars: {
                      diameterMm: pillar.longitudinalBars?.diameterMm ?? 16,
                      count: Math.max(
                        4,
                        (pillar.longitudinalBars?.count ?? 6) - 2
                      ),
                    },
                  })
                }
              >
                − Remove bars
              </button>
            </div>

            <p className="pt-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Stirrups (ties)
            </p>
            <Field label="Diameter">
              <SelectInput
                value={(pillar.stirrups?.diameterMm ?? 8) as BarDiameterMm}
                options={STIRRUP_DIAMETERS_MM}
                onChange={(diameterMm) =>
                  updatePillar(pillar.id, {
                    stirrups: {
                      diameterMm,
                      spacingMm: pillar.stirrups?.spacingMm ?? 150,
                      legs: pillar.stirrups?.legs ?? 2,
                      shape: pillar.stirrups?.shape ?? "square",
                      hook: pillar.stirrups?.hook ?? "135",
                    },
                  })
                }
                format={(d) => `${d} mm`}
              />
            </Field>
            <Field label="Spacing">
              <SelectInput
                value={(pillar.stirrups?.spacingMm ?? 150) as number}
                options={STIRRUP_SPACINGS_MM}
                onChange={(spacingMm) =>
                  updatePillar(pillar.id, {
                    stirrups: {
                      diameterMm: pillar.stirrups?.diameterMm ?? 8,
                      spacingMm,
                      legs: pillar.stirrups?.legs ?? 2,
                      shape: pillar.stirrups?.shape ?? "square",
                      hook: pillar.stirrups?.hook ?? "135",
                    },
                  })
                }
                format={(d) => `${d} mm`}
              />
            </Field>
            <Field label="Shape">
              <SelectInput
                value={(pillar.stirrups?.shape ?? "square") as StirrupShape}
                options={["square", "rectangular", "circular"] as const}
                onChange={(shape) =>
                  updatePillar(pillar.id, {
                    stirrups: {
                      diameterMm: pillar.stirrups?.diameterMm ?? 8,
                      spacingMm: pillar.stirrups?.spacingMm ?? 150,
                      legs: pillar.stirrups?.legs ?? 2,
                      shape,
                      hook: pillar.stirrups?.hook ?? "135",
                    },
                  })
                }
              />
            </Field>
            <Field label="Hooks">
              <SelectInput
                value={(pillar.stirrups?.hook ?? "135") as StirrupHook}
                options={["90", "135", "closed", "double", "cross"] as const}
                onChange={(hook) =>
                  updatePillar(pillar.id, {
                    stirrups: {
                      diameterMm: pillar.stirrups?.diameterMm ?? 8,
                      spacingMm: pillar.stirrups?.spacingMm ?? 150,
                      legs: pillar.stirrups?.legs ?? 2,
                      shape: pillar.stirrups?.shape ?? "square",
                      hook,
                    },
                  })
                }
                format={(h) =>
                  h === "90"
                    ? "90°"
                    : h === "135"
                      ? "135°"
                      : h === "closed"
                        ? "Closed Tie"
                        : h === "double"
                          ? "Double Tie"
                          : "Cross Tie"
                }
              />
            </Field>
          </>
        )}

        {tab === "steel" && beam && (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Top bars
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="⌀">
                <SelectInput
                  value={(beam.topBars?.diameterMm ?? 12) as BarDiameterMm}
                  options={MAIN_BAR_DIAMETERS_MM}
                  onChange={(diameterMm) =>
                    updateBeam(beam.id, {
                      topBars: {
                        diameterMm,
                        count: beam.topBars?.count ?? 2,
                      },
                    })
                  }
                  format={(d) => `${d}`}
                />
              </Field>
              <Field label="Qty">
                <Stepper
                  value={beam.topBars?.count ?? 2}
                  min={2}
                  max={8}
                  onChange={(count) =>
                    updateBeam(beam.id, {
                      topBars: {
                        diameterMm: beam.topBars?.diameterMm ?? 12,
                        count,
                      },
                    })
                  }
                />
              </Field>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Bottom bars
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="⌀">
                <SelectInput
                  value={(beam.bottomBars?.diameterMm ?? 16) as BarDiameterMm}
                  options={MAIN_BAR_DIAMETERS_MM}
                  onChange={(diameterMm) =>
                    updateBeam(beam.id, {
                      bottomBars: {
                        diameterMm,
                        count: beam.bottomBars?.count ?? 3,
                      },
                    })
                  }
                  format={(d) => `${d}`}
                />
              </Field>
              <Field label="Qty">
                <Stepper
                  value={beam.bottomBars?.count ?? 3}
                  min={2}
                  max={8}
                  onChange={(count) =>
                    updateBeam(beam.id, {
                      bottomBars: {
                        diameterMm: beam.bottomBars?.diameterMm ?? 16,
                        count,
                      },
                    })
                  }
                />
              </Field>
            </div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Extra / support / span
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Extra qty">
                <Stepper
                  value={beam.extraBars?.count ?? 0}
                  min={0}
                  max={4}
                  onChange={(count) =>
                    updateBeam(beam.id, {
                      extraBars: {
                        diameterMm: beam.extraBars?.diameterMm ?? 12,
                        count,
                      },
                    })
                  }
                />
              </Field>
              <Field label="Support bars">
                <Stepper
                  value={beam.supportBars?.count ?? 2}
                  min={0}
                  max={6}
                  onChange={(count) =>
                    updateBeam(beam.id, {
                      supportBars: {
                        diameterMm: beam.supportBars?.diameterMm ?? 12,
                        count,
                      },
                    })
                  }
                />
              </Field>
            </div>
            <Field label="Span reinforcement ⌀">
              <SelectInput
                value={(beam.spanBars?.diameterMm ?? 16) as BarDiameterMm}
                options={MAIN_BAR_DIAMETERS_MM}
                onChange={(diameterMm) =>
                  updateBeam(beam.id, {
                    spanBars: {
                      diameterMm,
                      count: beam.spanBars?.count ?? beam.bottomBars?.count ?? 3,
                    },
                  })
                }
                format={(d) => `${d} mm`}
              />
            </Field>
            <Field label="Stirrup ⌀">
              <SelectInput
                value={(beam.stirrups?.diameterMm ?? 8) as BarDiameterMm}
                options={STIRRUP_DIAMETERS_MM}
                onChange={(diameterMm) =>
                  updateBeam(beam.id, {
                    stirrups: {
                      diameterMm,
                      spacingMm: beam.stirrups?.spacingMm ?? 150,
                      legs: beam.stirrups?.legs ?? 2,
                      shape: "rectangular",
                      hook: beam.stirrups?.hook ?? "135",
                    },
                  })
                }
                format={(d) => `${d} mm`}
              />
            </Field>
            <Field label="Stirrup spacing">
              <SelectInput
                value={(beam.stirrups?.spacingMm ?? 150) as number}
                options={STIRRUP_SPACINGS_MM}
                onChange={(spacingMm) =>
                  updateBeam(beam.id, {
                    stirrups: {
                      diameterMm: beam.stirrups?.diameterMm ?? 8,
                      spacingMm,
                      legs: beam.stirrups?.legs ?? 2,
                      shape: "rectangular",
                      hook: beam.stirrups?.hook ?? "135",
                    },
                  })
                }
                format={(d) => `${d} mm`}
              />
            </Field>
          </>
        )}

        {tab === "steel" && slab && !pillar && !beam && !wall && (
          <>
            <Field label="Bottom mesh ⌀">
              <SelectInput
                value={(slab.bottomMesh?.diameterMm ?? 8) as BarDiameterMm}
                options={STIRRUP_DIAMETERS_MM}
                onChange={(diameterMm) =>
                  updateSlab(slab.id, {
                    bottomMesh: {
                      diameterMm,
                      count: 0,
                      spacingMm: slab.bottomMesh?.spacingMm ?? 150,
                    },
                  })
                }
                format={(d) => `${d} mm`}
              />
            </Field>
            <Field label="Bottom spacing">
              <SelectInput
                value={(slab.bottomMesh?.spacingMm ?? 150) as number}
                options={STIRRUP_SPACINGS_MM}
                onChange={(spacingMm) =>
                  updateSlab(slab.id, {
                    bottomMesh: {
                      diameterMm: slab.bottomMesh?.diameterMm ?? 8,
                      count: 0,
                      spacingMm,
                    },
                  })
                }
                format={(d) => `${d} mm`}
              />
            </Field>
            <Field label="Top mesh ⌀">
              <SelectInput
                value={(slab.topMesh?.diameterMm ?? 8) as BarDiameterMm}
                options={STIRRUP_DIAMETERS_MM}
                onChange={(diameterMm) =>
                  updateSlab(slab.id, {
                    topMesh: {
                      diameterMm,
                      count: 0,
                      spacingMm: slab.topMesh?.spacingMm ?? 200,
                    },
                  })
                }
                format={(d) => `${d} mm`}
              />
            </Field>
            <Field label="Top spacing">
              <SelectInput
                value={(slab.topMesh?.spacingMm ?? 200) as number}
                options={STIRRUP_SPACINGS_MM}
                onChange={(spacingMm) =>
                  updateSlab(slab.id, {
                    topMesh: {
                      diameterMm: slab.topMesh?.diameterMm ?? 8,
                      count: 0,
                      spacingMm,
                    },
                  })
                }
                format={(d) => `${d} mm`}
              />
            </Field>
          </>
        )}

        {tab === "steel" && wall && (
          <p className="text-xs text-slate-500">
            Walls use masonry / concrete volume in BOQ. Openings (door/window)
            inherit lintel when enabled on the wall.
          </p>
        )}

        {tab === "steel" && stair && (
          <>
            <Field label="Waist thickness">
              <NumInput
                value={stair.waistThickness ?? 0.15}
                step={0.01}
                min={0.1}
                max={0.25}
                unit="m"
                onChange={(waistThickness) =>
                  updateStair(stair.id, { waistThickness })
                }
              />
            </Field>
            <p className="text-xs text-slate-500">
              RC waist slab thickness used for the stair&apos;s concrete /
              steel take-off in the BOQ.
            </p>
          </>
        )}

        {tab === "steel" && opening && (
          <p className="text-xs text-slate-500">
            {opening.type === "door"
              ? "Doors don't carry reinforcement — they inherit a lintel from their host wall when enabled."
              : "Windows don't carry reinforcement — they inherit a lintel from their host wall when enabled."}
          </p>
        )}

        {/* ——— ZONES ——— */}
        {tab === "zones" && pillar && (
          <>
            <p className="text-xs text-slate-600">
              Independent tie spacing along column height (bottom / middle / top).
            </p>
            {(["bottom", "middle", "top"] as const).map((zone) => {
              const z = pillar.rebarZones?.[zone] ?? {
                diameterMm: 8 as BarDiameterMm,
                spacingMm: zone === "middle" ? 150 : 100,
              };
              return (
                <div
                  key={zone}
                  className="rounded-2xl border border-slate-100 p-3"
                >
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {zone} zone
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="⌀">
                      <SelectInput
                        value={z.diameterMm as BarDiameterMm}
                        options={STIRRUP_DIAMETERS_MM}
                        onChange={(diameterMm) =>
                          updatePillar(pillar.id, {
                            rebarZones: {
                              bottom: pillar.rebarZones?.bottom ?? z,
                              middle: pillar.rebarZones?.middle ?? z,
                              top: pillar.rebarZones?.top ?? z,
                              [zone]: { ...z, diameterMm },
                            },
                          })
                        }
                        format={(d) => `${d} mm`}
                      />
                    </Field>
                    <Field label="Spacing">
                      <SelectInput
                        value={z.spacingMm as number}
                        options={STIRRUP_SPACINGS_MM}
                        onChange={(spacingMm) =>
                          updatePillar(pillar.id, {
                            rebarZones: {
                              bottom: pillar.rebarZones?.bottom ?? z,
                              middle: pillar.rebarZones?.middle ?? z,
                              top: pillar.rebarZones?.top ?? z,
                              [zone]: { ...z, spacingMm },
                            },
                          })
                        }
                        format={(d) => `${d} mm`}
                      />
                    </Field>
                  </div>
                  <p className="mt-2 font-mono text-[11px] text-slate-500">
                    {z.diameterMm} mm @{z.spacingMm} mm
                  </p>
                </div>
              );
            })}
          </>
        )}

        {tab === "zones" && !pillar && (
          <p className="text-xs text-slate-500">
            Select a column to edit bottom / middle / top reinforcement zones.
          </p>
        )}

        {/* ——— LOADS ——— */}
        {tab === "loads" && (
          <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs text-slate-600">
            {pillar?.check && <p>{pillar.check.capacityNote}</p>}
            {beam?.check && <p>{beam.check.capacityNote}</p>}
            {slab?.check && <p>{slab.check.capacityNote}</p>}
            {pillar?.loads && (
              <ul className="space-y-1 font-mono">
                <li>Axial N ≈ {pillar.loads.axialKN.toFixed(0)} kN</li>
                <li>Shear ≈ {pillar.loads.shearKN.toFixed(0)} kN</li>
                <li>Wind (proxy) ≈ {pillar.loads.windLoadKN?.toFixed(0) ?? 0} kN</li>
                <li>
                  Footing q ≈{" "}
                  {pillar.loads.footingPressureKNm2?.toFixed(0) ?? "—"} kN/m²
                </li>
              </ul>
            )}
            <p>
              Floors: {building.floors} · H_storey: {building.floorHeight} m ·
              SBC: {building.site?.bearingCapacityKNm2 ?? "—"} kN/m²
            </p>
          </div>
        )}

        {/* ——— AI OPTIONS ——— */}
        {tab === "ai" && (
          <div className="space-y-2">
            <p className="text-xs text-slate-600">
              Multiple safe structural options regenerate when you edit members.
            </p>
            {designOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => applyDesignOption(opt)}
                className={cn(
                  "w-full rounded-2xl border px-3 py-3 text-left transition hover:border-primary/40 hover:bg-primary/5",
                  opt.recommended
                    ? "border-primary/40 bg-primary/5"
                    : "border-slate-100"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-slate-900">
                    {opt.label}
                    {opt.recommended && (
                      <span className="ml-2 text-[10px] font-bold uppercase text-primary">
                        Recommended
                      </span>
                    )}
                  </span>
                  <StatusBadge status={opt.status} />
                </div>
                <p className="mt-1 font-mono text-xs text-slate-700">
                  {opt.section} · {opt.rebar} · {opt.stirrups}
                </p>
                <div className="mt-2 grid grid-cols-2 gap-1 text-[11px] text-slate-500">
                  <span>Safety {opt.safetyRating}%</span>
                  <span>{formatCurrency(opt.estimatedCost)}</span>
                  <span>Steel {opt.steelKg} kg</span>
                  <span>Conc. {opt.concreteM3} m³</span>
                  <span className="col-span-2 capitalize">
                    Difficulty: {opt.difficulty}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-400">{opt.rationale}</p>
              </button>
            ))}
            {!designOptions.length && (
              <p className="text-xs text-slate-500">
                Select a column, beam, or slab to see AI options.
              </p>
            )}
          </div>
        )}

        {/* ——— CHECK ——— */}
        {tab === "check" && (
          <div className="space-y-3">
            {(
              pillar?.check?.warnings ??
              beam?.check?.warnings ??
              slab?.check?.warnings ??
              []
            ).map((w) => (
              <p
                key={w}
                className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
              >
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                {w}
              </p>
            ))}
            {relatedAdvisor.slice(0, 8).map((a) => (
              <div
                key={a.id}
                className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"
              >
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {a.severity === "critical" ? (
                    <ShieldAlert size={12} className="text-red-500" />
                  ) : a.severity === "warning" ? (
                    <AlertTriangle size={12} className="text-amber-500" />
                  ) : a.severity === "recommendation" ? (
                    <Sparkles size={12} className="text-primary" />
                  ) : (
                    <Info size={12} className="text-slate-400" />
                  )}
                  {a.severity}
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {a.title}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-600">
                  {a.body}
                </p>
                {a.suggestedAction && (
                  <p className="mt-2 text-xs font-medium text-primary">
                    {a.suggestedAction}
                  </p>
                )}
              </div>
            ))}
            {recommendations.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Quick apply
                </p>
                {recommendations.slice(0, 4).map((r) => (
                  <button
                    key={`${r.kind}-${r.memberId}-${r.recommended}`}
                    type="button"
                    onClick={() => applyEngineeringRecommendation(r)}
                    className="flex w-full flex-col rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-left transition hover:bg-primary/10"
                  >
                    <span className="text-xs font-semibold text-slate-900">
                      {r.kind}: {r.current} → {r.recommended}
                    </span>
                    <span className="mt-0.5 text-[11px] text-slate-500">
                      {r.reason}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {!recommendations.length && status === "safe" && (
              <p className="flex items-center gap-2 text-xs text-emerald-600">
                <CheckCircle2 size={14} /> Teaching checks OK for current loads.
              </p>
            )}
          </div>
        )}

        {/* ——— FOOTING / SITE ——— */}
        {tab === "site" && (
          <>
            <Field label="Foundation type">
              <SelectInput
                value={
                  (building.foundation?.type ?? "isolated") as
                    | "isolated"
                    | "combined"
                    | "strip"
                    | "raft"
                    | "pile"
                }
                options={
                  ["isolated", "combined", "strip", "raft", "pile"] as const
                }
                onChange={(type) => setFoundation({ type })}
                format={(t) =>
                  t === "isolated"
                    ? "Pad footing"
                    : t === "pile"
                      ? "Pile cap"
                      : t.charAt(0).toUpperCase() + t.slice(1)
                }
              />
            </Field>
            <Field label="Length">
              <NumInput
                value={building.foundation?.length ?? 1.5}
                step={0.1}
                min={0.8}
                max={6}
                unit="m"
                onChange={(length) => setFoundation({ length })}
              />
            </Field>
            <Field label="Width">
              <NumInput
                value={building.foundation?.width ?? 1.5}
                step={0.1}
                min={0.8}
                max={6}
                unit="m"
                onChange={(width) => setFoundation({ width })}
              />
            </Field>
            <Field label="Depth (thickness)">
              <NumInput
                value={building.foundation?.thickness ?? 0.45}
                step={0.05}
                min={0.3}
                max={1.5}
                unit="m"
                onChange={(thickness) => setFoundation({ thickness })}
              />
            </Field>
            <Field label="Foundation level">
              <NumInput
                value={building.foundation?.foundationLevel ?? -1.5}
                step={0.1}
                min={-5}
                max={0}
                unit="m"
                onChange={(foundationLevel) =>
                  setFoundation({ foundationLevel })
                }
              />
            </Field>
            <Field label="Concrete grade">
              <SelectInput
                value={
                  (building.foundation?.concreteGrade ?? "M25") as ConcreteGrade
                }
                options={["M20", "M25", "M30", "M35", "M40"] as const}
                onChange={(concreteGrade) => setFoundation({ concreteGrade })}
              />
            </Field>
            <Field label="Bottom mesh ⌀">
              <SelectInput
                value={
                  (building.foundation?.bottomMesh?.diameterMm ??
                    building.foundation?.mainBars.diameterMm ??
                    12) as BarDiameterMm
                }
                options={MAIN_BAR_DIAMETERS_MM}
                onChange={(diameterMm) =>
                  setFoundation({
                    bottomMesh: {
                      diameterMm,
                      count: building.foundation?.bottomMesh?.count ?? 8,
                      spacingMm:
                        building.foundation?.bottomMesh?.spacingMm ?? 150,
                    },
                  })
                }
                format={(d) => `${d} mm`}
              />
            </Field>
            <Field label="Top mesh ⌀">
              <SelectInput
                value={
                  (building.foundation?.topMesh?.diameterMm ?? 10) as BarDiameterMm
                }
                options={MAIN_BAR_DIAMETERS_MM}
                onChange={(diameterMm) =>
                  setFoundation({
                    topMesh: {
                      diameterMm,
                      count: building.foundation?.topMesh?.count ?? 6,
                      spacingMm: building.foundation?.topMesh?.spacingMm ?? 200,
                    },
                  })
                }
                format={(d) => `${d} mm`}
              />
            </Field>
            <Field label="Soil bearing capacity">
              <NumInput
                value={building.site?.bearingCapacityKNm2 ?? 200}
                step={10}
                min={50}
                max={600}
                unit="kN/m²"
                onChange={(bearingCapacityKNm2) =>
                  setSite({ bearingCapacityKNm2 })
                }
              />
            </Field>
            <Field label="Earthquake zone">
              <SelectInput
                value={(building.site?.earthquakeZone ?? "III") as "II" | "III" | "IV" | "V"}
                options={["II", "III", "IV", "V"] as const}
                onChange={(earthquakeZone) => setSite({ earthquakeZone })}
                format={(z) => `Zone ${z}`}
              />
            </Field>
          </>
        )}
      </div>
    </aside>
  );
}
