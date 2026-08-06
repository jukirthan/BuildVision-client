"use client";

import {
  BrickWall,
  Columns3,
  DoorOpen,
  Footprints,
  Layers3,
  PanelTop,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStructureStore } from "@/store/useStructureStore";

type TreeItem = {
  id: string;
  label: string;
  kind: "pillar" | "beam" | "wall" | "stair" | "door" | "window" | "slab";
  selected: boolean;
  onSelect: () => void;
};

export default function SceneTree() {
  const pillars = useStructureStore((s) => s.pillars);
  const beams = useStructureStore((s) => s.beams);
  const slabs = useStructureStore((s) => s.slabs);
  const floorPlates = useStructureStore((s) => s.floorPlates);
  const activeFloor = useStructureStore((s) => s.activeFloor);
  const selectedPillarId = useStructureStore((s) => s.selectedPillarId);
  const selectedBeamId = useStructureStore((s) => s.selectedBeamId);
  const selectedSlabId = useStructureStore((s) => s.selectedSlabId);
  const selectedWallId = useStructureStore((s) => s.selectedWallId);
  const selectedStairId = useStructureStore((s) => s.selectedStairId);
  const selectedOpeningId = useStructureStore((s) => s.selectedOpeningId);
  const selectPillar = useStructureStore((s) => s.selectPillar);
  const selectBeam = useStructureStore((s) => s.selectBeam);
  const selectSlab = useStructureStore((s) => s.selectSlab);
  const selectWall = useStructureStore((s) => s.selectWall);
  const selectStair = useStructureStore((s) => s.selectStair);
  const selectOpening = useStructureStore((s) => s.selectOpening);
  const setInspectorOpen = useStructureStore((s) => s.setInspectorOpen);

  const plate = floorPlates.find((p) => p.floor === activeFloor);
  const floorPillars = pillars.filter((p) => (p.floor ?? 1) === activeFloor);
  // Beams/slabs are not floor-tagged; associate beams with pillars on this floor
  // by endpoint proximity (same matching tolerance as the structural engine).
  const floorBeams = beams.filter((b) =>
    floorPillars.some(
      (p) =>
        Math.hypot(p.x - b.startX, p.y - b.startY) < 0.4 ||
        Math.hypot(p.x - b.endX, p.y - b.endY) < 0.4
    )
  );
  // Slabs are building-wide; show them on floor 1 so the tree stays useful.
  const floorSlabs = activeFloor === 1 ? slabs : [];
  const building = useStructureStore((s) => s.building);
  const setBuilding = useStructureStore((s) => s.setBuilding);

  const items: TreeItem[] = [
    ...floorPillars.map((p) => ({
      id: p.id,
      label: p.name,
      kind: "pillar" as const,
      selected: selectedPillarId === p.id,
      onSelect: () => {
        selectPillar(p.id);
        setInspectorOpen(true);
      },
    })),
    ...floorBeams.map((b) => ({
      id: b.id,
      label: b.name,
      kind: "beam" as const,
      selected: selectedBeamId === b.id,
      onSelect: () => {
        selectBeam(b.id);
        setInspectorOpen(true);
      },
    })),
    ...(plate?.walls ?? []).map((w) => ({
      id: w.id,
      label: w.name,
      kind: "wall" as const,
      selected: selectedWallId === w.id,
      onSelect: () => {
        selectWall(w.id);
        setInspectorOpen(true);
      },
    })),
    ...(plate?.stairs ?? []).map((s) => ({
      id: s.id,
      label: s.name,
      kind: "stair" as const,
      selected: selectedStairId === s.id,
      onSelect: () => {
        selectStair(s.id);
        setInspectorOpen(true);
      },
    })),
    ...(plate?.openings ?? []).map((o) => ({
      id: o.id,
      label: o.name,
      kind: (o.type === "door" ? "door" : "window") as "door" | "window",
      selected: selectedOpeningId === o.id,
      onSelect: () => {
        selectOpening(o.id);
        setInspectorOpen(true);
      },
    })),
    ...floorSlabs.map((s) => ({
      id: s.id,
      label: s.name,
      kind: "slab" as const,
      selected: selectedSlabId === s.id,
      onSelect: () => {
        selectSlab(s.id);
        setInspectorOpen(true);
      },
    })),
  ];

  const iconFor = (kind: TreeItem["kind"]) => {
    switch (kind) {
      case "pillar":
        return Columns3;
      case "beam":
        return Layers3;
      case "wall":
        return BrickWall;
      case "stair":
        return Footprints;
      case "door":
        return DoorOpen;
      case "window":
        return PanelTop;
      default:
        return Layers3;
    }
  };

  return (
    <div className="flex max-h-52 flex-col border-b border-[#eef2f6]">
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8]">
          Scene · Floor {activeFloor}
        </p>
        <span className="text-[10px] tabular-nums text-[#94a3b8]">
          {items.length}
        </span>
      </div>
      <div className="flex gap-1 px-2 pb-1">
        <button
          type="button"
          onClick={() =>
            setBuilding({ showFoundation: !building.showFoundation })
          }
          className={cn(
            "rounded-md px-2 py-1 text-[10px] font-semibold",
            building.showFoundation
              ? "bg-[#2563EB]/10 text-[#2563EB]"
              : "bg-[#f8fafc] text-[#94a3b8]"
          )}
          title="Toggle foundation visibility"
        >
          Foundation · {building.foundation?.type ?? "pad"}
        </button>
        <button
          type="button"
          onClick={() =>
            setBuilding({ showRoof: building.showRoof === false })
          }
          className={cn(
            "rounded-md px-2 py-1 text-[10px] font-semibold",
            building.showRoof !== false
              ? "bg-[#2563EB]/10 text-[#2563EB]"
              : "bg-[#f8fafc] text-[#94a3b8]"
          )}
          title="Toggle roof visibility"
        >
          Roof · {building.roof?.type ?? building.roofType ?? "flat"}
        </button>
      </div>
      <ul className="touch-scroll min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
        {items.length === 0 && (
          <li className="px-2 py-3 text-xs text-[#94a3b8]">
            No objects on this floor yet.
          </li>
        )}
        {items.map((item) => {
          const Icon = iconFor(item.kind);
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={item.onSelect}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors",
                  item.selected
                    ? "bg-[#2563EB]/10 font-semibold text-[#2563EB]"
                    : "text-[#475569] hover:bg-[#f8fafc]"
                )}
              >
                <Icon size={13} className="shrink-0 opacity-70" />
                <span className="truncate">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
