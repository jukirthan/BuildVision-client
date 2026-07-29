/**
 * Display length units. Geometry is always stored in meters internally.
 */

export type LengthUnit = "m" | "cm" | "ft" | "in";

export const LENGTH_UNITS: LengthUnit[] = ["m", "cm", "ft", "in"];

export const LENGTH_UNIT_LABELS: Record<LengthUnit, string> = {
  m: "Meters (m)",
  cm: "Centimeters (cm)",
  ft: "Feet (ft)",
  in: "Inches (in)",
};

export const LENGTH_UNIT_SHORT: Record<LengthUnit, string> = {
  m: "m",
  cm: "cm",
  ft: "ft",
  in: "in",
};

/** Meters → selected unit. */
export function metersToUnit(meters: number, unit: LengthUnit): number {
  switch (unit) {
    case "cm":
      return meters * 100;
    case "ft":
      return meters * 3.280839895;
    case "in":
      return meters * 39.37007874;
    case "m":
    default:
      return meters;
  }
}

/** Selected unit → meters. */
export function unitToMeters(value: number, unit: LengthUnit): number {
  switch (unit) {
    case "cm":
      return value / 100;
    case "ft":
      return value / 3.280839895;
    case "in":
      return value / 39.37007874;
    case "m":
    default:
      return value;
  }
}

export function unitDecimals(unit: LengthUnit): number {
  switch (unit) {
    case "cm":
      return 1;
    case "ft":
      return 2;
    case "in":
      return 1;
    case "m":
    default:
      return 2;
  }
}

/** Sensible default step for number inputs in the selected unit. */
export function unitStep(unit: LengthUnit): number {
  switch (unit) {
    case "cm":
      return 1;
    case "ft":
      return 0.1;
    case "in":
      return 0.5;
    case "m":
    default:
      return 0.05;
  }
}

export function formatLength(
  meters: number,
  unit: LengthUnit = "m",
  digits?: number
): string {
  const d = digits ?? unitDecimals(unit);
  const value = metersToUnit(meters, unit);
  return `${value.toFixed(d)} ${LENGTH_UNIT_SHORT[unit]}`;
}

export function isLengthUnit(value: unknown): value is LengthUnit {
  return typeof value === "string" && LENGTH_UNITS.includes(value as LengthUnit);
}

export const LENGTH_UNIT_STORAGE_KEY = "bv_length_unit";
