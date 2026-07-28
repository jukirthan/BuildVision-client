export type MeasurementPoint = { x: number; y: number };

export type Measurement = {
  id: string;
  type: string;
  label: string;
  p1: MeasurementPoint;
  p2: MeasurementPoint;
  pixels: number;
  meters: number;
};

export const ELEMENT_TYPES = [
  "Pillar width",
  "Pillar depth",
  "Beam width",
  "Beam height",
  "Floor height",
  "Ceiling height",
  "Door width",
  "Door height",
  "Window width",
  "Window height",
  "Column spacing",
  "Beam spacing",
  "Room length",
  "Room width",
  "Wall length",
  "Wall height",
  "Object distance",
  "Custom",
] as const;

export function pixelDistance(a: MeasurementPoint, b: MeasurementPoint) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function metersToFeet(m: number) {
  return m * 3.28084;
}

/** Minimum practical sizes used for lightweight sanity warnings — not a full structural check. */
const MIN_GUIDANCE: Record<string, { min: number; note: string }> = {
  "Pillar width": { min: 0.23, note: "Typical minimum load-bearing column width is ~230mm." },
  "Pillar depth": { min: 0.23, note: "Typical minimum load-bearing column depth is ~230mm." },
  "Beam width": { min: 0.2, note: "Beams are usually at least 200mm wide." },
  "Beam height": { min: 0.3, note: "Beam depth is typically ≥ span/12 for RC beams." },
  "Floor height": { min: 2.6, note: "Habitable floor-to-floor height is usually ≥ 2.6m." },
  "Door width": { min: 0.8, note: "Standard interior door width is ~0.8–0.9m." },
  "Window width": { min: 0.6, note: "Typical window width is ≥ 0.6m for adequate light." },
};

export function guidanceFor(type: string, meters: number): string | null {
  const rule = MIN_GUIDANCE[type];
  if (!rule) return null;
  if (meters < rule.min) {
    return `Measured ${meters.toFixed(2)}m is below the typical minimum (${rule.min}m). ${rule.note}`;
  }
  return null;
}
