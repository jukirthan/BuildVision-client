"use client";

import { TransformControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useStructureStore } from "@/store/useStructureStore";

/**
 * Iron Man–style viewport gizmo for the selected pillar or stair.
 * Lives in building-local space (same group as meshes).
 */
export default function SelectionGizmo({
  pillarHeight,
}: {
  /** Full column height used to place the gizmo mid-height. */
  pillarHeight: number;
}) {
  const tool = useStructureStore((s) => s.tool);
  const gizmoMode = useStructureStore((s) => s.viewFlags.gizmoMode);
  const snapToGrid = useStructureStore((s) => s.viewFlags.snapToGrid);
  const gridSizeM = useStructureStore((s) => s.viewFlags.gridSizeM);
  const pillar = useStructureStore((s) =>
    s.selectedPillarId
      ? s.pillars.find((p) => p.id === s.selectedPillarId)
      : undefined
  );
  const stair = useStructureStore((s) => {
    if (!s.selectedStairId) return undefined;
    for (const plate of s.floorPlates) {
      const hit = plate.stairs.find((st) => st.id === s.selectedStairId);
      if (hit) return hit;
    }
    return undefined;
  });
  const building = useStructureStore((s) => s.building);
  const movePillar = useStructureStore((s) => s.movePillar);
  const moveStair = useStructureStore((s) => s.moveStair);
  const updatePillar = useStructureStore((s) => s.updatePillar);
  const updateStair = useStructureStore((s) => s.updateStair);
  const setDragging = useStructureStore((s) => s.setDragging);
  const pushHistory = useStructureStore((s) => s.pushHistory);

  const { controls, invalidate } = useThree();
  const proxyRef = useRef<THREE.Group>(null);
  const [ready, setReady] = useState(false);
  const draggingRef = useRef(false);

  const target = useMemo(() => {
    if (pillar) {
      return {
        kind: "pillar" as const,
        id: pillar.id,
        x: pillar.x,
        y: pillar.y,
        rot: pillar.rotationDeg ?? 0,
        elev: pillarHeight / 2,
      };
    }
    if (stair) {
      return {
        kind: "stair" as const,
        id: stair.id,
        x: stair.x,
        y: stair.y,
        rot: stair.rotationDeg ?? 0,
        elev:
          (stair.floor - 1) * building.floorHeight +
          building.floorHeight * 0.35,
      };
    }
    return null;
  }, [pillar, stair, pillarHeight, building.floorHeight]);

  const mode =
    gizmoMode === "rotate"
      ? "rotate"
      : gizmoMode === "translate"
        ? "translate"
        : null;

  useLayoutEffect(() => {
    setReady(Boolean(proxyRef.current));
  }, [target, mode]);

  // Keep proxy aligned with store while not dragging the gizmo.
  useLayoutEffect(() => {
    const obj = proxyRef.current;
    if (!obj || !target || draggingRef.current) return;
    obj.position.set(target.x, target.elev, target.y);
    obj.rotation.set(0, (target.rot * Math.PI) / 180, 0);
    obj.updateMatrixWorld(true);
    invalidate();
  }, [target, invalidate]);

  useEffect(() => {
    return () => {
      draggingRef.current = false;
      const orbit = controls as { enabled?: boolean } | null;
      if (orbit && "enabled" in orbit) orbit.enabled = true;
    };
  }, [controls]);

  if (tool !== "select" || !mode || !target) return null;

  const snap = (v: number) =>
    snapToGrid && gridSizeM > 0 ? Math.round(v / gridSizeM) * gridSizeM : v;

  const applyFromProxy = () => {
    const obj = proxyRef.current;
    if (!obj) return;
    if (mode === "translate") {
      const x = Math.min(Math.max(snap(obj.position.x), 0), building.width);
      const y = Math.min(Math.max(snap(obj.position.z), 0), building.length);
      obj.position.x = x;
      obj.position.z = y;
      // Keep elevation locked to member mid-height.
      obj.position.y = target.elev;
      if (target.kind === "pillar") movePillar(target.id, x, y);
      else moveStair(target.id, x, y);
    } else {
      let deg = ((obj.rotation.y * 180) / Math.PI) % 360;
      if (deg < 0) deg += 360;
      // Snap to 5° for clean BIM orientations.
      deg = Math.round(deg / 5) * 5;
      obj.rotation.set(0, (deg * Math.PI) / 180, 0);
      if (target.kind === "pillar") updatePillar(target.id, { rotationDeg: deg });
      else updateStair(target.id, { rotationDeg: deg });
    }
    invalidate();
  };

  return (
    <>
      <group ref={proxyRef} />
      {ready && proxyRef.current && (
        <TransformControls
          key={`${target.kind}-${target.id}-${mode}`}
          object={proxyRef.current}
          mode={mode}
          size={0.85}
          space="local"
          showX={mode === "translate" || mode === "rotate"}
          showY={mode === "rotate"}
          showZ={mode === "translate" || mode === "rotate"}
          translationSnap={snapToGrid ? gridSizeM : null}
          rotationSnap={mode === "rotate" ? (5 * Math.PI) / 180 : null}
          onMouseDown={() => {
            draggingRef.current = true;
            pushHistory();
            setDragging(true);
            const orbit = controls as { enabled?: boolean } | null;
            if (orbit && "enabled" in orbit) orbit.enabled = false;
          }}
          onMouseUp={() => {
            applyFromProxy();
            draggingRef.current = false;
            setDragging(false);
            const orbit = controls as { enabled?: boolean } | null;
            if (orbit && "enabled" in orbit) orbit.enabled = true;
          }}
          onObjectChange={() => {
            invalidate();
            // Live preview while translating (positions only — no full rebuild mid-drag).
            if (!draggingRef.current || mode !== "translate") return;
            const obj = proxyRef.current;
            if (!obj) return;
            const x = Math.min(Math.max(obj.position.x, 0), building.width);
            const y = Math.min(Math.max(obj.position.z, 0), building.length);
            obj.position.y = target.elev;
            if (target.kind === "pillar") movePillar(target.id, x, y);
            else moveStair(target.id, x, y);
          }}
        />
      )}
    </>
  );
}
