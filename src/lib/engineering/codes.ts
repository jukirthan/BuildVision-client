import type { ConcreteGrade, SteelGrade } from "@/types/structure";

/** Characteristic compressive strength fck (MPa) */
export const FCK: Record<ConcreteGrade, number> = {
  M20: 20,
  M25: 25,
  M30: 30,
  M35: 35,
  M40: 40,
};

/** Characteristic yield fy (MPa) */
export const FY: Record<SteelGrade, number> = {
  Fe415: 415,
  Fe500: 500,
  Fe550: 550,
};

export const UNIT_WEIGHT_CONCRETE = 25; // kN/m³
export const UNIT_WEIGHT_STEEL = 78.5; // kN/m³
export const STEEL_DENSITY_KG_M3 = 7850;

/** Bar area mm² */
export function barAreaMm2(diameterMm: number) {
  return (Math.PI / 4) * diameterMm * diameterMm;
}

/** Steel weight kg for length m and diameter mm */
export function barWeightKg(diameterMm: number, lengthM: number, count = 1) {
  const areaM2 = barAreaMm2(diameterMm) * 1e-6;
  return areaM2 * lengthM * STEEL_DENSITY_KG_M3 * count;
}

/** Approx lap length (IS456 rough): Ld ≈ (φ * σs) / (4τbd) → use 40φ for tension Fe500 M25 */
export function lapLengthMm(
  diameterMm: number,
  steel: SteelGrade = "Fe500",
  concrete: ConcreteGrade = "M25"
) {
  const base = steel === "Fe415" ? 47 : steel === "Fe550" ? 55 : 50;
  const gradeFactor = FCK[concrete] >= 30 ? 0.9 : 1;
  return Math.round(base * gradeFactor * diameterMm);
}

export function defaultClearCoverMm(member: "column" | "beam" | "slab" | "footing") {
  switch (member) {
    case "footing":
      return 50;
    case "column":
      return 40;
    case "beam":
      return 25;
    case "slab":
      return 20;
  }
}
