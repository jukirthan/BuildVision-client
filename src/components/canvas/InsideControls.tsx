"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useStructureStore } from "@/store/useStructureStore";

/**
 * First-person style movement inside the building.
 * WASD / arrows move · right-drag looks · Space/Shift height · Esc exits to orbit.
 */
export default function InsideControls({ enabled }: { enabled: boolean }) {
  const { camera, gl } = useThree();
  const building = useStructureStore((s) => s.building);
  const activeFloor = useStructureStore((s) => s.activeFloor);
  const setViewMode = useStructureStore((s) => s.setViewMode);
  const isDragging = useStructureStore((s) => s.isDragging);

  const keys = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
    up: false,
    down: false,
  });
  const look = useRef({
    dragging: false,
    lastX: 0,
    lastY: 0,
    yaw: 0,
    pitch: 0,
  });
  const placedForFloor = useRef<number | null>(null);

  const eyeHeight = 1.65;
  const floorY = (activeFloor - 1) * building.floorHeight;

  // Place camera inside when entering / changing floor.
  useEffect(() => {
    if (!enabled) {
      placedForFloor.current = null;
      return;
    }
    if (placedForFloor.current === activeFloor) return;
    placedForFloor.current = activeFloor;
    const x = THREE.MathUtils.clamp(building.width * 0.35, 1, building.width - 1);
    const z = THREE.MathUtils.clamp(building.length * 0.35, 1, building.length - 1);
    camera.position.set(x, floorY + eyeHeight, z);
    look.current.yaw = Math.PI * 0.25;
    look.current.pitch = 0;
    camera.rotation.order = "YXZ";
    camera.rotation.y = look.current.yaw;
    camera.rotation.x = look.current.pitch;
  }, [enabled, activeFloor, building.width, building.length, floorY, camera]);

  useEffect(() => {
    if (!enabled) return;
    const el = gl.domElement;

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.shiftKey && e.key.startsWith("Arrow")) return;
      const k = e.key.toLowerCase();
      if (k === "w" || (!e.shiftKey && k === "arrowup")) keys.current.w = true;
      if (k === "a" || (!e.shiftKey && k === "arrowleft")) keys.current.a = true;
      if (k === "s" || (!e.shiftKey && k === "arrowdown")) keys.current.s = true;
      if (k === "d" || (!e.shiftKey && k === "arrowright")) keys.current.d = true;
      if (e.key === " " || k === "e") {
        e.preventDefault();
        keys.current.up = true;
      }
      if (k === "shift" || k === "q" || k === "c") keys.current.down = true;
      if (k === "escape") setViewMode("orbit");
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "w" || k === "arrowup") keys.current.w = false;
      if (k === "a" || k === "arrowleft") keys.current.a = false;
      if (k === "s" || k === "arrowdown") keys.current.s = false;
      if (k === "d" || k === "arrowright") keys.current.d = false;
      if (e.key === " " || k === "e") keys.current.up = false;
      if (k === "shift" || k === "q" || k === "c") keys.current.down = false;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 2 && e.button !== 1) return;
      look.current.dragging = true;
      look.current.lastX = e.clientX;
      look.current.lastY = e.clientY;
      el.setPointerCapture?.(e.pointerId);
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!look.current.dragging) return;
      const dx = e.clientX - look.current.lastX;
      const dy = e.clientY - look.current.lastY;
      look.current.lastX = e.clientX;
      look.current.lastY = e.clientY;
      look.current.yaw -= dx * 0.0045;
      look.current.pitch = THREE.MathUtils.clamp(
        look.current.pitch - dy * 0.0035,
        -1.2,
        1.2
      );
    };
    const onPointerUp = (e: PointerEvent) => {
      look.current.dragging = false;
      el.releasePointerCapture?.(e.pointerId);
    };
    const onContextMenu = (e: Event) => e.preventDefault();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("contextmenu", onContextMenu);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("contextmenu", onContextMenu);
    };
  }, [enabled, gl, setViewMode]);

  useFrame((_, dt) => {
    if (!enabled || isDragging) return;
    const speed = 6;
    const k = keys.current;
    const forward = new THREE.Vector3(
      -Math.sin(look.current.yaw),
      0,
      -Math.cos(look.current.yaw)
    );
    const right = new THREE.Vector3(
      Math.cos(look.current.yaw),
      0,
      -Math.sin(look.current.yaw)
    );
    const move = new THREE.Vector3();
    if (k.w) move.add(forward);
    if (k.s) move.sub(forward);
    if (k.a) move.sub(right);
    if (k.d) move.add(right);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(speed * Math.min(dt, 0.05));
      camera.position.add(move);
    }
    if (k.up) camera.position.y += speed * 0.6 * dt;
    if (k.down) camera.position.y -= speed * 0.6 * dt;

    const margin = 0.4;
    camera.position.x = THREE.MathUtils.clamp(
      camera.position.x,
      margin,
      building.width - margin
    );
    camera.position.z = THREE.MathUtils.clamp(
      camera.position.z,
      margin,
      building.length - margin
    );
    const minY = floorY + 0.9;
    const maxY = floorY + building.floorHeight - 0.35;
    camera.position.y = THREE.MathUtils.clamp(camera.position.y, minY, maxY);

    camera.rotation.order = "YXZ";
    camera.rotation.y = look.current.yaw;
    camera.rotation.x = look.current.pitch;
  });

  return null;
}
