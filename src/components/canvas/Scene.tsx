"use client";

import { ContactShadows, Grid, OrbitControls } from "@react-three/drei";
import { Canvas, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo } from "react";
import InsideControls from "@/components/canvas/InsideControls";
import PillarDistanceDimensions from "@/components/canvas/PillarDistanceDimensions";
import {
  ActiveFloorPlane,
  BeamMesh,
  Footprint,
  Foundation,
  OpeningMesh,
  PillarMesh,
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
  const pillars = useStructureStore((s) => s.pillars);
  const beams = useStructureStore((s) => s.beams);
  const slabs = useStructureStore((s) => s.slabs);
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
  const totalHeight = building.floors * building.floorHeight;
  const activeBaseY = (activeFloor - 1) * building.floorHeight;
  const inside = viewMode === "inside";
  const explodeGap = viewFlags.exploded ? building.floorHeight * 0.55 : 0;
  const rotY = ((building.rotationDeg ?? 0) * Math.PI) / 180;

  const floorsToShow = useMemo(() => {
    if (cutaway || inside) {
      return Array.from({ length: activeFloor }, (_, i) => i + 1);
    }
    if (building.showAllFloors) {
      return Array.from({ length: building.floors }, (_, i) => i + 1);
    }
    return [activeFloor];
  }, [
    building.showAllFloors,
    building.floors,
    activeFloor,
    cutaway,
    inside,
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
        shadow-mapSize={mobile ? [1024, 1024] : [2048, 2048]}
      />
      <hemisphereLight args={["#c7d2e0", "#1a1d22", inside ? 0.55 : 0.4]} />
      <ExportBridge />

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
            <Foundation width={building.width} length={building.length} />
          )}

          {pillars.map((pillar) => (
            <PillarMesh
              key={pillar.id}
              pillar={pillar}
              selected={pillar.id === selectedPillarId}
              baseY={0}
              totalHeight={
                cutaway || inside
                  ? Math.max(activeBaseY + building.floorHeight, 0.5)
                  : totalHeight + explodeGap * Math.max(building.floors - 1, 0)
              }
            />
          ))}

          {floorsToShow.map((floorNum) => {
            const baseY =
              (floorNum - 1) * building.floorHeight +
              explodeGap * (floorNum - 1);
            const active = floorNum === activeFloor;
            const plate = floorPlates.find((p) => p.floor === floorNum);
            const hideCeiling = (cutaway || inside) && active;
            return (
              <group key={floorNum}>
                {slabs.map((slab) => (
                  <SlabMesh
                    key={`${slab.id}-${floorNum}`}
                    slab={slab}
                    floorBaseY={baseY}
                    floorHeight={building.floorHeight}
                    active={active}
                    hideCeiling={hideCeiling}
                  />
                ))}
                {beams.map((beam) => (
                  <BeamMesh
                    key={`${beam.id}-${floorNum}`}
                    beam={beam}
                    floorBaseY={baseY}
                    selected={beam.id === selectedBeamId}
                  />
                ))}
                {plate?.walls.map((wall) => (
                  <WallMesh
                    key={wall.id}
                    wall={wall}
                    floorBaseY={baseY}
                    selected={wall.id === selectedWallId}
                    active={active}
                  />
                ))}
                {plate?.openings.map((opening) => {
                  const wall = wallMap.get(opening.wallId);
                  if (!wall) return null;
                  return (
                    <OpeningMesh
                      key={opening.id}
                      opening={opening}
                      wall={wall}
                      floorBaseY={baseY}
                      selected={opening.id === selectedOpeningId}
                      active={active}
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
                  />
                ))}
              </group>
            );
          })}

          <WallDraftPreview />
          <PillarDistanceDimensions />
        </group>
      </group>

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
          target={[cx, activeBaseY + building.floorHeight * 0.45, cz]}
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
            ? "Tap to select · drag to move · Ctrl/⌘+click to group-select"
            : `Orbit · pan · zoom · drag to move · Ctrl/⌘+click to group-select · ${dimHint}`
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
        shadows={!mobile}
        camera={{ position: [32, 26, 32], fov: 42, near: 0.1, far: 250 }}
        dpr={mobile ? [1, 1.25] : [1, 1.75]}
        gl={{ preserveDrawingBuffer: true }}
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
