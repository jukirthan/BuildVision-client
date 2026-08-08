"use client";

import type { ReactNode } from "react";
import {
  BrickWall,
  ChevronDown,
  Crosshair,
  DoorOpen,
  Eraser,
  Eye,
  Focus,
  Footprints,
  Grid3X3,
  Layers,
  MousePointer2,
  Move3D,
  PanelTop,
  PersonStanding,
  Plus,
  Redo2,
  RotateCw,
  SquareStack,
  Undo2,
} from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { useStructureStore } from "@/store/useStructureStore";
import type { EditTool } from "@/types/structure";

const PRIMARY_TOOLS: {
  id: EditTool;
  label: string;
  icon: ReactNode;
  hint: string;
}[] = [
  {
    id: "select",
    label: "Select",
    icon: <MousePointer2 size={18} />,
    hint: "Move & edit",
  },
  {
    id: "pillar",
    label: "Pillar",
    icon: <SquareStack size={18} />,
    hint: "Click floor",
  },
  {
    id: "wall",
    label: "Wall",
    icon: <BrickWall size={18} />,
    hint: "2 clicks",
  },
  {
    id: "door",
    label: "Door",
    icon: <DoorOpen size={18} />,
    hint: "Click wall",
  },
  {
    id: "window",
    label: "Window",
    icon: <PanelTop size={18} />,
    hint: "Click wall",
  },
  {
    id: "stair",
    label: "Stairs",
    icon: <Footprints size={18} />,
    hint: "Click floor",
  },
  {
    id: "delete",
    label: "Delete",
    icon: <Eraser size={18} />,
    hint: "Click object",
  },
];

export default function ToolBar() {
  const mobile = useIsMobile();
  const tool = useStructureStore((s) => s.tool);
  const setTool = useStructureStore((s) => s.setTool);
  const activeFloor = useStructureStore((s) => s.activeFloor);
  const setActiveFloor = useStructureStore((s) => s.setActiveFloor);
  const building = useStructureStore((s) => s.building);
  const addFloor = useStructureStore((s) => s.addFloor);
  const viewMode = useStructureStore((s) => s.viewMode);
  const setViewMode = useStructureStore((s) => s.setViewMode);
  const cutaway = useStructureStore((s) => s.cutaway);
  const setCutaway = useStructureStore((s) => s.setCutaway);
  const viewFlags = useStructureStore((s) => s.viewFlags);
  const setViewFlags = useStructureStore((s) => s.setViewFlags);
  const requestFocusSelection = useStructureStore((s) => s.requestFocusSelection);
  const setInspectorOpen = useStructureStore((s) => s.setInspectorOpen);
  const undo = useStructureStore((s) => s.undo);
  const redo = useStructureStore((s) => s.redo);
  const canUndo = useStructureStore((s) => s.past.length > 0);
  const canRedo = useStructureStore((s) => s.future.length > 0);
  const [moreOpen, setMoreOpen] = useState(false);

  const chip = (
    active: boolean,
    onClick: () => void,
    label: string,
    icon?: ReactNode,
    title?: string
  ) => (
    <button
      type="button"
      title={title ?? label}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition",
        active
          ? "bg-[#121820] text-white shadow-sm"
          : "text-[#5b6570] hover:bg-[#f1f5f9] hover:text-[#121820]"
      )}
    >
      {icon}
      {label}
    </button>
  );

  const tools = (
    <div className="flex items-stretch gap-1">
      {PRIMARY_TOOLS.map((t) => {
        const active = tool === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTool(t.id)}
            aria-pressed={active}
            title={`${t.label} — ${t.hint}`}
            className={cn(
              "flex min-w-[4.25rem] flex-col items-center gap-0.5 rounded-xl px-2.5 py-2 transition sm:min-w-[4.75rem]",
              active
                ? t.id === "delete"
                  ? "bg-rose-600 text-white shadow-md"
                  : "bg-[#2563EB] text-white shadow-md"
                : "text-[#475569] hover:bg-[#f1f5f9]"
            )}
          >
            {t.icon}
            <span className="text-[11px] font-semibold leading-none">
              {t.label}
            </span>
            <span
              className={cn(
                "hidden text-[9px] font-medium leading-none sm:block",
                active ? "text-white/75" : "text-[#94a3b8]"
              )}
            >
              {t.hint}
            </span>
          </button>
        );
      })}
    </div>
  );

  const history = (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        onClick={() => undo()}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#5b6570] hover:bg-[#f1f5f9] disabled:opacity-35"
      >
        <Undo2 size={17} />
      </button>
      <button
        type="button"
        onClick={() => redo()}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-[#5b6570] hover:bg-[#f1f5f9] disabled:opacity-35"
      >
        <Redo2 size={17} />
      </button>
    </div>
  );

  const view = (
    <div className="flex items-center gap-1">
      {chip(
        viewMode === "orbit" && !cutaway,
        () => {
          setViewMode("orbit");
          setCutaway(false);
        },
        "3D",
        <Eye size={14} />,
        "Full 3D view"
      )}
      {chip(
        cutaway && viewMode !== "inside",
        () => {
          setViewMode("orbit");
          setCutaway(true);
        },
        "Edit",
        <Layers size={14} />,
        "Cutaway — easiest way to place doors & walls"
      )}
      {chip(
        viewMode === "inside",
        () => setViewMode(viewMode === "inside" ? "orbit" : "inside"),
        "Walk",
        <PersonStanding size={14} />,
        "Walk inside (WASD)"
      )}
      {chip(
        false,
        () => requestFocusSelection(),
        "Focus",
        <Focus size={14} />,
        "Frame camera on selection (F)"
      )}
      {chip(
        viewFlags.isolateSelection,
        () =>
          setViewFlags({ isolateSelection: !viewFlags.isolateSelection }),
        "Isolate",
        <Crosshair size={14} />,
        "Dim everything except selection (I)"
      )}
      {chip(
        viewFlags.exploded,
        () => setViewFlags({ exploded: !viewFlags.exploded }),
        "Explode",
        <Layers size={14} />,
        "Separate floors in 3D"
      )}
    </div>
  );

  const gizmo = (
    <div className="flex items-center gap-0.5 rounded-xl bg-[#f8fafc] p-0.5">
      {chip(
        viewFlags.gizmoMode === "translate",
        () =>
          setViewFlags({
            gizmoMode:
              viewFlags.gizmoMode === "translate" ? "off" : "translate",
          }),
        "Move",
        <Move3D size={14} />,
        "3D move gizmo (G)"
      )}
      {chip(
        viewFlags.gizmoMode === "rotate",
        () =>
          setViewFlags({
            gizmoMode: viewFlags.gizmoMode === "rotate" ? "off" : "rotate",
          }),
        "Rot",
        <RotateCw size={14} />,
        "3D rotate gizmo"
      )}
    </div>
  );

  const floors = (
    <div className="flex items-center gap-1">
      <span className="hidden px-1 text-[10px] font-semibold uppercase tracking-wide text-[#94a3b8] sm:inline">
        Floor
      </span>
      {Array.from({ length: building.floors }, (_, i) => i + 1).map((f) => (
        <button
          key={f}
          type="button"
          onClick={() => setActiveFloor(f)}
          className={cn(
            "min-h-8 min-w-8 rounded-lg text-xs font-bold transition",
            activeFloor === f
              ? "bg-[#2563EB] text-white"
              : "bg-[#f1f5f9] text-[#64748b] hover:bg-[#e2e8f0]"
          )}
        >
          {f}
        </button>
      ))}
      <button
        type="button"
        onClick={() => addFloor()}
        disabled={building.floors >= 20}
        title="Add another floor"
        className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-[#121820] px-2 text-xs font-semibold text-white hover:bg-[#2563EB] disabled:opacity-40"
      >
        <Plus size={14} />
        <span className="hidden sm:inline">Floor</span>
      </button>
    </div>
  );

  const more = (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMoreOpen((v) => !v)}
        className={cn(
          "inline-flex min-h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold text-[#5b6570] hover:bg-[#f1f5f9]",
          moreOpen && "bg-[#f1f5f9] text-[#121820]"
        )}
      >
        More
        <ChevronDown
          size={14}
          className={cn("transition", moreOpen && "rotate-180")}
        />
      </button>
      {moreOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />
          <div className="absolute right-0 top-11 z-50 w-56 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white py-1 shadow-xl">
            {(
              [
                ["snapToGrid", "Snap to grid", <Grid3X3 key="g" size={14} />],
                ["showLabels", "Show names", <Eye key="e" size={14} />],
                [
                  "showReinforcement",
                  "Show rebar",
                  <Layers key="l" size={14} />,
                ],
                ["showDimensions", "Show dimensions", <Layers key="d" size={14} />],
                ["wireframe", "Wireframe", <Layers key="w" size={14} />],
              ] as const
            ).map(([key, label, icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setViewFlags({ [key]: !viewFlags[key] });
                }}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[#334155] hover:bg-[#f8fafc]"
              >
                {icon}
                <span className="flex-1">{label}</span>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase",
                    viewFlags[key] ? "text-emerald-600" : "text-[#cbd5e1]"
                  )}
                >
                  {viewFlags[key] ? "On" : "Off"}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setInspectorOpen(true);
                setMoreOpen(false);
              }}
              className="flex w-full items-center gap-2 border-t border-[#f1f5f9] px-3 py-2.5 text-left text-sm text-[#334155] hover:bg-[#f8fafc]"
            >
              Open properties panel
            </button>
          </div>
        </>
      )}
    </div>
  );

  if (mobile) {
    return (
      <div className="relative z-30 shrink-0 border-b border-[#d8dee7] bg-[#f4f6f8] px-2 py-2">
        <div className="space-y-2">
          <div className="touch-scroll overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-white/95 px-2 py-1.5 shadow-sm backdrop-blur">
            <div className="flex min-w-max items-center gap-2">
              {history}
              {view}
              {gizmo}
              {floors}
            </div>
          </div>
          <div className="touch-scroll overflow-x-auto rounded-2xl border border-[#e2e8f0] bg-white/95 p-1.5 shadow-sm backdrop-blur">
            <div className="min-w-max">{tools}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute left-1/2 top-3 z-30 flex w-[min(100%-1.5rem,72rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 px-1">
      <div className="flex items-center gap-1 rounded-2xl border border-[#e2e8f0] bg-white/95 p-1.5 shadow-lg backdrop-blur">
        {history}
        <span className="mx-1 h-8 w-px bg-[#e2e8f0]" />
        {tools}
      </div>
      <div className="flex items-center gap-1 rounded-2xl border border-[#e2e8f0] bg-white/95 p-1.5 shadow-lg backdrop-blur">
        {view}
        <span className="mx-1 h-8 w-px bg-[#e2e8f0]" />
        {gizmo}
        <span className="mx-1 h-8 w-px bg-[#e2e8f0]" />
        {floors}
        <span className="mx-1 h-8 w-px bg-[#e2e8f0]" />
        {more}
      </div>
    </div>
  );
}
