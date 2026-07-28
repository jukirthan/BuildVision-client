/** Comfort / geometry from floor height + user step count (IS/NBC teaching). */
export function computeStairFromSteps(
  floorHeightM: number,
  stepCount: number,
  preferredTreadMm?: number
) {
  const steps = Math.min(30, Math.max(3, Math.round(stepCount)));
  const riseMm = Math.round((floorHeightM * 1000) / steps);
  // Blondel: 2R + T ≈ 600–650 mm. Prefer user tread, else solve for comfort.
  const treadMm =
    preferredTreadMm ??
    Math.round(Math.min(320, Math.max(250, 630 - 2 * riseMm)));
  const comfortMm = Math.round(2 * riseMm + treadMm);
  // Going length ≈ tread × number of treads (≈ steps for straight flight)
  const depthM = Math.round((treadMm * steps) / 1000 * 100) / 100;
  return {
    stepCount: steps,
    riseMm,
    treadMm,
    comfortMm,
    depthM: Math.max(1.2, Math.min(depthM, 8)),
    /** True when rise is in a comfortable residential band */
    riseOk: riseMm >= 150 && riseMm <= 190,
    comfortOk: comfortMm >= 550 && comfortMm <= 700,
  };
}

export function defaultStepCount(floorHeightM: number, targetRiseMm = 175) {
  return Math.min(
    30,
    Math.max(3, Math.round((floorHeightM * 1000) / targetRiseMm))
  );
}
