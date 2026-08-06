"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Download,
  FileImage,
  FileJson,
  MoreHorizontal,
  PanelLeft,
  PanelRight,
  SquarePen,
} from "lucide-react";
import LeftSidebar from "@/components/panels/LeftSidebar";
import RightCostPanel from "@/components/panels/RightCostPanel";
import GuidedActionBar from "@/components/planner/GuidedActionBar";
import PropertyInspector from "@/components/planner/PropertyInspector";
import SceneTree from "@/components/planner/SceneTree";
import StatusBar from "@/components/planner/StatusBar";
import ToolBar from "@/components/planner/ToolBar";
import { useIsCompact, useIsMobile } from "@/hooks/useMediaQuery";
import { formatCurrency } from "@/lib/cost-estimator";
import {
  exportFloorPlanPng,
  exportFloorPlanSvg,
} from "@/lib/export-floorplan";
import { exportImage, exportJson, exportPdf } from "@/lib/export-report";
import { cn } from "@/lib/utils";
import { useStructureStore } from "@/store/useStructureStore";

const StructureCanvas = dynamic(() => import("@/components/canvas/Scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#1a2332] text-sm text-white/60">
      Loading 3D workspace…
    </div>
  ),
});

export default function PlannerShell({
  projectName = "Demo Structure",
}: {
  projectName?: string;
}) {
  const initDemo = useStructureStore((s) => s.initDemo);
  const hydrated = useStructureStore((s) => s.hydrated);
  const building = useStructureStore((s) => s.building);
  const estimate = useStructureStore((s) => s.estimate);
  const pillars = useStructureStore((s) => s.pillars);
  const beams = useStructureStore((s) => s.beams);
  const slabs = useStructureStore((s) => s.slabs);
  const floorPlates = useStructureStore((s) => s.floorPlates);
  const activeFloor = useStructureStore((s) => s.activeFloor);
  const leftOpen = useStructureStore((s) => s.leftOpen);
  const rightOpen = useStructureStore((s) => s.rightOpen);
  const setLeftOpen = useStructureStore((s) => s.setLeftOpen);
  const setRightOpen = useStructureStore((s) => s.setRightOpen);
  const inspectorOpen = useStructureStore((s) => s.inspectorOpen);
  const setInspectorOpen = useStructureStore((s) => s.setInspectorOpen);
  const undo = useStructureStore((s) => s.undo);
  const redo = useStructureStore((s) => s.redo);
  const nudgeSelected = useStructureStore((s) => s.nudgeSelected);
  const viewMode = useStructureStore((s) => s.viewMode);
  const setViewMode = useStructureStore((s) => s.setViewMode);
  const setTool = useStructureStore((s) => s.setTool);
  const setWallDraftStart = useStructureStore((s) => s.setWallDraftStart);
  const clearSelection = useStructureStore((s) => s.clearSelection);
  const clearMultiSelect = useStructureStore((s) => s.clearMultiSelect);
  const [exportError, setExportError] = useState("");
  const [exportMenu, setExportMenu] = useState(false);

  const compact = useIsCompact();
  const mobile = useIsMobile();

  useEffect(() => {
    if (!hydrated) initDemo();
  }, [hydrated, initDemo]);

  // Default to canvas-first on tablets/phones; keep cost panel closed on desktop too
  useEffect(() => {
    if (compact) {
      setLeftOpen(false);
      setRightOpen(false);
    } else {
      setLeftOpen(true);
    }
  }, [compact, setLeftOpen, setRightOpen]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setExportMenu(false);
        if (viewMode === "inside") {
          setViewMode("orbit");
        }
        // Cancel any in-progress wall draft, drop out of group-select, and
        // deselect — Escape should always get you back to a clean state.
        setWallDraftStart(null);
        setTool("select");
        clearMultiSelect();
        clearSelection();
        if (compact) {
          setLeftOpen(false);
          setRightOpen(false);
          setInspectorOpen(false);
        }
      }
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || target?.isContentEditable) {
        return;
      }
      const mod = e.ctrlKey || e.metaKey;
      if (!mod && (e.key === "f" || e.key === "F")) {
        e.preventDefault();
        useStructureStore.getState().requestFocusSelection();
      } else if (!mod && (e.key === "i" || e.key === "I")) {
        e.preventDefault();
        const vf = useStructureStore.getState().viewFlags;
        useStructureStore
          .getState()
          .setViewFlags({ isolateSelection: !vf.isolateSelection });
      } else if (!mod && (e.key === "g" || e.key === "G")) {
        e.preventDefault();
        const vf = useStructureStore.getState().viewFlags;
        const next =
          vf.gizmoMode === "off"
            ? "translate"
            : vf.gizmoMode === "translate"
              ? "rotate"
              : "off";
        useStructureStore.getState().setViewFlags({ gizmoMode: next });
      }
      if (mod && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (mod && e.key.toLowerCase() === "y") ||
        (mod && e.shiftKey && e.key.toLowerCase() === "z")
      ) {
        e.preventDefault();
        redo();
      }

      // Delete/Backspace removes whatever is currently selected — pillar,
      // wall, door/window, stair, or an entire ctrl-selected group.
      if ((e.key === "Delete" || e.key === "Backspace") && !mod) {
        const s = useStructureStore.getState();
        if (s.multiSelectedPillarIds.length) {
          e.preventDefault();
          s.pushHistory();
          s.multiSelectedPillarIds.forEach((id) => s.removePillar(id));
          s.clearMultiSelect();
        } else if (s.selectedPillarId) {
          e.preventDefault();
          s.removePillar(s.selectedPillarId);
        } else if (s.selectedWallId) {
          e.preventDefault();
          s.removeWall(s.selectedWallId);
        } else if (s.selectedOpeningId) {
          e.preventDefault();
          s.removeOpening(s.selectedOpeningId);
        } else if (s.selectedStairId) {
          e.preventDefault();
          s.removeStair(s.selectedStairId);
        }
      }

      // Fine move: Shift+arrows (orbit) or Shift+arrows while inside
      const step = e.altKey ? 0.05 : 0.25;
      if (e.shiftKey && e.key.startsWith("Arrow")) {
        e.preventDefault();
        if (e.key === "ArrowLeft") nudgeSelected(-step, 0);
        if (e.key === "ArrowRight") nudgeSelected(step, 0);
        if (e.key === "ArrowUp") nudgeSelected(0, -step);
        if (e.key === "ArrowDown") nudgeSelected(0, step);
      } else if (viewMode === "orbit" && e.key.startsWith("Arrow")) {
        e.preventDefault();
        if (e.key === "ArrowLeft") nudgeSelected(-step, 0);
        if (e.key === "ArrowRight") nudgeSelected(step, 0);
        if (e.key === "ArrowUp") nudgeSelected(0, -step);
        if (e.key === "ArrowDown") nudgeSelected(0, step);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    undo,
    redo,
    compact,
    setLeftOpen,
    setRightOpen,
    nudgeSelected,
    viewMode,
    setViewMode,
    setTool,
    setWallDraftStart,
    clearSelection,
    clearMultiSelect,
  ]);

  const payload = {
    project: projectName,
    building,
    pillars,
    beams,
    slabs,
    estimate,
    floorPlates,
    activeFloor,
  };

  const floorPlanPayload = {
    project: projectName,
    building,
    pillars,
    beams,
    floorPlates,
    activeFloor,
  };

  const runExport = async (
    kind: "json" | "png" | "pdf" | "plan-png" | "plan-svg"
  ) => {
    setExportError("");
    setExportMenu(false);
    try {
      if (kind === "json") exportJson(payload);
      else if (kind === "png") exportImage(projectName);
      else if (kind === "plan-png") exportFloorPlanPng(floorPlanPayload);
      else if (kind === "plan-svg") exportFloorPlanSvg(floorPlanPayload);
      else await exportPdf(payload);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Export failed");
    }
  };

  return (
    <div className="app-shell flex flex-col overflow-hidden bg-[#f4f6f8]">
      <header className="z-30 flex h-12 shrink-0 items-center justify-between gap-2 border-b border-[#d8dee7] bg-white/95 px-2 backdrop-blur pt-safe sm:h-14 sm:px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {compact && (
            <button
              type="button"
              onClick={() => {
                setRightOpen(false);
                setLeftOpen(!leftOpen);
              }}
              className={cn(
                "inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-[#d5dce5]",
                leftOpen ? "bg-[#fff1e8] text-[#3D5AFE]" : "text-[#5b6570]"
              )}
              aria-label="Toggle properties"
            >
              <PanelLeft size={18} />
            </button>
          )}

          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 font-display text-base tracking-tight text-[#121820] sm:text-lg"
          >
            <Image
              src="/buildvision.webp"
              alt="BuildVision"
              width={40}
              height={40}
              className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10"
            />
            <span className="truncate">BuildVision</span>
          </Link>

          <span className="hidden h-4 w-px bg-[#d5dce5] md:block" />
          <div className="hidden min-w-0 md:block">
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#94a3b8]">
              Project
            </p>
            <p className="truncate text-sm font-medium text-[#121820]">
              {projectName}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="hidden rounded-full bg-[#fff1e8] px-3 py-1.5 text-xs font-medium text-[#3D5AFE] lg:block">
            Live · {formatCurrency(estimate.totalCost)}
          </div>

          {compact && (
            <button
              type="button"
              onClick={() => {
                setLeftOpen(false);
                setRightOpen(!rightOpen);
              }}
              className={cn(
                "inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-[#d5dce5]",
                rightOpen ? "bg-[#fff1e8] text-[#3D5AFE]" : "text-[#5b6570]"
              )}
              aria-label="Toggle cost panel"
            >
              <PanelRight size={18} />
            </button>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setExportMenu((v) => !v)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#121820] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563EB]"
              aria-label="Export options"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Export</span>
              <MoreHorizontal size={14} className="sm:hidden" />
            </button>
            {exportMenu && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-40 cursor-default"
                  aria-label="Close export menu"
                  onClick={() => setExportMenu(false)}
                />
                <div className="absolute right-0 top-12 z-50 w-52 overflow-hidden rounded-2xl border border-[#e2e8f0] bg-white shadow-xl">
                  <button
                    type="button"
                    onClick={() => runExport("plan-png")}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-[#f8fafc]"
                  >
                    <SquarePen size={14} /> Floor plan (PNG)
                  </button>
                  <button
                    type="button"
                    onClick={() => runExport("pdf")}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-[#f8fafc]"
                  >
                    <Download size={14} /> PDF report
                  </button>
                  <button
                    type="button"
                    onClick={() => runExport("png")}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-[#f8fafc]"
                  >
                    <FileImage size={14} /> 3D image
                  </button>
                  <button
                    type="button"
                    onClick={() => runExport("json")}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-[#f8fafc]"
                  >
                    <FileJson size={14} /> Project JSON
                  </button>
                  <button
                    type="button"
                    onClick={() => runExport("plan-svg")}
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-[#f8fafc]"
                  >
                    <SquarePen size={14} /> Floor plan (SVG)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {exportError && (
        <div className="bg-[#fff1e8] px-4 py-2 text-center text-xs text-[#c94d12]">
          {exportError}
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        <LeftSidebar />
        <main className={cn("relative flex min-w-0 flex-1 flex-col", mobile && "pb-28")}>
          <div className="relative min-h-0 flex-1">
            <ToolBar />
            <StructureCanvas />
            <GuidedActionBar />
            {compact && (
              <div className="pointer-events-none absolute left-3 top-[7.5rem] z-20 rounded-full bg-[#121820]/80 px-3 py-1 text-[11px] font-medium text-white backdrop-blur md:hidden">
                {formatCurrency(estimate.totalCost)}
              </div>
            )}
          </div>
          <StatusBar />
        </main>

        {/* Docked Revit-style inspector — not a floating popup */}
        {inspectorOpen && (
          <aside
            className={cn(
              "z-30 flex w-[min(100%,360px)] shrink-0 flex-col border-l border-[#e2e8f0] bg-white",
              compact &&
                "absolute inset-y-0 right-0 shadow-2xl"
            )}
            aria-label="Property inspector"
          >
            <div className="flex items-center justify-between border-b border-[#eef2f6] px-3 py-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2563EB]">
                Inspector
              </p>
              <button
                type="button"
                onClick={() => setInspectorOpen(false)}
                className="rounded-lg px-2 py-1 text-[11px] font-medium text-[#94a3b8] hover:bg-[#f8fafc] hover:text-[#121820]"
              >
                Hide
              </button>
            </div>
            <SceneTree />
            <div className="min-h-0 flex-1 overflow-hidden">
              <PropertyInspector variant="docked" />
            </div>
          </aside>
        )}

        <RightCostPanel />
      </div>
    </div>
  );
}
