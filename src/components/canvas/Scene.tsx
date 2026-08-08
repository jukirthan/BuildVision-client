"use client";

import { ContactShadows, Grid, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useShallow } from "zustand/react/shallow";
import InsideControls from "@/components/canvas/InsideControls";
import FocusSelectionCamera from "@/components/canvas/FocusSelectionCamera";
import PillarDistanceDimensions from "@/components/canvas/PillarDistanceDimensions";
import SelectionGizmo from "@/components/canvas/SelectionGizmo";
import {
  ActiveFloorPlane,
  BeamMesh,
  Footprint,
  FoundationSystem,
  OpeningMesh,
  PillarMesh,
  RoofMesh,
  SlabMesh,
  StairMesh,
  WallDraftPreview,
  WallMesh,
} from "@/components/canvas/StructureMeshes";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { registerExportScene } from "@/lib/export-report";
import { useStructureStore } from "@/store/useStructureStore";

function ExportBridge() {
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    registerExportScene({ gl, scene, camera });
    return () => registerExportScene(null);
  }, [gl, scene, camera]);
  return null;
}

function InitOrbitTarget() {
  const building = useStructureStore((s) => s.building);
  const floors = useStructureStore((s) => s.floors);
  const activeFloor = useStructureStore((s) => s.activeFloor);
  const { controls, invalidate } = useThree();
  const seeded = useRef(false);
  useEffect(() => {
    if (seeded.current) return;
    const orbit = controls as {
      target: THREE.Vector3;
      update?: () => void;
    } | null;
    if (!orbit?.target) return;
    orbit.target.set(
      building.width / 2,
      floors.find((floor) => floor.floorNumber === activeFloor)?.elevation ??
        (activeFloor - 1) * building.floorHeight + building.floorHeight * 0.45,
      building.length / 2
    );
    orbit.update?.();
    seeded.current = true;
    invalidate();
  }, [controls, building, floors, activeFloor, invalidate]);
  return null;
}

/** Demand-loop: only redraw when store geometry / view state changes. */
function InvalidateOnChange() {
  const invalidate = useThree((s) => s.invalidate);
  const revision = useStructureStore(
    useShallow((s) => [
      s.pillars,
      s.beams,
      s.slabs,
      s.floors,
      s.floorPlates,
      s.building,
      s.activeFloor,
      s.selectedPillarId,
      s.selectedBeamId,
      s.selectedWallId,
      s.selectedStairId,
      s.selectedOpeningId,
      s.multiSelectedPillarIds,
      s.viewFlags,
      s.viewMode,
      s.cutaway,
      s.isDragging,
      s.wallDraftStart,
      s.tool,
      s.focusToken,
    ])
  );
  useEffect(() => {
    invalidate();
  }, [revision, invalidate]);
  return null;
}

function WorkspaceHelpers({
  width,
  length,
}: {
  width: number;
  length: number;
}) {
  const size = Math.max(width, length) * 1.4;
  return (
    <>
      <Grid
        position={[width / 2, 0.01, length / 2]}
        args={[size, size]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#2a3038"
        sectionSize={5}
        sectionThickness={0.85}
        sectionColor="#3a4048"
        fadeDistance={size * 1.2}
        fadeStrength={1}
        infiniteGrid={false}
      />
    </>
  );
}

function BuildingScene() {
  const mobile = useIsMobile();
  const building = useStructureStore((s) => s.building);
  const floors = useStructureStore((s) => s.floors);
  const floorPlates = useStructureStore((s) => s.floorPlates);
  const activeFloor = useStructureStore((s) => s.activeFloor);
  const selectedPillarId = useStructureStore((s) => s.selectedPillarId);
  const selectedWallId = useStructureStore((s) => s.selectedWallId);
  const selectedStairId = useStructureStore((s) => s.selectedStairId);
  const selectedBeamId = useStructureStore((s) => s.selectedBeamId);
  const selectedOpeningId = useStructureStore((s) => s.selectedOpeningId);
  const isDragging = useStructureStore((s) => s.isDragging);
  const viewMode = useStructureStore((s) => s.viewMode);
  const cutaway = useStructureStore((s) => s.cutaway);
  const viewFlags = useStructureStore((s) => s.viewFlags);
  const clearSelection = useStructureStore((s) => s.clearSelection);
  const clearMultiSelect = useStructureStore((s) => s.clearMultiSelect);

  const cx = building.width / 2;
  const cz = building.length / 2;
  const activeFloorData = floors.find((floor) => floor.floorNumber === activeFloor);
  const inside = viewMode === "inside";
  const explodeGap = viewFlags.exploded ? building.floorHeight * 0.55 : 0;
  const rotY = ((building.rotationDeg ?? 0) * Math.PI) / 180;
  const isolate = viewFlags.isolateSelection;
  const hasSelection = Boolean(
    selectedPillarId ||
      selectedWallId ||
      selectedStairId ||
      selectedBeamId ||
      selectedOpeningId
  );
  const floorsToShow = useMemo(() => {
    const mode = viewFlags.floorVisibility;
    if (mode === "all" || mode === "exploded") return floors;
    if (mode === "active_with_lower_ghosted" || cutaway || inside) {
      return floors.filter((floor) => floor.floorNumber <= activeFloor);
    }
    return floors.filter((floor) => floor.floorNumber === activeFloor);
  }, [
    floors,
    activeFloor,
    cutaway,
    inside,
    viewFlags.floorVisibility,
  ]);

  const wallMap = useMemo(() => {
    const map = new Map<string, (typeof floorPlates)[0]["walls"][0]>();
    floorPlates.forEach((p) => p.walls.forEach((w) => map.set(w.id, w)));
    return map;
  }, [floorPlates]);

  return (
    <>
      <color attach="background" args={["#0b0c0f"]} />
      <ambientLight intensity={inside ? 0.65 : 0.5} />
      <directionalLight
        castShadow={!mobile}
        position={[22, 34, 16]}
        intensity={inside ? 0.75 : 1.0}
        shadow-mapSize={mobile ? [512, 512] : [1024, 1024]}
      />
      <hemisphereLight args={["#c7d2e0", "#1a1d22", inside ? 0.55 : 0.4]} />
      <ExportBridge />
      <InitOrbitTarget />
      <InvalidateOnChange />

      <group
        onPointerMissed={() => {
          clearSelection();
          clearMultiSelect();
        }}
        position={[cx, 0, cz]}
        rotation={[0, rotY, 0]}
      >
        <group position={[-cx, 0, -cz]}>
          <WorkspaceHelpers width={building.width} length={building.length} />
          <Footprint width={building.width} length={building.length} />
          <ActiveFloorPlane />
          {building.showFoundation && (
            <FoundationSystem
              dimmed={isolate && hasSelection}
            />
          )}
          {building.showRoof !== false && !cutaway && !inside && (
            <RoofMesh
              explodeGap={explodeGap}
              dimmed={isolate && hasSelection}
            />
          )}

          {floorsToShow.map((floor) => {
            const baseY = floor.elevation +
              (viewFlags.floorVisibility === "exploded" || viewFlags.exploded
                ? explodeGap * (floor.floorNumber - 1)
                : 0);
            const active = floor.floorNumber === activeFloor;
            const ghosted = !active && viewFlags.floorVisibility === "active_with_lower_ghosted";
            const plate = floorPlates.find((p) => p.floorId === floor.id || p.floor === floor.floorNumber);
            const hideCeiling = (cutaway || inside) && active;
            return (
              <group key={floor.id}>
                {floor.pillars.map((pillar) => (
                  <PillarMesh
                    key={pillar.id}
                    pillarId={pillar.id}
                    selected={pillar.id === selectedPillarId}
                    dimmed={
                      ghosted ||
                      (isolate && hasSelection && pillar.id !== selectedPillarId)
                    }
                    baseY={baseY}
                    totalHeight={pillar.height || floor.height}
                    selectable={active}
                  />
                ))}
                {floor.slabs.map((slab) => (
                  <SlabMesh
                    key={slab.id}
                    slab={slab}
                    floorBaseY={baseY}
                    floorHeight={floor.height}
                    active={active}
                    hideCeiling={hideCeiling}
                    dimmed={ghosted || (isolate && hasSelection && !active)}
                  />
                ))}
                {floor.beams.map((beam) => (
                  <BeamMesh
                    key={beam.id}
                    beam={beam}
                    floorBaseY={baseY}
                    selected={beam.id === selectedBeamId}
                    active={active}
                    dimmed={
                      ghosted ||
                      isolate &&
                      hasSelection &&
                      beam.id !== selectedBeamId
                    }
                  />
                ))}
                {plate?.walls.map((wall) => (
                  <WallMesh
                    key={wall.id}
                    wall={wall}
                    floorBaseY={baseY}
                    selected={wall.id === selectedWallId}
                    active={active}
                    dimmed={
                      ghosted ||
                      isolate &&
                      hasSelection &&
                      wall.id !== selectedWallId
                    }
                  />
                ))}
                {plate?.openings.map((opening) => {
                  const wall = wallMap.get(opening.wallId);
                  if (!wall) return null;
                  if (
                    isolate &&
                    hasSelection &&
                    opening.id !== selectedOpeningId
                  ) {
                    return null;
                  }
                  return (
                    <OpeningMesh
                      key={opening.id}
                      opening={opening}
                      wall={wall}
                      floorBaseY={baseY}
                      selected={opening.id === selectedOpeningId}
                      active={active}
                      dimmed={ghosted}
                    />
                  );
                })}
                {plate?.stairs.map((stair) => (
                  <StairMesh
                    key={stair.id}
                    stair={stair}
                    floorBaseY={baseY}
                    floorHeight={building.floorHeight}
                    active={active}
                    selected={stair.id === selectedStairId}
                    dimmed={
                      ghosted ||
                      isolate &&
                      hasSelection &&
                      stair.id !== selectedStairId
                    }
                  />
                ))}
              </group>
            );
          })}

          <WallDraftPreview />
          <PillarDistanceDimensions />
          <SelectionGizmo pillarHeight={activeFloorData?.height ?? building.floorHeight} />
        </group>
      </group>

      <FocusSelectionCamera pillarHeight={activeFloorData?.height ?? building.floorHeight} />

      {!mobile && !inside && (
        <ContactShadows
          position={[cx, 0, cz]}
          opacity={0.28}
          scale={Math.max(building.width, building.length) * 1.6}
          blur={2.4}
        />
      )}

      {inside ? (
        <InsideControls enabled />
      ) : (
        <OrbitControls
          makeDefault
          enabled={!isDragging}
          maxPolarAngle={Math.PI * 0.92}
          minDistance={cutaway ? 2.5 : 5}
          maxDistance={100}
          enablePan
          panSpeed={1.1}
          rotateSpeed={0.85}
          zoomSpeed={1.05}
        />
      )}
    </>
  );
}

export default function StructureCanvas() {
  const tool = useStructureStore((s) => s.tool);
  const activeFloor = useStructureStore((s) => s.activeFloor);
  const wallDraftStart = useStructureStore((s) => s.wallDraftStart);
  const viewMode = useStructureStore((s) => s.viewMode);
  const viewFlags = useStructureStore((s) => s.viewFlags);
  const multiSelectedPillarIds = useStructureStore(
    (s) => s.multiSelectedPillarIds
  );
  const mobile = useIsMobile();

  const dimHint =
    !viewFlags.showDimensions || viewFlags.dimensionMode === "off"
      ? "Dims off"
      : viewFlags.dimensionMode === "all"
        ? "Dims: all pairs"
        : "Dims: selected";

  const groupCount = multiSelectedPillarIds.length;

  const hint =
    viewMode === "inside"
      ? "Inside · WASD / arrows move · drag or touch to look · Esc exit"
      : groupCount > 0
        ? `Group: ${groupCount} pillars selected · drag any one to move them together · Esc to clear`
        : tool === "select"
          ? mobile
            ? "Tap to select · drag / gizmo to move · Focus frames part"
            : `Orbit · gizmo Move/Rot · F focus · I isolate · ${dimHint}`
          : tool === "pillar"
            ? "Tap / click on the floor to place a pillar"
            : tool === "wall"
              ? wallDraftStart
                ? "Tap / click the second point to finish the wall (Esc to cancel)"
                : "Tap / click the first corner of the wall"
              : tool === "door" || tool === "window"
                ? `Tap / click a wall on floor ${activeFloor} to place a ${tool}`
                : tool === "stair"
                  ? "Set steps in the toolbox, then tap / click the floor to place stairs"
                  : "Tap / click an element to delete it";

  return (
    <div className="relative h-full w-full" style={{ touchAction: "none" }}>
      <Canvas
        frameloop="demand"
        shadows={!mobile}
        camera={{ position: [32, 26, 32], fov: 42, near: 0.1, far: 250 }}
        dpr={mobile ? [1, 1.25] : [1, 1.5]}
        gl={{ preserveDrawingBuffer: true, powerPreference: "high-performance" }}
        style={{ touchAction: "none" }}
      >
        <Suspense
          fallback={
            <mesh>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color="#334155" wireframe />
            </mesh>
          }
        >
          <BuildingScene />
        </Suspense>
      </Canvas>
      {/* Status chip — kept minimal; GuidedActionBar carries the main instructions */}
      <div className="pointer-events-none absolute left-3 top-[5.5rem] z-10 hidden rounded-full border border-white/10 bg-[#0f172a]/75 px-3 py-1 text-[10px] font-medium text-white/85 backdrop-blur md:block">
        F{activeFloor}
        <span className="mx-1.5 text-white/35">·</span>
        <span className="text-white/70">{tool}</span>
      </div>
      <span className="sr-only">{hint}</span>
    </div>
  );
}
