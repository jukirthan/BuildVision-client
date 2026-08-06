"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { localToWorldXZ } from "@/lib/coords";
import { useStructureStore } from "@/store/useStructureStore";

/**
 * Cinematic framing: when focusToken bumps (toolbar Focus / F key),
 * ease OrbitControls target + camera toward the selected member.
 */
export default function FocusSelectionCamera({
  pillarHeight,
}: {
  pillarHeight: number;
}) {
  const focusToken = useStructureStore((s) => s.focusToken);
  const building = useStructureStore((s) => s.building);
  const selectedPillarId = useStructureStore((s) => s.selectedPillarId);
  const selectedStairId = useStructureStore((s) => s.selectedStairId);
  const selectedWallId = useStructureStore((s) => s.selectedWallId);
  const selectedBeamId = useStructureStore((s) => s.selectedBeamId);
  const pillars = useStructureStore((s) => s.pillars);
  const beams = useStructureStore((s) => s.beams);
  const floorPlates = useStructureStore((s) => s.floorPlates);
  const { camera, controls, invalidate } = useThree();

  const anim = useRef<{
    active: boolean;
    t: number;
    fromCam: THREE.Vector3;
    toCam: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toTarget: THREE.Vector3;
  } | null>(null);

  useEffect(() => {
    if (!focusToken) return;
    if (useStructureStore.getState().viewMode === "inside") return;

    let localX = building.width / 2;
    let localY = building.length / 2;
    let elev = building.floorHeight * 0.5;
    let span = Math.max(building.width, building.length) * 0.35;

    const pillar = selectedPillarId
      ? pillars.find((p) => p.id === selectedPillarId)
      : undefined;
    if (pillar) {
      localX = pillar.x;
      localY = pillar.y;
      elev = pillarHeight / 2;
      span = Math.max(pillar.width, pillar.depth, 2) * 4;
    } else if (selectedStairId) {
      for (const plate of floorPlates) {
        const stair = plate.stairs.find((s) => s.id === selectedStairId);
        if (stair) {
          localX = stair.x;
          localY = stair.y;
          elev =
            (stair.floor - 1) * building.floorHeight +
            building.floorHeight * 0.4;
          span = Math.max(stair.width, stair.depth, 2) * 3;
          break;
        }
      }
    } else if (selectedWallId) {
      for (const plate of floorPlates) {
        const wall = plate.walls.find((w) => w.id === selectedWallId);
        if (wall) {
          localX = (wall.startX + wall.endX) / 2;
          localY = (wall.startY + wall.endY) / 2;
          elev =
            (wall.floor - 1) * building.floorHeight + wall.height * 0.5;
          span =
            Math.hypot(wall.endX - wall.startX, wall.endY - wall.startY) * 1.2 +
            4;
          break;
        }
      }
    } else if (selectedBeamId) {
      const beam = beams.find((b) => b.id === selectedBeamId);
      if (beam) {
        localX = (beam.startX + beam.endX) / 2;
        localY = (beam.startY + beam.endY) / 2;
        elev = beam.height;
        span = beam.length * 0.8 + 4;
      }
    } else {
      return;
    }

    const world = localToWorldXZ(localX, localY, building);
    const target = new THREE.Vector3(world.x, elev, world.z);

    // Offset camera along current view direction (or a default 3/4 view).
    const currentDir = new THREE.Vector3()
      .subVectors(camera.position, target)
      .normalize();
    if (currentDir.lengthSq() < 0.01) {
      currentDir.set(0.65, 0.45, 0.65).normalize();
    }
    const distance = Math.min(Math.max(span * 1.8, 8), 45);
    const toCam = target
      .clone()
      .add(currentDir.multiplyScalar(distance));

    const orbit = controls as {
      target: THREE.Vector3;
      update?: () => void;
    } | null;

    anim.current = {
      active: true,
      t: 0,
      fromCam: camera.position.clone(),
      toCam,
      fromTarget: orbit?.target?.clone() ?? target.clone(),
      toTarget: target,
    };
    invalidate();
  }, [
    focusToken,
    building,
    selectedPillarId,
    selectedStairId,
    selectedWallId,
    selectedBeamId,
    pillars,
    beams,
    floorPlates,
    pillarHeight,
    camera,
    controls,
    invalidate,
  ]);

  useFrame((_, dt) => {
    const a = anim.current;
    if (!a?.active) return;
    a.t = Math.min(1, a.t + dt * 2.2);
    // Smoothstep ease
    const e = a.t * a.t * (3 - 2 * a.t);
    camera.position.lerpVectors(a.fromCam, a.toCam, e);
    const orbit = controls as {
      target: THREE.Vector3;
      update?: () => void;
    } | null;
    if (orbit?.target) {
      orbit.target.lerpVectors(a.fromTarget, a.toTarget, e);
      orbit.update?.();
    }
    invalidate();
    if (a.t >= 1) a.active = false;
  });

  return null;
}
