"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { ThreeEvent, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type {
  Beam,
  BuildingConfig,
  Opening,
  Pillar,
  Slab,
  Stair,
  Wall,
} from "@/types/structure";
import { screenToLocalXZ, worldToLocalXZ } from "@/lib/coords";
import { useStructureStore } from "@/store/useStructureStore";

const PILLAR = "#c4cdd6";
const PILLAR_SEL = "#2563EB";
const PILLAR_GROUP = "#f59e0b";
const BEAM = "#8b9aab";
const BEAM_GROUP = "#f59e0b";
const SLAB = "#d7dde5";
const WALL = "#d6c3a8";
const WALL_SEL = "#2563EB";
const DOOR = "#6b4f3a";
const DOOR_SEL = "#2563EB";
const WINDOW = "#7ec8e3";
const STAIR = "#a8b4c0";

/**
 * Converts a pointer-event ray hit on a horizontal plane (world Y = planeY)
 * into the building's *local* plan coordinates (0..width, 0..length),
 * correctly accounting for building.rotationDeg so dragging/placing stays
 * accurate even when the structure has been rotated in the viewport.
 */
function projectToLocalXZ(
  event: ThreeEvent<PointerEvent>,
  planeY: number,
  building: BuildingConfig
): { x: number; y: number } | null {
  const ray = event.ray;
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
  const hit = new THREE.Vector3();
  if (!ray.intersectPlane(plane, hit)) return null;
  return worldToLocalXZ(hit.x, hit.z, building);
}

export function PillarMesh({
  pillarId,
  selected,
  baseY,
  totalHeight,
  dimmed = false,
}: {
  pillarId: string;
  selected: boolean;
  baseY: number;
  totalHeight: number;
  dimmed?: boolean;
}) {
  const pillar = useStructureStore((s) =>
    s.pillars.find((p) => p.id === pillarId)
  );
  const movePillar = useStructureStore((s) => s.movePillar);
  const selectPillar = useStructureStore((s) => s.selectPillar);
  const setDragging = useStructureStore((s) => s.setDragging);
  const tool = useStructureStore((s) => s.tool);
  const handleCanvasClick = useStructureStore((s) => s.handleCanvasClick);
  const building = useStructureStore((s) => s.building);
  const viewFlags = useStructureStore((s) => s.viewFlags);
  const toggleMultiSelectPillar = useStructureStore(
    (s) => s.toggleMultiSelectPillar
  );
  const moveSelectedGroupBy = useStructureStore((s) => s.moveSelectedGroupBy);
  const multiSelectedPillarIds = useStructureStore(
    (s) => s.multiSelectedPillarIds
  );
  const pushHistory = useStructureStore((s) => s.pushHistory);
  const inGroup = multiSelectedPillarIds.includes(pillarId);
  const wireframe = viewFlags.wireframe;
  const showLabels = viewFlags.showLabels;
  const showDimensions = viewFlags.showDimensions;
  const showReinforcement = viewFlags.showReinforcement;
  const [dragging, setLocalDrag] = useState(false);
  const { gl, camera, controls } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const lastHit = useRef<{ x: number; y: number } | null>(null);
  const groupDrag = useRef(false);
  const draggingRef = useRef(false);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (!pillar) return;
    e.stopPropagation();
    // Prevent OrbitControls from stealing the gesture on this frame.
    e.nativeEvent?.preventDefault?.();
    if (tool === "delete") {
      handleCanvasClick(pillar.x, pillar.y, { kind: "pillar", id: pillarId });
      return;
    }
    if (tool !== "select") return;
    if (e.ctrlKey || e.metaKey) {
      toggleMultiSelectPillar(pillarId);
      return;
    }
    const hit = projectToLocalXZ(e, baseY, building);
    if (hit) lastHit.current = hit;
    if (inGroup && multiSelectedPillarIds.length > 1) {
      groupDrag.current = true;
      pushHistory();
    } else {
      groupDrag.current = false;
      selectPillar(pillarId);
    }
    draggingRef.current = true;
    setLocalDrag(true);
    setDragging(true);
    if (controls && "enabled" in controls) {
      (controls as { enabled: boolean }).enabled = false;
    }
    gl.domElement.style.cursor = "grabbing";
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setLocalDrag(false);
    setDragging(false);
    groupDrag.current = false;
    lastHit.current = null;
    if (controls && "enabled" in controls) {
      (controls as { enabled: boolean }).enabled = true;
    }
    gl.domElement.style.cursor = "default";
  };

  // Window-level move: keeps drag working when the cursor leaves the mesh.
  useEffect(() => {
    if (!dragging) return;
    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      const hit = screenToLocalXZ(
        ev.clientX,
        ev.clientY,
        gl.domElement,
        camera,
        baseY,
        building
      );
      if (!hit) return;
      if (groupDrag.current) {
        if (!lastHit.current) {
          lastHit.current = hit;
          return;
        }
        const dx = hit.x - lastHit.current.x;
        const dy = hit.y - lastHit.current.y;
        lastHit.current = hit;
        if (Math.hypot(dx, dy) < 0.0005) return;
        moveSelectedGroupBy(dx, dy);
        return;
      }
      const x = Math.min(Math.max(hit.x, 0), building.width);
      const y = Math.min(Math.max(hit.y, 0), building.length);
      const snap = viewFlags.snapToGrid ? viewFlags.gridSizeM : 0;
      const sx = snap > 0 ? Math.round(x / snap) * snap : x;
      const sy = snap > 0 ? Math.round(y / snap) * snap : y;
      movePillar(pillarId, sx, sy);
    };
    const onUp = () => endDrag();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, pillarId, baseY, building, camera, gl.domElement]);

  if (!pillar) return null;

  const highlighted = selected || dragging;
  const color = inGroup ? PILLAR_GROUP : highlighted ? PILLAR_SEL : PILLAR;

  return (
    <group
      position={[pillar.x, baseY + totalHeight / 2, pillar.y]}
      rotation={[0, ((pillar.rotationDeg ?? 0) * Math.PI) / 180, 0]}
    >
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onPointerDown={onPointerDown}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (tool === "select" && !draggingRef.current)
            gl.domElement.style.cursor = "grab";
        }}
        onPointerOut={() => {
          if (!draggingRef.current) gl.domElement.style.cursor = "default";
        }}
      >
        {pillar.shape === "circular" ? (
          <cylinderGeometry
            args={[
              Math.max(pillar.width, pillar.depth) / 2,
              Math.max(pillar.width, pillar.depth) / 2,
              totalHeight,
              24,
            ]}
          />
        ) : (
          <boxGeometry args={[pillar.width, totalHeight, pillar.depth]} />
        )}
        <meshStandardMaterial
          color={color}
          roughness={0.55}
          metalness={0.08}
          wireframe={wireframe}
          transparent={dimmed}
          opacity={dimmed ? 0.18 : 1}
          depthWrite={!dimmed}
          emissive={inGroup ? "#f59e0b" : highlighted ? "#2563EB" : "#000000"}
          emissiveIntensity={
            dimmed ? 0 : inGroup ? 0.35 : highlighted ? 0.25 : 0
          }
        />
      </mesh>
      {(selected || inGroup) && (
        <mesh>
          {pillar.shape === "circular" ? (
            <cylinderGeometry
              args={[
                Math.max(pillar.width, pillar.depth) / 2 + 0.04,
                Math.max(pillar.width, pillar.depth) / 2 + 0.04,
                totalHeight + 0.08,
                24,
              ]}
            />
          ) : (
            <boxGeometry
              args={[
                pillar.width + 0.08,
                totalHeight + 0.08,
                pillar.depth + 0.08,
              ]}
            />
          )}
          <meshBasicMaterial
            color={inGroup ? "#f59e0b" : "#60A5FA"}
            wireframe
            transparent
            opacity={0.95}
          />
        </mesh>
      )}
      {showReinforcement && (
        <mesh>
          {pillar.shape === "circular" ? (
            <cylinderGeometry
              args={[
                Math.max(pillar.width, pillar.depth) / 2 - 0.04,
                Math.max(pillar.width, pillar.depth) / 2 - 0.04,
                totalHeight * 0.98,
                16,
              ]}
            />
          ) : (
            <boxGeometry
              args={[
                Math.max(pillar.width - 0.08, 0.05),
                totalHeight * 0.98,
                Math.max(pillar.depth - 0.08, 0.05),
              ]}
            />
          )}
          <meshStandardMaterial
            color="#c45c26"
            wireframe
            transparent
            opacity={0.85}
          />
        </mesh>
      )}
      {(selected || inGroup || showLabels) && (
        <Html
          distanceFactor={22}
          position={[0, totalHeight / 2 + 0.5, 0]}
          center
          pointerEvents="none"
        >
          <div className="rounded bg-[#121820]/90 px-2 py-1 text-[10px] font-medium text-white shadow-lg">
            {pillar.name}
            {showDimensions &&
              ` · ${Math.round(pillar.width * 1000)}×${Math.round(pillar.depth * 1000)}`}
            {inGroup && " · group"}
            {selected && " · drag"}
          </div>
        </Html>
      )}
    </group>
  );
}

export function BeamMesh({
  beam,
  floorBaseY,
  selected,
  dimmed = false,
}: {
  beam: Beam;
  floorBaseY: number;
  selected?: boolean;
  dimmed?: boolean;
}) {
  const selectBeam = useStructureStore((s) => s.selectBeam);
  const tool = useStructureStore((s) => s.tool);
  const wireframe = useStructureStore((s) => s.viewFlags.wireframe);
  const showLabels = useStructureStore((s) => s.viewFlags.showLabels);
  const toggleMultiSelectBeam = useStructureStore(
    (s) => s.toggleMultiSelectBeam
  );
  const multiSelectedBeamIds = useStructureStore(
    (s) => s.multiSelectedBeamIds
  );
  const inGroup = multiSelectedBeamIds.includes(beam.id);
  const { position, rotationY, length } = useMemo(() => {
    const midX = (beam.startX + beam.endX) / 2;
    const midY = (beam.startY + beam.endY) / 2;
    const dx = beam.endX - beam.startX;
    const dy = beam.endY - beam.startY;
    return {
      position: [
        midX,
        floorBaseY + beam.height - beam.depth / 2,
        midY,
      ] as [number, number, number],
      rotationY: -Math.atan2(dy, dx),
      length: Math.hypot(dx, dy) || beam.length,
    };
  }, [beam, floorBaseY]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh
        castShadow
        onClick={(e) => {
          e.stopPropagation();
          if (tool !== "select") return;
          if (e.ctrlKey || e.metaKey) {
            toggleMultiSelectBeam(beam.id);
            return;
          }
          selectBeam(beam.id);
        }}
      >
        <boxGeometry args={[length, beam.depth, beam.width]} />
        <meshStandardMaterial
          color={inGroup ? BEAM_GROUP : selected ? PILLAR_SEL : BEAM}
          roughness={0.5}
          metalness={0.1}
          wireframe={wireframe}
          transparent={dimmed}
          opacity={dimmed ? 0.14 : 1}
          depthWrite={!dimmed}
          emissive={inGroup ? "#f59e0b" : "#000000"}
          emissiveIntensity={dimmed ? 0 : inGroup ? 0.3 : 0}
        />
      </mesh>
      {(selected || inGroup || showLabels) && (
        <Html
          distanceFactor={28}
          position={[0, beam.depth / 2 + 0.2, 0]}
          center
          pointerEvents="none"
        >
          <div className="rounded bg-[#121820]/85 px-1.5 py-0.5 text-[9px] text-white">
            {beam.name}
            {inGroup && " · group"}
          </div>
        </Html>
      )}
    </group>
  );
}

export function SlabMesh({
  slab,
  floorBaseY,
  floorHeight,
  active,
  hideCeiling,
  dimmed = false,
}: {
  slab: Slab;
  floorBaseY: number;
  floorHeight: number;
  active: boolean;
  /** When cutaway/inside, hide the ceiling slab so you can see the room. */
  hideCeiling?: boolean;
  dimmed?: boolean;
}) {
  const selectSlab = useStructureStore((s) => s.selectSlab);
  const tool = useStructureStore((s) => s.tool);
  if (hideCeiling && active) return null;
  return (
    <mesh
      position={[
        slab.centerX,
        floorBaseY + floorHeight + slab.thickness / 2,
        slab.centerY,
      ]}
      receiveShadow
      onClick={(e) => {
        e.stopPropagation();
        if (tool === "select" && active) selectSlab(slab.id);
      }}
    >
      <boxGeometry args={[slab.width, slab.thickness, slab.length]} />
      <meshStandardMaterial
        color={SLAB}
        transparent
        opacity={dimmed ? 0.08 : active ? 0.55 : 0.22}
        roughness={0.7}
        depthWrite={false}
      />
    </mesh>
  );
}

export function WallMesh({
  wall,
  floorBaseY,
  selected,
  active,
  dimmed = false,
}: {
  wall: Wall;
  floorBaseY: number;
  selected: boolean;
  active: boolean;
  dimmed?: boolean;
}) {
  const handleCanvasClick = useStructureStore((s) => s.handleCanvasClick);
  const selectWall = useStructureStore((s) => s.selectWall);
  const moveWallBy = useStructureStore((s) => s.moveWallBy);
  const setDragging = useStructureStore((s) => s.setDragging);
  const tool = useStructureStore((s) => s.tool);
  const building = useStructureStore((s) => s.building);
  const { gl, camera, controls } = useThree();
  const [dragging, setLocalDrag] = useState(false);
  const lastHit = useRef<{ x: number; y: number } | null>(null);
  const draggingRef = useRef(false);

  const { position, rotationY, length } = useMemo(() => {
    const midX = (wall.startX + wall.endX) / 2;
    const midY = (wall.startY + wall.endY) / 2;
    const dx = wall.endX - wall.startX;
    const dy = wall.endY - wall.startY;
    return {
      position: [midX, floorBaseY + wall.height / 2, midY] as [
        number,
        number,
        number,
      ],
      rotationY: -Math.atan2(dy, dx),
      length: Math.hypot(dx, dy) || 0.1,
    };
  }, [wall, floorBaseY]);

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    e.nativeEvent?.preventDefault?.();
    if (!active) return;
    const localHit = worldToLocalXZ(e.point.x, e.point.z, building);
    const len = length || 1;
    const t = Math.min(
      Math.max(
        Math.hypot(localHit.x - wall.startX, localHit.y - wall.startY) / len,
        0.05
      ),
      0.95
    );
    if (tool === "door" || tool === "window" || tool === "delete") {
      handleCanvasClick(wall.startX, wall.startY, {
        kind: "wall",
        id: wall.id,
        t,
      });
      return;
    }
    if (tool !== "select") return;
    selectWall(wall.id);
    const hit = projectToLocalXZ(e, floorBaseY, building);
    if (!hit) return;
    lastHit.current = hit;
    draggingRef.current = true;
    setLocalDrag(true);
    setDragging(true);
    if (controls && "enabled" in controls) {
      (controls as { enabled: boolean }).enabled = false;
    }
    gl.domElement.style.cursor = "grabbing";
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setLocalDrag(false);
    setDragging(false);
    lastHit.current = null;
    if (controls && "enabled" in controls) {
      (controls as { enabled: boolean }).enabled = true;
    }
    gl.domElement.style.cursor = "default";
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current || !lastHit.current) return;
      const hit = screenToLocalXZ(
        ev.clientX,
        ev.clientY,
        gl.domElement,
        camera,
        floorBaseY,
        building
      );
      if (!hit) return;
      const dx = hit.x - lastHit.current.x;
      const dy = hit.y - lastHit.current.y;
      if (Math.hypot(dx, dy) < 0.001) return;
      lastHit.current = hit;
      moveWallBy(wall.id, dx, dy);
    };
    const onUp = () => endDrag();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, wall.id, floorBaseY, building, camera, gl.domElement]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Fatter invisible hit target — thin walls are hard to grab precisely
          with a mouse and especially with a finger on touch screens. */}
      <mesh
        visible={false}
        onPointerDown={onPointerDown}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (tool === "select" && active && !draggingRef.current)
            gl.domElement.style.cursor = "grab";
        }}
        onPointerOut={() => {
          if (!draggingRef.current) gl.domElement.style.cursor = "default";
        }}
      >
        <boxGeometry
          args={[length, wall.height, Math.max(wall.thickness + 0.35, 0.5)]}
        />
      </mesh>
      <mesh castShadow receiveShadow raycast={() => null}>
        <boxGeometry args={[length, wall.height, wall.thickness]} />
        <meshStandardMaterial
          color={selected || dragging ? WALL_SEL : WALL}
          transparent
          opacity={dimmed ? 0.12 : active ? 0.88 : 0.28}
          roughness={0.85}
          depthWrite={active && !dimmed}
        />
      </mesh>
    </group>
  );
}

export function OpeningMesh({
  opening,
  wall,
  floorBaseY,
  selected,
  active,
}: {
  opening: Opening;
  wall: Wall;
  floorBaseY: number;
  selected?: boolean;
  active?: boolean;
}) {
  const handleCanvasClick = useStructureStore((s) => s.handleCanvasClick);
  const selectOpening = useStructureStore((s) => s.selectOpening);
  const tool = useStructureStore((s) => s.tool);
  const { gl } = useThree();

  const mesh = useMemo(() => {
    const dx = wall.endX - wall.startX;
    const dy = wall.endY - wall.startY;
    const len = Math.hypot(dx, dy) || 1;
    const x = wall.startX + dx * opening.t;
    const z = wall.startY + dy * opening.t;
    const rot = -Math.atan2(dy, dx);
    const y =
      floorBaseY + opening.sillHeight + opening.height / 2;
    return {
      position: [x, y, z] as [number, number, number],
      rotationY: rot,
      length: Math.min(opening.width, len * 0.8),
    };
  }, [opening, wall, floorBaseY]);

  return (
    <mesh
      position={mesh.position}
      rotation={[0, mesh.rotationY, 0]}
      onClick={(e) => {
        e.stopPropagation();
        if (!active) return;
        if (tool === "delete") {
          handleCanvasClick(0, 0, { kind: "opening", id: opening.id });
        } else if (tool === "select") {
          selectOpening(opening.id);
        }
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        if (active && (tool === "select" || tool === "delete")) {
          gl.domElement.style.cursor = "pointer";
        }
      }}
      onPointerOut={() => {
        gl.domElement.style.cursor = "default";
      }}
    >
      <boxGeometry
        args={[mesh.length, opening.height, wall.thickness + 0.06]}
      />
      <meshStandardMaterial
        color={selected ? DOOR_SEL : opening.type === "door" ? DOOR : WINDOW}
        transparent
        opacity={opening.type === "window" ? 0.55 : 0.9}
        metalness={opening.type === "window" ? 0.4 : 0.05}
        roughness={0.3}
        emissive={selected ? "#2563EB" : "#000000"}
        emissiveIntensity={selected ? 0.4 : 0}
      />
      {selected && (
        <Html
          distanceFactor={20}
          position={[0, opening.height / 2 + 0.25, 0]}
          center
          pointerEvents="none"
        >
          <div className="rounded bg-[#121820]/90 px-2 py-1 text-[10px] font-medium text-white shadow-lg">
            {opening.name}
          </div>
        </Html>
      )}
    </mesh>
  );
}

export function StairMesh({
  stair,
  floorBaseY,
  floorHeight,
  active,
  selected,
  dimmed = false,
}: {
  stair: Stair;
  floorBaseY: number;
  floorHeight: number;
  active: boolean;
  selected?: boolean;
  dimmed?: boolean;
}) {
  const handleCanvasClick = useStructureStore((s) => s.handleCanvasClick);
  const selectStair = useStructureStore((s) => s.selectStair);
  const moveStair = useStructureStore((s) => s.moveStair);
  const setDragging = useStructureStore((s) => s.setDragging);
  const tool = useStructureStore((s) => s.tool);
  const building = useStructureStore((s) => s.building);
  const viewFlags = useStructureStore((s) => s.viewFlags);
  const { gl, camera, controls } = useThree();
  const [dragging, setLocalDrag] = useState(false);
  const draggingRef = useRef(false);

  // Prefer user step count; fall back to rise-based fit for older stairs.
  const steps = useMemo(() => {
    if (stair.stepCount != null) {
      return Math.min(30, Math.max(3, Math.round(stair.stepCount)));
    }
    const riseMm = stair.riseMm ?? 175;
    return Math.min(30, Math.max(3, Math.round((floorHeight * 1000) / riseMm)));
  }, [stair.stepCount, stair.riseMm, floorHeight]);

  const actualRiseMm = Math.round((floorHeight * 1000) / steps);
  const treadMm =
    stair.treadMm ?? Math.round((stair.depth * 1000) / Math.max(1, steps));

  const onPointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    e.nativeEvent?.preventDefault?.();
    if (tool === "delete") {
      handleCanvasClick(stair.x, stair.y, { kind: "stair", id: stair.id });
      return;
    }
    if (tool !== "select" || !active) return;
    selectStair(stair.id);
    draggingRef.current = true;
    setLocalDrag(true);
    setDragging(true);
    if (controls && "enabled" in controls) {
      (controls as { enabled: boolean }).enabled = false;
    }
    gl.domElement.style.cursor = "grabbing";
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setLocalDrag(false);
    setDragging(false);
    if (controls && "enabled" in controls) {
      (controls as { enabled: boolean }).enabled = true;
    }
    gl.domElement.style.cursor = "default";
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (ev: PointerEvent) => {
      if (!draggingRef.current) return;
      const hit = screenToLocalXZ(
        ev.clientX,
        ev.clientY,
        gl.domElement,
        camera,
        floorBaseY,
        building
      );
      if (!hit) return;
      let x = Math.min(Math.max(hit.x, 0), building.width);
      let y = Math.min(Math.max(hit.y, 0), building.length);
      const snap = viewFlags.snapToGrid ? viewFlags.gridSizeM : 0;
      if (snap > 0) {
        x = Math.round(x / snap) * snap;
        y = Math.round(y / snap) * snap;
      }
      moveStair(stair.id, x, y);
    };
    const onUp = () => endDrag();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, stair.id, floorBaseY, building, camera, gl.domElement]);

  return (
    <group
      position={[stair.x, floorBaseY, stair.y]}
      rotation={[0, ((stair.rotationDeg ?? 0) * Math.PI) / 180, 0]}
    >
      {/* Big invisible hit target so the gaps between step meshes never
          "miss" a click/tap when selecting or dragging the staircase. */}
      <mesh
        visible={false}
        position={[0, floorHeight / 2, 0]}
        onPointerDown={onPointerDown}
        onPointerOver={(e) => {
          e.stopPropagation();
          if (tool === "select" && active && !draggingRef.current)
            gl.domElement.style.cursor = "grab";
        }}
        onPointerOut={() => {
          if (!draggingRef.current) gl.domElement.style.cursor = "default";
        }}
      >
        <boxGeometry args={[stair.width + 0.3, floorHeight, stair.depth + 0.3]} />
      </mesh>
      {Array.from({ length: steps }).map((_, i) => {
        const t = i / steps;
        return (
          <mesh
            key={i}
            position={[
              0,
              (t + 0.5 / steps) * floorHeight,
              -stair.depth / 2 + (t + 0.5 / steps) * stair.depth,
            ]}
            castShadow
            raycast={() => null}
          >
            <boxGeometry
              args={[stair.width, floorHeight / steps, stair.depth / steps]}
            />
            <meshStandardMaterial
              color={selected || dragging ? WALL_SEL : STAIR}
              transparent
              opacity={dimmed ? 0.12 : active ? 1 : 0.4}
              depthWrite={!dimmed}
            />
          </mesh>
        );
      })}
      {selected && (
        <Html
          distanceFactor={18}
          position={[0, floorHeight * 0.55, 0]}
          center
          pointerEvents="none"
        >
          <div className="rounded bg-[#121820]/90 px-2 py-1 text-[10px] font-medium text-white shadow-lg">
            {stair.name} · {steps} steps · rise {actualRiseMm} mm · tread{" "}
            {treadMm} mm
          </div>
        </Html>
      )}
    </group>
  );
}

const FOUNDATION = "#6b7280";
const FOUNDATION_SEL = "#2563EB";
const PEDESTAL = "#8b95a1";
const ROOF_CONCRETE = "#c5ced8";
const ROOF_METAL = "#94a3b8";
const ROOF_TILE = "#b4534b";
const PARAPET = "#9aa3ad";

export function FoundationSystem({
  selected = false,
  dimmed = false,
}: {
  selected?: boolean;
  dimmed?: boolean;
}) {
  const building = useStructureStore((s) => s.building);
  const pillars = useStructureStore((s) => s.pillars);
  const footing = building.foundation;
  if (!footing) return null;

  const level = footing.foundationLevel ?? -1.5;
  const t = Math.max(footing.thickness, 0.25);
  const fw = Math.max(footing.width, 0.8);
  const fl = Math.max(footing.length, 0.8);
  const pedH = Math.max(footing.pedestalHeight ?? 0.3, 0.05);
  // Top of footing pad sits at `level`; pedestal rises toward ground (y=0).
  const padCenterY = level - t / 2;
  const type = footing.type ?? "isolated";
  const color = selected ? FOUNDATION_SEL : FOUNDATION;
  const opacity = dimmed ? 0.15 : 1;

  if (type === "raft") {
    const matW = building.width + 1.2;
    const matL = building.length + 1.2;
    return (
      <group>
        <mesh
          position={[building.width / 2, padCenterY, building.length / 2]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[matW, t, matL]} />
          <meshStandardMaterial
            color={color}
            roughness={0.95}
            transparent={dimmed}
            opacity={opacity}
            depthWrite={!dimmed}
          />
        </mesh>
      </group>
    );
  }

  if (type === "strip") {
    // Strip footings along unique column rows (Y) and columns (X).
    const tol = 0.4;
    const xs: number[] = [];
    const ys: number[] = [];
    for (const p of pillars) {
      if (!xs.some((v) => Math.abs(v - p.x) < tol)) xs.push(p.x);
      if (!ys.some((v) => Math.abs(v - p.y) < tol)) ys.push(p.y);
    }
    const stripW = Math.min(fw, fl);
    return (
      <group>
        {ys.map((y) => (
          <mesh
            key={`sy-${y.toFixed(2)}`}
            position={[building.width / 2, padCenterY, y]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[building.width + 0.6, t, stripW]} />
            <meshStandardMaterial
              color={color}
              roughness={0.95}
              transparent={dimmed}
              opacity={opacity}
              depthWrite={!dimmed}
            />
          </mesh>
        ))}
        {xs.map((x) => (
          <mesh
            key={`sx-${x.toFixed(2)}`}
            position={[x, padCenterY, building.length / 2]}
            castShadow
            receiveShadow
          >
            <boxGeometry args={[stripW, t, building.length + 0.6]} />
            <meshStandardMaterial
              color={color}
              roughness={0.95}
              transparent={dimmed}
              opacity={opacity * 0.85}
              depthWrite={!dimmed}
            />
          </mesh>
        ))}
      </group>
    );
  }

  // isolated | combined | pile — pad under each column (+ piles for pile type)
  return (
    <group>
      {pillars.map((p) => {
        const padW = type === "combined" ? fw * 1.15 : fw;
        const padL = type === "combined" ? fl * 1.15 : fl;
        const pedW = Math.max(p.width + 0.1, 0.35);
        const pedD = Math.max(p.depth + 0.1, 0.35);
        const pedTop = Math.min(0, level + pedH);
        const pedCenterY = (level + pedTop) / 2;
        const pedHeight = Math.max(pedTop - level, 0.05);
        return (
          <group key={p.id}>
            <mesh
              position={[p.x, padCenterY, p.y]}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[padW, t, padL]} />
              <meshStandardMaterial
                color={color}
                roughness={0.95}
                transparent={dimmed}
                opacity={opacity}
                depthWrite={!dimmed}
              />
            </mesh>
            <mesh position={[p.x, pedCenterY, p.y]} castShadow>
              <boxGeometry args={[pedW, pedHeight, pedD]} />
              <meshStandardMaterial
                color={selected ? FOUNDATION_SEL : PEDESTAL}
                roughness={0.9}
                transparent={dimmed}
                opacity={opacity}
                depthWrite={!dimmed}
              />
            </mesh>
            {type === "pile" &&
              [
                [-padW * 0.28, -padL * 0.28],
                [padW * 0.28, -padL * 0.28],
                [-padW * 0.28, padL * 0.28],
                [padW * 0.28, padL * 0.28],
              ].map(([dx, dy], i) => (
                <mesh
                  key={i}
                  position={[p.x + dx, level - t - 1.2, p.y + dy]}
                  castShadow
                >
                  <cylinderGeometry args={[0.15, 0.15, 2.4, 10]} />
                  <meshStandardMaterial
                    color="#57534e"
                    roughness={0.98}
                    transparent={dimmed}
                    opacity={opacity}
                    depthWrite={!dimmed}
                  />
                </mesh>
              ))}
          </group>
        );
      })}
    </group>
  );
}

/** @deprecated use FoundationSystem */
export function Foundation({
  width,
  length,
}: {
  width: number;
  length: number;
}) {
  return (
    <mesh position={[width / 2, -0.25, length / 2]} receiveShadow castShadow>
      <boxGeometry args={[width + 0.8, 0.5, length + 0.8]} />
      <meshStandardMaterial color="#6b7280" roughness={0.95} />
    </mesh>
  );
}

export function RoofMesh({
  explodeGap = 0,
  dimmed = false,
}: {
  explodeGap?: number;
  dimmed?: boolean;
}) {
  const building = useStructureStore((s) => s.building);
  const roof =
    building.roof ??
    ({
      type: building.roofType ?? "flat",
      overhangM: 0.45,
      thickness: 0.15,
      slopeDeg: 25,
      material: "concrete",
      parapetHeight: 0.6,
    } as const);

  const topY =
    building.floors * building.floorHeight +
    explodeGap * Math.max(building.floors - 1, 0);
  const oh = Math.max(roof.overhangM ?? 0, 0);
  const thick = Math.max(roof.thickness ?? 0.12, 0.08);
  const w = building.width + oh * 2;
  const l = building.length + oh * 2;
  const cx = building.width / 2;
  const cz = building.length / 2;
  const color =
    roof.material === "metal"
      ? ROOF_METAL
      : roof.material === "tile"
        ? ROOF_TILE
        : ROOF_CONCRETE;
  const opacity = dimmed ? 0.12 : roof.material === "metal" ? 0.92 : 0.96;

  if (roof.type === "flat") {
    const parapet = Math.max(roof.parapetHeight ?? 0, 0);
    return (
      <group>
        <mesh position={[cx, topY + thick / 2, cz]} castShadow receiveShadow>
          <boxGeometry args={[w, thick, l]} />
          <meshStandardMaterial
            color={color}
            roughness={0.75}
            metalness={roof.material === "metal" ? 0.35 : 0.05}
            transparent={dimmed || roof.material !== "concrete"}
            opacity={opacity}
            depthWrite={!dimmed}
          />
        </mesh>
        {parapet > 0.05 &&
          (
            [
              [cx, topY + thick + parapet / 2, -oh + 0.08, w, 0.16],
              [cx, topY + thick + parapet / 2, building.length + oh - 0.08, w, 0.16],
              [-oh + 0.08, topY + thick + parapet / 2, cz, 0.16, l],
              [building.width + oh - 0.08, topY + thick + parapet / 2, cz, 0.16, l],
            ] as const
          ).map(([x, y, z, bw, bd], i) => (
            <mesh key={i} position={[x, y, z]} castShadow>
              <boxGeometry args={[bw, parapet, bd]} />
              <meshStandardMaterial
                color={PARAPET}
                roughness={0.9}
                transparent={dimmed}
                opacity={dimmed ? 0.12 : 0.95}
                depthWrite={!dimmed}
              />
            </mesh>
          ))}
      </group>
    );
  }

  // slope / gable — two pitched planes meeting at ridge along length
  const pitch = ((roof.slopeDeg ?? 25) * Math.PI) / 180;
  const rise = Math.tan(pitch) * (w / 2);
  const panelW = Math.hypot(w / 2, rise);
  const tilt = Math.atan2(rise, w / 2);

  return (
    <group>
      <mesh
        position={[cx - w / 4, topY + rise / 2 + thick / 2, cz]}
        rotation={[0, 0, tilt]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[panelW, thick, l]} />
        <meshStandardMaterial
          color={color}
          roughness={roof.material === "tile" ? 0.85 : 0.55}
          metalness={roof.material === "metal" ? 0.4 : 0.05}
          transparent={dimmed}
          opacity={opacity}
          depthWrite={!dimmed}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        position={[cx + w / 4, topY + rise / 2 + thick / 2, cz]}
        rotation={[0, 0, -tilt]}
        castShadow
        receiveShadow
      >
        <boxGeometry args={[panelW, thick, l]} />
        <meshStandardMaterial
          color={color}
          roughness={roof.material === "tile" ? 0.85 : 0.55}
          metalness={roof.material === "metal" ? 0.4 : 0.05}
          transparent={dimmed}
          opacity={opacity}
          depthWrite={!dimmed}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

export function Footprint({
  width,
  length,
}: {
  width: number;
  length: number;
}) {
  const handleCanvasClick = useStructureStore((s) => s.handleCanvasClick);
  const tool = useStructureStore((s) => s.tool);
  const building = useStructureStore((s) => s.building);
  const clearMultiSelect = useStructureStore((s) => s.clearMultiSelect);
  const gridSize = Math.ceil(Math.max(width, length) + 4);

  return (
    <group>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[width / 2, 0.01, length / 2]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          if (
            tool === "pillar" ||
            tool === "wall" ||
            tool === "stair" ||
            tool === "select"
          ) {
            const { x, y } = worldToLocalXZ(e.point.x, e.point.z, building);
            handleCanvasClick(x, y, { kind: "ground" });
          }
          if (tool === "select") clearMultiSelect();
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          // NOTE: don't re-dispatch the ground click here — a real-world
          // "double click" also fires two ordinary click events first, so
          // re-handling it caused stray wall/stair drafts to be left
          // dangling (users reported walls/stairs/doors "not placing
          // properly" after a quick double click). Only the quick-add
          // pillar shortcut belongs here.
          if (tool !== "select") return;
          const { x, y } = worldToLocalXZ(e.point.x, e.point.z, building);
          useStructureStore.getState().addPillar(x, y);
        }}
      >
        <planeGeometry args={[width, length]} />
        <meshStandardMaterial color="#e8edf2" roughness={0.95} />
      </mesh>
      <gridHelper
        args={[gridSize, gridSize, "#9aa8b5", "#d0d7df"]}
        position={[width / 2, 0.02, length / 2]}
      />
    </group>
  );
}

/** Clickable plane on the active floor for placing / aiming while editing upstairs. */
export function ActiveFloorPlane() {
  const building = useStructureStore((s) => s.building);
  const activeFloor = useStructureStore((s) => s.activeFloor);
  const handleCanvasClick = useStructureStore((s) => s.handleCanvasClick);
  const tool = useStructureStore((s) => s.tool);
  const clearMultiSelect = useStructureStore((s) => s.clearMultiSelect);
  const y = (activeFloor - 1) * building.floorHeight + 0.03;
  if (activeFloor <= 1) return null;

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[building.width / 2, y, building.length / 2]}
      onClick={(e) => {
        e.stopPropagation();
        if (
          tool === "pillar" ||
          tool === "wall" ||
          tool === "stair" ||
          tool === "select"
        ) {
          const { x, y: ly } = worldToLocalXZ(e.point.x, e.point.z, building);
          handleCanvasClick(x, ly, { kind: "ground" });
        }
        if (tool === "select") clearMultiSelect();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (tool !== "select") return;
        const { x, y: ly } = worldToLocalXZ(e.point.x, e.point.z, building);
        useStructureStore.getState().addPillar(x, ly);
      }}
    >
      <planeGeometry args={[building.width, building.length]} />
      <meshStandardMaterial
        color="#c5d4e0"
        transparent
        opacity={0.22}
        depthWrite={false}
      />
    </mesh>
  );
}

export function WallDraftPreview() {
  const draft = useStructureStore((s) => s.wallDraftStart);
  const activeFloor = useStructureStore((s) => s.activeFloor);
  const building = useStructureStore((s) => s.building);
  if (!draft) return null;
  const y =
    (activeFloor - 1) * building.floorHeight + building.floorHeight / 2;
  return (
    <mesh position={[draft.x, y, draft.y]}>
      <sphereGeometry args={[0.18, 16, 16]} />
      <meshStandardMaterial color="#e35b1c" emissive="#e35b1c" emissiveIntensity={0.4} />
    </mesh>
  );
}
