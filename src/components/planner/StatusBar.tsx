"use client";

import { useEffect, useState } from "react";
import { useStructureStore } from "@/store/useStructureStore";
import { formatLength } from "@/lib/units";
import { useLengthUnit } from "@/lib/use-length-unit";

export default function StatusBar() {
  const tool = useStructureStore((s) => s.tool);
  const activeFloor = useStructureStore((s) => s.activeFloor);
  const building = useStructureStore((s) => s.building);
  const viewFlags = useStructureStore((s) => s.viewFlags);
  const selectedPillarId = useStructureStore((s) => s.selectedPillarId);
  const selectedBeamId = useStructureStore((s) => s.selectedBeamId);
  const selectedWallId = useStructureStore((s) => s.selectedWallId);
  const selectedStairId = useStructureStore((s) => s.selectedStairId);
  const selectedOpeningId = useStructureStore((s) => s.selectedOpeningId);
  const selectedSlabId = useStructureStore((s) => s.selectedSlabId);
  const floors = useStructureStore((s) => s.floors);
  const floorPlates = useStructureStore((s) => s.floorPlates);
  const { unit } = useLengthUnit();
  const [fps, setFps] = useState<number | null>(null);

  useEffect(() => {
    // FPS counter is a continuous rAF loop — only useful while developing.
    if (process.env.NODE_ENV === "production") return;
    let frames = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      frames += 1;
      if (now - last >= 1000) {
        setFps(frames);
        frames = 0;
        last = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const plate = floorPlates.find((p) => p.floor === activeFloor);
  const floor = floors.find((item) => item.floorNumber === activeFloor);
  const pillars = floor?.pillars ?? [];
  const beams = floor?.beams ?? [];
  const slabs = floor?.slabs ?? [];
  const selection =
    pillars.find((p) => p.id === selectedPillarId)?.name ||
    beams.find((b) => b.id === selectedBeamId)?.name ||
    plate?.walls.find((w) => w.id === selectedWallId)?.name ||
    plate?.stairs.find((s) => s.id === selectedStairId)?.name ||
    plate?.openings.find((o) => o.id === selectedOpeningId)?.name ||
    slabs.find((s) => s.id === selectedSlabId)?.name ||
    "None";

  return (
    <footer className="flex h-8 shrink-0 items-center gap-3 border-t border-[#e2e8f0] bg-white px-3 text-[11px] text-[#64748b]">
      <span className="font-medium capitalize text-[#334155]">Tool: {tool}</span>
      <span className="text-[#cbd5e1]">|</span>
      <span>{floor?.name ?? `Floor ${activeFloor}`}</span>
      <span className="text-[#cbd5e1]">|</span>
      <span>
        Grid{" "}
        {viewFlags.snapToGrid
          ? formatLength(viewFlags.gridSizeM, unit)
          : "off"}
      </span>
      <span className="text-[#cbd5e1]">|</span>
      <span className="truncate">
        Selected: <span className="font-medium text-[#334155]">{selection}</span>
      </span>
      <span className="ml-auto tabular-nums">
        {building.width.toFixed(1)}×{building.length.toFixed(1)} m
        {fps != null ? ` · ${fps} fps` : ""}
      </span>
    </footer>
  );
}
