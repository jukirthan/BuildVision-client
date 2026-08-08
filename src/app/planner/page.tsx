"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import PlannerShell from "@/components/planner/PlannerShell";
import { api } from "@/lib/api";
import { useStructureStore, type PersistedDesign } from "@/store/useStructureStore";
import type { BuildingConfig } from "@/types/structure";

export type SaveStatus = "saving" | "saved" | "offline" | "failed" | "local";

function currentDesign(): PersistedDesign {
  const s = useStructureStore.getState();
  return {
    schemaVersion: 2,
    building: s.building,
    floors: s.floors,
    activeFloorId: s.activeFloorId,
    activeFloor: s.activeFloor,
    pillars: s.pillars,
    beams: s.beams,
    slabs: s.slabs,
    floorPlates: s.floorPlates,
  };
}

function designFromStructure(
  structure: { building: unknown; floors: unknown[]; version: number; snapshot?: unknown },
  fallback: { name: string; width: number; length: number; floors: number; floorHeight: number }
): PersistedDesign | null {
  const storedSnapshot = structure.snapshot;
  if (
    storedSnapshot &&
    typeof storedSnapshot === "object" &&
    "floors" in storedSnapshot &&
    Array.isArray((storedSnapshot as { floors?: unknown[] }).floors)
  ) {
    const snapshot = storedSnapshot as PersistedDesign;
    if (snapshot.schemaVersion === 1 || snapshot.schemaVersion === 2) return snapshot;
  }
  if (!structure.floors.length) return null;
  const hasMembers = structure.floors.some((item) => {
    if (!item || typeof item !== "object") return false;
    const floor = item as { pillars?: unknown[]; beams?: unknown[]; slabs?: unknown[] };
    return Boolean(floor.pillars?.length || floor.beams?.length || floor.slabs?.length);
  });
  // A newly-created backend building has floor rows but no design yet. Let
  // the normal metadata hydration create its initial editable layout.
  if (!hasMembers) return null;
  const serverBuilding =
    structure.building && typeof structure.building === "object"
      ? (structure.building as Record<string, unknown>)
      : {};
  const building: BuildingConfig = {
    name: typeof serverBuilding.name === "string" ? serverBuilding.name : fallback.name,
    width: typeof serverBuilding.width === "number" ? serverBuilding.width : fallback.width,
    length: typeof serverBuilding.length === "number" ? serverBuilding.length : fallback.length,
    floors: structure.floors.length,
    floorHeight: fallback.floorHeight,
    showFoundation: true,
    showAllFloors: false,
  };
  const floors = structure.floors as PersistedDesign["floors"];
  return {
    schemaVersion: 2,
    building,
    floors,
    activeFloorId: floors[0]?.id,
    activeFloor: floors[0]?.floorNumber ?? 1,
  };
}

function PlannerLoader() {
  const params = useSearchParams();
  const projectId = Number(params.get("projectId") || 0);
  const buildingId = Number(params.get("buildingId") || 0);
  const nameParam = params.get("name");
  const hydrateFromMeta = useStructureStore((s) => s.hydrateFromMeta);
  const hydrateFromDesign = useStructureStore((s) => s.hydrateFromDesign);
  const initDemo = useStructureStore((s) => s.initDemo);
  const [title, setTitle] = useState(nameParam || "Demo Structure");
  const [ready, setReady] = useState(false);
  const [activeBuildingId, setActiveBuildingId] = useState(0);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("local");
  const versionRef = useRef(0);
  const lastSavedRef = useRef("");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (projectId > 0) {
        const list = await api.listBuildings(projectId);
        if (!cancelled && list.success && list.data?.length) {
          const match =
            (buildingId > 0
              ? list.data.find((b) => b.id === buildingId)
              : null) || list.data[0];
          const structure = await api.getBuildingStructure<PersistedDesign["floors"][number]>(match.id);
          if (cancelled) return;
          const fallback = {
            name: match.name || nameParam || "Structure",
            width: match.width || 30,
            length: match.length || 20,
            floors: match.total_floors || 3,
            floorHeight: 3.5,
          };
          const restored = structure.success && structure.data
            ? designFromStructure(structure.data, fallback)
            : null;
          if (restored) {
            hydrateFromDesign(restored);
            versionRef.current = structure.data?.version || 0;
          } else {
            hydrateFromMeta(fallback);
            versionRef.current = structure.data?.version || 0;
          }
          lastSavedRef.current = JSON.stringify(currentDesign());
          setActiveBuildingId(match.id);
          setSaveStatus(structure.success ? "saved" : "offline");
          setTitle(match.name || nameParam || "Structure");
          setReady(true);
          return;
        }

        const proj = await api.getProject(projectId);
        if (!cancelled && proj.success && proj.data) {
          const b = proj.data.buildings?.[0];
          hydrateFromMeta({
            name: b?.name || proj.data.name,
            width: b?.width || 30,
            length: b?.length || 20,
            floors: b?.total_floors || 3,
            floorHeight: 3.5,
          });
          setTitle(proj.data.name || nameParam || "Project");
          setReady(true);
          return;
        }
      }

      if (!cancelled) {
        initDemo();
        setTitle(nameParam || "Downtown Office Complex");
        setReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId, buildingId, nameParam, hydrateFromMeta, hydrateFromDesign, initDemo]);

  useEffect(() => {
    if (!ready || activeBuildingId <= 0) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    const unsubscribe = useStructureStore.subscribe(() => {
      const serialized = JSON.stringify(currentDesign());
      if (serialized === lastSavedRef.current) return;
      setSaveStatus("saving");
      if (timer) clearTimeout(timer);
      timer = setTimeout(async () => {
        const snapshot = currentDesign();
        const payload = JSON.stringify(snapshot);
        const result = await api.saveBuildingStructure(activeBuildingId, snapshot, versionRef.current);
        if (disposed) return;
        if (result.success && result.data) {
          versionRef.current = result.data.version;
          lastSavedRef.current = payload;
          setSaveStatus("saved");
        } else {
          const message = (result.message || "").toLowerCase();
          setSaveStatus(message.includes("cannot reach") ? "offline" : "failed");
        }
      }, 1500);
    });
    return () => { disposed = true; if (timer) clearTimeout(timer); unsubscribe(); };
  }, [ready, activeBuildingId]);

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#1a2332] text-sm text-white/60">
        Preparing planner…
      </div>
    );
  }

  return <PlannerShell projectName={title} saveStatus={saveStatus} />;
}

export default function PlannerPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-dvh items-center justify-center bg-[#1a2332] text-sm text-white/60">
          Loading planner…
        </div>
      }
    >
      <PlannerLoader />
    </Suspense>
  );
}
