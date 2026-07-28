import * as THREE from "three";
import type { BuildingConfig } from "@/types/structure";

/**
 * The building can be rotated in the viewport (Toolbar "Rot" button /
 * building.rotationDeg). All pillars/walls/stairs are stored in *local*
 * plan coordinates (0..width, 0..length) but pointer/raycast hits from
 * react-three-fiber come back in *world* space. Without converting
 * between the two, dragging/placing elements drifts or feels "broken"
 * as soon as the building has any rotation applied.
 *
 * These helpers keep every interaction (drag, click-to-place, wall
 * drafting, stair/opening placement) correct regardless of rotation.
 */

const _raycaster = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _hit = new THREE.Vector3();
const _plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

/** Project a screen pointer onto a horizontal plane → local plan coords. */
export function screenToLocalXZ(
  clientX: number,
  clientY: number,
  domElement: HTMLElement,
  camera: THREE.Camera,
  planeY: number,
  building: BuildingConfig
): { x: number; y: number } | null {
  const rect = domElement.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  _ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  _ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  _raycaster.setFromCamera(_ndc, camera);
  _plane.constant = -planeY;
  if (!_raycaster.ray.intersectPlane(_plane, _hit)) return null;
  return worldToLocalXZ(_hit.x, _hit.z, building);
}

export function worldToLocalXZ(
  worldX: number,
  worldZ: number,
  building: BuildingConfig
): { x: number; y: number } {
  const rotDeg = building.rotationDeg ?? 0;
  const cx = building.width / 2;
  const cz = building.length / 2;
  if (!rotDeg) return { x: worldX, y: worldZ };
  const rot = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const offsetX = worldX - cx;
  const offsetZ = worldZ - cz;
  return {
    x: cx + offsetX * cos - offsetZ * sin,
    y: cz + offsetX * sin + offsetZ * cos,
  };
}

export function localToWorldXZ(
  localX: number,
  localY: number,
  building: BuildingConfig
): { x: number; z: number } {
  const rotDeg = building.rotationDeg ?? 0;
  const cx = building.width / 2;
  const cz = building.length / 2;
  if (!rotDeg) return { x: localX, z: localY };
  const rot = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const dx = localX - cx;
  const dz = localY - cz;
  return {
    x: cx + dx * cos + dz * sin,
    z: cz - dx * sin + dz * cos,
  };
}
