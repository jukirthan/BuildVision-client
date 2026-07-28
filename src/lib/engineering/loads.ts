import type {
  Beam,
  BuildingConfig,
  Pillar,
  SiteConfig,
  Slab,
} from "@/types/structure";
import { UNIT_WEIGHT_CONCRETE } from "@/lib/engineering/codes";

export function defaultSite(building: BuildingConfig): SiteConfig {
  return (
    building.site ?? {
      plotWidth: building.width + 4,
      plotLength: building.length + 4,
      soilType: "stiff_clay",
      bearingCapacityKNm2: 200,
      groundLevel: 0,
      roadLevel: -0.45,
      orientationDeg: 0,
      earthquakeZone: "III",
      windZone: "B",
      rainfallMm: 1200,
      floodLevel: -0.3,
    }
  );
}

/** Typical residential/commercial finishes + self-weight contribution per floor (kN/m²). */
export function floorSuperimposedDL(slabThicknessM: number) {
  const self = slabThicknessM * UNIT_WEIGHT_CONCRETE;
  const finishes = 1.5;
  const partitions = 1.0;
  return self + finishes + partitions;
}

export function typicalLiveLoad(building: BuildingConfig) {
  // Simplified occupancy: office/residential mid
  return building.floors > 4 ? 3.0 : 2.0; // kN/m²
}

/**
 * Tributary load on a column from floors above (very simplified tributary area).
 * Professional software would run FEM — this teaches the dependency chain.
 */
export function estimateColumnAxialKN(
  pillar: Pillar,
  pillars: Pillar[],
  building: BuildingConfig,
  slab: Slab | undefined
): number {
  const n = Math.max(pillars.length, 1);
  const area = building.width * building.length;
  const trib = area / n;
  const t = slab?.thickness ?? 0.15;
  const dl = floorSuperimposedDL(t);
  const ll = typicalLiveLoad(building);
  const factored = 1.5 * (dl + ll); // IS456 ultimate load factor (gravity)
  const floorsAbove = building.floors; // conservative: full stack
  const selfWeight =
    pillar.width * pillar.depth * building.floorHeight * floorsAbove * UNIT_WEIGHT_CONCRETE;
  return Math.round((factored * trib * floorsAbove + selfWeight) * 10) / 10;
}

export function estimateBeamUniformLoadKNm(
  beam: Beam,
  building: BuildingConfig,
  slab: Slab | undefined
) {
  const t = slab?.thickness ?? 0.15;
  const dl = floorSuperimposedDL(t);
  const ll = typicalLiveLoad(building);
  // Assume ½ span tributary each side ≈ beam length / grid; use 0.5 * length as width proxy
  const tribWidth = Math.min(building.width, building.length) / 4;
  const wu = 1.5 * (dl + ll) * tribWidth;
  const self = beam.width * beam.depth * UNIT_WEIGHT_CONCRETE * 1.5;
  return Math.round((wu + self) * 100) / 100;
}
