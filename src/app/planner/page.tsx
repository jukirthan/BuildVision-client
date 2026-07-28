"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import PlannerShell from "@/components/planner/PlannerShell";
import { api } from "@/lib/api";
import { useStructureStore } from "@/store/useStructureStore";

function PlannerLoader() {
  const params = useSearchParams();
  const projectId = Number(params.get("projectId") || 0);
  const buildingId = Number(params.get("buildingId") || 0);
  const nameParam = params.get("name");
  const hydrateFromMeta = useStructureStore((s) => s.hydrateFromMeta);
  const initDemo = useStructureStore((s) => s.initDemo);
  const [title, setTitle] = useState(nameParam || "Demo Structure");
  const [ready, setReady] = useState(false);

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
          hydrateFromMeta({
            name: match.name || nameParam || "Structure",
            width: match.width || 30,
            length: match.length || 20,
            floors: match.total_floors || 3,
            floorHeight: 3.5,
          });
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
  }, [projectId, buildingId, nameParam, hydrateFromMeta, initDemo]);

  if (!ready) {
    return (
      <div className="flex h-dvh items-center justify-center bg-[#1a2332] text-sm text-white/60">
        Preparing planner…
      </div>
    );
  }

  return <PlannerShell projectName={title} />;
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
