"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import PlannerShell from "@/components/planner/PlannerShell";
import { api } from "@/lib/api";
import { useStructureStore, type PersistedDesign } from "@/store/useStructureStore";

export type SaveStatus = "saving" | "saved" | "offline" | "failed" | "local";

function currentDesign(): PersistedDesign {
  const s = useStructureStore.getState();
  return { schemaVersion: 1, building: s.building, activeFloor: s.activeFloor,
    pillars: s.pillars, beams: s.beams, slabs: s.slabs, floorPlates: s.floorPlates };
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
          const design = await api.getBuildingDesign<PersistedDesign>(match.id);
          if (cancelled) return;
          if (design.success && design.data?.snapshot?.schemaVersion === 1) {
            hydrateFromDesign(design.data.snapshot);
            versionRef.current = design.data.version;
          } else {
            hydrateFromMeta({
            name: match.name || nameParam || "Structure",
            width: match.width || 30,
            length: match.length || 20,
            floors: match.total_floors || 3,
            floorHeight: 3.5,
            });
            versionRef.current = design.data?.version || 0;
          }
          lastSavedRef.current = JSON.stringify(currentDesign());
          setActiveBuildingId(match.id);
          setSaveStatus(design.success ? "saved" : "offline");
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
        const result = await api.saveBuildingDesign(activeBuildingId, snapshot, versionRef.current);
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
