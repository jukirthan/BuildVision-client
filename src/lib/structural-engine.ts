import type {
  Beam,
  BuildingConfig,
  MaterialType,
  Pillar,
  Slab,
} from "@/types/structure";

const CONCRETE_MULT = 25;
const STEEL_MULT = 78.5;

export function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function dist(ax: number, ay: number, bx: number, by: number) {
  return Math.hypot(bx - ax, by - ay);
}

function round(n: number, d = 4) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

export function pillarLoadCapacity(
  width: number,
  depth: number,
  height: number,
  material: MaterialType = "concrete"
) {
  const mult = material === "concrete" ? CONCRETE_MULT : STEEL_MULT;
  return round(width * depth * height * mult * 10, 2);
}

export function beamLoadBearing(
  width: number,
  depth: number,
  length: number,
  material: MaterialType = "concrete"
) {
  const mult = material === "concrete" ? CONCRETE_MULT : STEEL_MULT;
  return round(width * depth * length * mult, 2);
}

export function slabLoadCapacity(
  thickness: number,
  area: number,
  material: MaterialType = "concrete"
) {
  const mult = material === "concrete" ? CONCRETE_MULT : STEEL_MULT;
  return round(thickness * area * mult, 2);
}

export function generatePillarGrid(
  building: BuildingConfig,
  cols: number,
  rows: number,
  pillarWidth = 0.4,
  pillarDepth = 0.4,
  margin = 1,
  floorId = "legacy-floor",
  baseElevation = 0
): Pillar[] {
  const usableW = Math.max(building.width - margin * 2, 1);
  const usableL = Math.max(building.length - margin * 2, 1);
  const pillars: Pillar[] = [];
  let n = 1;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x =
        cols === 1 ? building.width / 2 : margin + (c / (cols - 1)) * usableW;
      const y =
        rows === 1 ? building.length / 2 : margin + (r / (rows - 1)) * usableL;
      pillars.push({
        id: uid("p"),
        floorId,
        stackId: `stack-${round(x, 3)}-${round(y, 3)}`,
        name: `P${n}`,
        x: round(x, 2),
        y: round(y, 2),
        width: pillarWidth,
        depth: pillarDepth,
        height: building.floorHeight,
        baseElevation,
        material: "concrete",
        loadCapacity: pillarLoadCapacity(
          pillarWidth,
          pillarDepth,
          building.floorHeight
        ),
      });
      n += 1;
    }
  }
  return pillars;
}

export function generateBeamsFromPillars(
  pillars: Pillar[],
  beamWidth = 0.3,
  beamDepth = 0.5,
  floorHeight = 3,
  floorId = pillars[0]?.floorId ?? "legacy-floor"
): Beam[] {
  if (pillars.length < 2) return [];

  const sorted = [...pillars];
  const beams: Beam[] = [];
  const seen = new Set<string>();
  const tol = 0.35;

  const xs = uniqueSorted(
    sorted.map((p) => p.x),
    tol
  );
  const ys = uniqueSorted(
    sorted.map((p) => p.y),
    tol
  );

  for (const y of ys) {
    const row = sorted
      .filter((p) => Math.abs(p.y - y) < tol)
      .sort((a, b) => a.x - b.x);
    for (let i = 0; i < row.length - 1; i++) {
      const a = row[i];
      const b = row[i + 1];
      const key = edgeKey(a.id, b.id);
      if (seen.has(key)) continue;
      seen.add(key);
      beams.push(makeBeam(a, b, beams.length + 1, beamWidth, beamDepth, floorHeight, floorId));
    }
  }

  for (const x of xs) {
    const col = sorted
      .filter((p) => Math.abs(p.x - x) < tol)
      .sort((a, b) => a.y - b.y);
    for (let i = 0; i < col.length - 1; i++) {
      const a = col[i];
      const b = col[i + 1];
      const key = edgeKey(a.id, b.id);
      if (seen.has(key)) continue;
      seen.add(key);
      beams.push(makeBeam(a, b, beams.length + 1, beamWidth, beamDepth, floorHeight, floorId));
    }
  }

  return beams;
}

function makeBeam(
  a: Pillar,
  b: Pillar,
  index: number,
  width: number,
  depth: number,
  floorHeight: number,
  floorId: string
): Beam {
  const length = round(dist(a.x, a.y, b.x, b.y), 4);
  return {
    id: uid("b"),
    floorId,
    name: `B${index}`,
    startX: a.x,
    startY: a.y,
    endX: b.x,
    endY: b.y,
    width,
    depth,
    length,
    material: "concrete",
    loadBearing: beamLoadBearing(width, depth, length),
    height: floorHeight,
    startPillarId: a.id,
    endPillarId: b.id,
  };
}

export function generateSlab(
  building: BuildingConfig,
  thickness = 0.15,
  floorId = "legacy-floor"
): Slab {
  const area = round(building.width * building.length, 2);
  return {
    id: uid("s"),
    floorId,
    name: "Slab-1",
    thickness,
    area,
    material: "concrete",
    loadCapacity: slabLoadCapacity(thickness, area),
    width: building.width,
    length: building.length,
    centerX: building.width / 2,
    centerY: building.length / 2,
  };
}

export function recalculateStructure(
  building: BuildingConfig,
  pillars: Pillar[],
  slabThickness = 0.15,
  previousBeams?: Beam[],
  previousSlabs?: Slab[]
) {
  const updatedPillars = pillars.map((p) => ({
    ...p,
    floorId: p.floorId ?? "legacy-floor",
    stackId: p.stackId ?? `stack-${round(p.x, 3)}-${round(p.y, 3)}`,
    baseElevation: p.baseElevation ?? 0,
    height: p.height || building.floorHeight,
    loadCapacity: pillarLoadCapacity(
      p.width,
      p.depth,
      p.height || building.floorHeight,
      p.material
    ),
  }));
  let beams = generateBeamsFromPillars(
    updatedPillars,
    0.3,
    0.5,
    building.floorHeight,
    updatedPillars[0]?.floorId ?? "legacy-floor"
  );
  // Preserve engineered sizes / rebar when topology rematches.
  if (previousBeams?.length) {
    beams = beams.map((b) => {
      const match = previousBeams.find(
        (pb) =>
          Math.hypot(pb.startX - b.startX, pb.startY - b.startY) < 0.4 &&
          Math.hypot(pb.endX - b.endX, pb.endY - b.endY) < 0.4
      );
      if (!match) return b;
      return {
        ...b,
        floorId: b.floorId ?? updatedPillars[0]?.floorId ?? "legacy-floor",
        width: match.width,
        depth: match.depth,
        concreteGrade: match.concreteGrade,
        steelGrade: match.steelGrade,
        topBars: match.topBars,
        bottomBars: match.bottomBars,
        stirrups: match.stirrups,
        supportCondition: match.supportCondition,
      };
    });
  }
  const prevT = previousSlabs?.[0]?.thickness ?? slabThickness;
  const slabs = [generateSlab(building, prevT)].map((s) => {
    const prev = previousSlabs?.[0];
    if (!prev) return s;
    return {
      ...s,
      floorId: s.floorId ?? updatedPillars[0]?.floorId ?? "legacy-floor",
      thickness: prev.thickness,
      system: prev.system,
      topMesh: prev.topMesh,
      bottomMesh: prev.bottomMesh,
      deadLoadKNm2: prev.deadLoadKNm2,
      liveLoadKNm2: prev.liveLoadKNm2,
    };
  });
  return { pillars: updatedPillars, beams, slabs };
}

function uniqueSorted(values: number[], tol: number) {
  const out: number[] = [];
  [...values]
    .sort((a, b) => a - b)
    .forEach((v) => {
      if (!out.some((x) => Math.abs(x - v) < tol)) out.push(v);
    });
  return out;
}

function edgeKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export function defaultBuilding(): BuildingConfig {
  return {
    name: "Tower A",
    width: 20,
    length: 15,
    floors: 3,
    floorHeight: 3.2,
    showFoundation: true,
    showAllFloors: true,
    showRoof: true,
    roofType: "flat",
    roof: {
      type: "flat",
      overhangM: 0.45,
      thickness: 0.15,
      slopeDeg: 25,
      material: "concrete",
      parapetHeight: 0.6,
    },
    design: {
      concreteGrade: "M25",
      steelGrade: "Fe500",
      clearCoverMm: 40,
      designCode: "IS456",
    },
    site: {
      plotWidth: 24,
      plotLength: 19,
      soilType: "stiff_clay",
      bearingCapacityKNm2: 200,
      groundLevel: 0,
      roadLevel: -0.45,
      orientationDeg: 0,
      earthquakeZone: "III",
      windZone: "B",
      rainfallMm: 1200,
      floodLevel: -0.3,
    },
    foundation: {
      type: "isolated",
      thickness: 0.45,
      width: 1.5,
      length: 1.5,
      pedestalHeight: 0.3,
      concreteGrade: "M25",
      steelGrade: "Fe500",
      mainBars: { diameterMm: 12, count: 8 },
      distributionBars: { diameterMm: 10, count: 8 },
      bottomMesh: { diameterMm: 12, count: 8, spacingMm: 150 },
      topMesh: { diameterMm: 10, count: 6, spacingMm: 200 },
      foundationLevel: -1.5,
    },
    rotationDeg: 0,
  };
}

/** Perimeter walls for a floor plate. */
export function generatePerimeterWalls(
  building: BuildingConfig,
  floor: number
) {
  const h = building.floorHeight;
  const w = building.width;
  const l = building.length;
  const t = 0.2;
  const mk = (
    name: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ) => ({
    id: uid("w"),
    name,
    startX,
    startY,
    endX,
    endY,
    thickness: t,
    height: h,
    material: "brick" as const,
    floor,
  });
  return [
    mk(`W${floor}-N`, 0, 0, w, 0),
    mk(`W${floor}-E`, w, 0, w, l),
    mk(`W${floor}-S`, w, l, 0, l),
    mk(`W${floor}-W`, 0, l, 0, 0),
  ];
}

export function emptyFloorPlate(floor: number, building?: BuildingConfig) {
  return {
    floor,
    walls: building ? generatePerimeterWalls(building, floor) : [],
    openings: [] as import("@/types/structure").Opening[],
    stairs: [] as import("@/types/structure").Stair[],
  };
}

export function createInitialStructure() {
  const building = defaultBuilding();
  const pillars = generatePillarGrid(building, 4, 3, 0.4, 0.4);
  return recalculateStructure(building, pillars);
}
