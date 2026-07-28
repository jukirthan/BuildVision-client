"use client";

import { useMemo } from "react";
import { Billboard, Line, Text } from "@react-three/drei";
import type { Pillar } from "@/types/structure";
import { useStructureStore } from "@/store/useStructureStore";

const DIM_COLOR = "#38BDF8";
const MAX_ALL_PAIRS = 48;

type PillarPair = {
  key: string;
  a: Pillar;
  b: Pillar;
  horizontalM: number;
  verticalM: number;
  diagonalM: number;
};

function buildPairs(
  pillars: Pillar[],
  mode: "all" | "selected",
  selectedId: string | null,
  beamPairs: [string, string][]
): PillarPair[] {
  if (pillars.length < 2) return [];

  const byId = new Map(pillars.map((p) => [p.id, p]));
  const pairs: PillarPair[] = [];
  const seen = new Set<string>();

  const pushPair = (a: Pillar, b: Pillar) => {
    const key = a.id < b.id ? `${a.id}|${b.id}` : `${b.id}|${a.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dz = (b.height ?? 0) - (a.height ?? 0);
    const horizontalM = Math.hypot(dx, dy);
    const verticalM = Math.abs(dz);
    const diagonalM = Math.hypot(dx, dy, dz);
    if (horizontalM < 0.05 && verticalM < 0.05) return;
    pairs.push({ key, a, b, horizontalM, verticalM, diagonalM });
  };

  if (mode === "selected" && selectedId) {
    const sel = byId.get(selectedId);
    if (!sel) return [];
    for (const p of pillars) {
      if (p.id === selectedId) continue;
      pushPair(sel, p);
    }
    return pairs.sort((x, y) => x.horizontalM - y.horizontalM);
  }

  // "all" — prefer structural (beam-connected) pairs; fill with nearest if few
  for (const [idA, idB] of beamPairs) {
    const a = byId.get(idA);
    const b = byId.get(idB);
    if (a && b) pushPair(a, b);
  }

  if (pairs.length < pillars.length && pillars.length <= 16) {
    for (let i = 0; i < pillars.length; i++) {
      for (let j = i + 1; j < pillars.length; j++) {
        pushPair(pillars[i], pillars[j]);
      }
    }
  } else if (pairs.length === 0) {
    // Nearest-neighbor fallback for performance
    for (const p of pillars) {
      let best: Pillar | null = null;
      let bestD = Infinity;
      for (const q of pillars) {
        if (q.id === p.id) continue;
        const d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < bestD) {
          bestD = d;
          best = q;
        }
      }
      if (best) pushPair(p, best);
    }
  }

  return pairs
    .sort((x, y) => x.horizontalM - y.horizontalM)
    .slice(0, MAX_ALL_PAIRS);
}

function formatMm(meters: number) {
  return `${Math.round(meters * 1000)} mm`;
}

function DimensionLine({
  pair,
  lineY,
}: {
  pair: PillarPair;
  lineY: number;
}) {
  const { a, b, horizontalM, verticalM, diagonalM } = pair;
  const midX = (a.x + b.x) / 2;
  const midZ = (a.y + b.y) / 2;

  // Offset label slightly above the line
  const labelY = lineY + 0.18;

  const tick = 0.12;
  const ax = a.x;
  const az = a.y;
  const bx = b.x;
  const bz = b.y;

  // Perpendicular for end ticks in XZ plane
  const dx = bx - ax;
  const dz = bz - az;
  const len = Math.hypot(dx, dz) || 1;
  const nx = (-dz / len) * tick;
  const nz = (dx / len) * tick;

  const points: [number, number, number][] = [
    [ax, lineY, az],
    [bx, lineY, bz],
  ];

  const tickA: [number, number, number][] = [
    [ax - nx, lineY, az - nz],
    [ax + nx, lineY, az + nz],
  ];
  const tickB: [number, number, number][] = [
    [bx - nx, lineY, bz - nz],
    [bx + nx, lineY, bz + nz],
  ];

  const showVertical = verticalM > 0.02;
  const label = showVertical
    ? `H ${formatMm(horizontalM)}  ·  V ${formatMm(verticalM)}  ·  D ${formatMm(diagonalM)}`
    : formatMm(horizontalM);

  return (
    <group>
      <Line points={points} color={DIM_COLOR} lineWidth={1.5} transparent opacity={0.9} />
      <Line points={tickA} color={DIM_COLOR} lineWidth={1.25} />
      <Line points={tickB} color={DIM_COLOR} lineWidth={1.25} />
      <Billboard position={[midX, labelY, midZ]} follow lockX={false} lockY={false} lockZ={false}>
        <Text
          fontSize={0.28}
          color="#E0F2FE"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#0F172A"
          maxWidth={4}
        >
          {label}
        </Text>
      </Billboard>
    </group>
  );
}

/**
 * Live pillar-to-pillar distance dimension lines.
 * Updates every frame the store pillars move (Zustand).
 */
export default function PillarDistanceDimensions() {
  const pillars = useStructureStore((s) => s.pillars);
  const beams = useStructureStore((s) => s.beams);
  const selectedPillarId = useStructureStore((s) => s.selectedPillarId);
  const viewFlags = useStructureStore((s) => s.viewFlags);
  const building = useStructureStore((s) => s.building);

  const mode = viewFlags.dimensionMode ?? "selected";
  const enabled = viewFlags.showDimensions && mode !== "off";

  const beamPairs = useMemo(() => {
    const out: [string, string][] = [];
    for (const b of beams) {
      if (b.startPillarId && b.endPillarId) {
        out.push([b.startPillarId, b.endPillarId]);
      }
    }
    return out;
  }, [beams]);

  const pairs = useMemo(() => {
    if (!enabled) return [];
    const effective =
      mode === "all"
        ? "all"
        : selectedPillarId
          ? "selected"
          : "all";
    return buildPairs(
      pillars,
      effective,
      selectedPillarId,
      beamPairs
    );
  }, [enabled, mode, pillars, selectedPillarId, beamPairs]);

  if (!enabled || pairs.length === 0) return null;

  // Draw dimensions at ~1m above ground / mid first floor
  const lineY = Math.min(1.0, building.floorHeight * 0.35);

  return (
    <group>
      {pairs.map((pair) => (
        <DimensionLine key={pair.key} pair={pair} lineY={lineY} />
      ))}
    </group>
  );
}
