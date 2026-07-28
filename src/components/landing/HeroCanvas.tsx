"use client";

import { ContactShadows, Float, Grid } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useMemo, useRef, type MutableRefObject } from "react";
import type { Group, Mesh } from "three";
import * as THREE from "three";
import { useReducedMotion } from "framer-motion";

/**
 * Cinematic hero scene: a parametric glass tower on an engineering grid.
 * The camera orbits slowly and leans toward the pointer; the section that
 * hosts the canvas is the event source, so the canvas itself stays
 * pointer-events-none and never blocks text selection.
 */

function CameraRig({ animate }: { animate: boolean }) {
  useFrame((state) => {
    if (!animate) return;
    const t = state.clock.elapsedTime;
    const angle = t * 0.06;
    const radius = 13.5;
    const targetX = Math.sin(angle) * radius + state.pointer.x * 1.4;
    const targetZ = Math.cos(angle) * radius;
    const targetY = 5.4 + state.pointer.y * 0.9;

    // Lerp for weight — the camera should feel like a crane, not a cursor.
    state.camera.position.x += (targetX - state.camera.position.x) * 0.03;
    state.camera.position.y += (targetY - state.camera.position.y) * 0.03;
    state.camera.position.z += (targetZ - state.camera.position.z) * 0.03;
    state.camera.lookAt(0, 0.4, 0);
  });
  return null;
}

function ArchitecturalTower({ animate }: { animate: boolean }) {
  const group = useRef<Group>(null);
  const coreRef = useRef<Mesh>(null);

  const floors = useMemo(
    () =>
      Array.from({ length: 9 }).map((_, i) => ({
        y: i * 0.95 - 3.8,
        scale: 1 - i * 0.05,
        rotation: (i * Math.PI) / 16,
      })),
    []
  );

  useFrame((_, dt) => {
    if (!animate || !group.current) return;
    group.current.rotation.y += dt * 0.08;
    if (coreRef.current) coreRef.current.rotation.y -= dt * 0.05;
  });

  return (
    <group ref={group} position={[0, 0, 0]}>
      {/* Foundation */}
      <mesh position={[0, -4.2, 0]} receiveShadow>
        <cylinderGeometry args={[5.2, 5.6, 0.4, 48]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, -4.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.6, 6.2, 48]} />
        <meshBasicMaterial color="#2563eb" wireframe transparent opacity={0.3} />
      </mesh>

      {/* Structural core */}
      <mesh ref={coreRef} position={[0, 0.5, 0]}>
        <boxGeometry args={[1.2, 8.5, 1.2]} />
        <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.15} />
      </mesh>

      {/* Floor plates + glass curtain */}
      {floors.map((floor, i) => (
        <group key={i} position={[0, floor.y, 0]} rotation={[0, floor.rotation, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[4.2 * floor.scale, 0.15, 4.2 * floor.scale]} />
            <meshStandardMaterial
              color="#2563eb"
              metalness={0.65}
              roughness={0.25}
              envMapIntensity={1.2}
            />
          </mesh>
          <mesh position={[0, 0.4, 0]}>
            <boxGeometry args={[4.0 * floor.scale, 0.7, 4.0 * floor.scale]} />
            <meshPhysicalMaterial
              color="#60a5fa"
              transparent
              opacity={0.32}
              transmission={0.85}
              roughness={0.08}
              ior={1.5}
            />
          </mesh>
          {[-1, 1].map((cx) =>
            [-1, 1].map((cz) => (
              <mesh
                key={`${cx}-${cz}`}
                position={[cx * (1.8 * floor.scale), 0.4, cz * (1.8 * floor.scale)]}
              >
                <cylinderGeometry args={[0.06, 0.06, 0.8, 8]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.1} />
              </mesh>
            ))
          )}
          <lineSegments>
            <edgesGeometry
              args={[new THREE.BoxGeometry(4.25 * floor.scale, 0.16, 4.25 * floor.scale)]}
            />
            <lineBasicMaterial color="#60a5fa" transparent opacity={0.5} />
          </lineSegments>
        </group>
      ))}

      {/* Spire */}
      <mesh position={[0, 4.8, 0]}>
        <cylinderGeometry args={[0.04, 0.2, 1.8, 8]} />
        <meshStandardMaterial color="#06b6d4" emissive="#06b6d4" emissiveIntensity={0.7} />
      </mesh>
      <pointLight position={[0, 5.8, 0]} intensity={1.2} color="#06b6d4" distance={8} />
    </group>
  );
}

function Particles({ animate }: { animate: boolean }) {
  const count = 80;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i += 3) {
      pos[i] = (Math.random() - 0.5) * 16;
      pos[i + 1] = (Math.random() - 0.5) * 13;
      pos[i + 2] = (Math.random() - 0.5) * 16;
    }
    return pos;
  }, []);

  const pointsRef = useRef<THREE.Points>(null);

  useFrame((state, dt) => {
    if (!animate || !pointsRef.current) return;
    pointsRef.current.rotation.y += dt * 0.04;
    pointsRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.25;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.07}
        color="#60a5fa"
        transparent
        opacity={0.65}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  );
}

export default function HeroCanvas({
  eventSource,
}: {
  /** Host element whose pointer moves drive the parallax camera. */
  eventSource?: MutableRefObject<HTMLElement | null>;
}) {
  const reduce = useReducedMotion();
  const animate = !reduce;

  return (
    <div className="pointer-events-none absolute inset-0 z-0">
      <Canvas
        camera={{ position: [10, 5.5, 12], fov: 38, near: 0.1, far: 100 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
        eventSource={
          (eventSource as MutableRefObject<HTMLElement> | undefined) ?? undefined
        }
        eventPrefix="client"
        frameloop={animate ? "always" : "demand"}
      >
        <Suspense fallback={null}>
          <fog attach="fog" args={["#020617", 16, 38]} />

          <ambientLight intensity={0.55} />
          <directionalLight position={[10, 16, 8]} intensity={1.5} color="#ffffff" />
          <directionalLight position={[-10, 10, -8]} intensity={0.8} color="#2563eb" />
          <pointLight position={[0, -2, 6]} intensity={1.1} color="#7c3aed" />

          {animate ? (
            <Float speed={1.4} rotationIntensity={0.15} floatIntensity={0.45}>
              <ArchitecturalTower animate />
            </Float>
          ) : (
            <ArchitecturalTower animate={false} />
          )}

          <Particles animate={animate} />

          {/* Engineering ground grid, fading toward the horizon */}
          <Grid
            position={[0, -4.42, 0]}
            args={[60, 60]}
            cellSize={1.1}
            cellThickness={0.55}
            cellColor="#1e3a8a"
            sectionSize={5.5}
            sectionThickness={1}
            sectionColor="#2563eb"
            fadeDistance={38}
            fadeStrength={2.4}
            infiniteGrid
          />

          {animate && (
            <ContactShadows
              position={[0, -4.4, 0]}
              opacity={0.6}
              scale={20}
              blur={2.5}
              far={10}
            />
          )}

          <CameraRig animate={animate} />
        </Suspense>
      </Canvas>
    </div>
  );
}
