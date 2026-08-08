import type {
  Beam,
  BoqLine,
  BuildingConfig,
  Floor,
  FloorCostEstimate,
  FloorPlate,
  MaterialEstimate,
  Pillar,
  Slab,
  Wall,
} from "@/types/structure";
import { barAreaMm2 } from "@/lib/engineering/codes";

export const RATES = {
  concretePerM3: 150,
  steelPerKg: 1.2,
  brickPerM3: 90,
  labourPerM3: 45,
  excavationPerM3: 25,
  formworkPerM2: 18,
  beamSteelKgPerM: 0.5,
  slabSteelKgPerM2: 2.0,
  brickUnitVolumeM3: 0.0015, // approx modular brick + mortar
};

export function wallLength(wall: Wall) {
  return Math.hypot(wall.endX - wall.startX, wall.endY - wall.startY);
}

function round(n: number, d = 2) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function barSteelKg(diameterMm: number, count: number, lengthM: number) {
  const areaM2 = barAreaMm2(diameterMm as 8) / 1e6;
  return areaM2 * lengthM * count * 7850;
}

function line(
  id: string,
  category: string,
  description: string,
  unit: string,
  quantity: number,
  rate: number
): BoqLine {
  return {
    id,
    category,
    description,
    unit,
    quantity: round(quantity, 3),
    rate,
    amount: round(quantity * rate, 2),
  };
}

export function estimateMaterials(
  pillars: Pillar[],
  beams: Beam[],
  slabs: Slab[],
  floorPlates: FloorPlate[],
  floors = 1,
  building?: BuildingConfig
): MaterialEstimate {
  // A floor-owned collection already contains every physical member. Only
  // legacy, unscoped snapshots are multiplied for backward compatibility.
  const hasFloorScopedMembers =
    pillars.some((item) => item.floorId && item.floorId !== "legacy-floor") ||
    beams.some((item) => item.floorId && item.floorId !== "legacy-floor") ||
    slabs.some((item) => item.floorId && item.floorId !== "legacy-floor");
  const nFloors = hasFloorScopedMembers ? 1 : Math.max(floors, 1);
  let concreteColumns = 0;
  let concreteBeams = 0;
  let concreteSlabs = 0;
  let concreteWalls = 0;
  let concreteFootings = 0;
  let steel = 0;
  let brick = 0;
  let formwork = 0;
  let stirrupLengthM = 0;
  let tieLengthM = 0;
  let beamLengthM = 0;
  let columnHeightM = 0;

  for (const p of pillars) {
    const H = p.height * (hasFloorScopedMembers ? 1 : nFloors);
    columnHeightM += H;
    const isCirc = p.shape === "circular";
    const diam = Math.max(p.width, p.depth);
    const vol = isCirc
      ? (Math.PI / 4) * diam * diam * H
      : p.width * p.depth * H;
    concreteColumns += vol;
    formwork += isCirc
      ? Math.PI * diam * H
      : 2 * (p.width + p.depth) * H;

    const bars = p.longitudinalBars;
    if (bars) {
      steel += barSteelKg(bars.diameterMm, bars.count, H);
    }
    const st = p.stirrups;
    if (st) {
      const peri = isCirc
        ? Math.PI * diam
        : 2 * (p.width + p.depth);
      const nTies = Math.ceil(H / (st.spacingMm / 1000));
      const len = peri * nTies;
      tieLengthM += len;
      steel += barSteelKg(st.diameterMm, 1, len);
    }
  }

  for (const b of beams) {
    const L = b.length * (hasFloorScopedMembers ? 1 : nFloors);
    beamLengthM += L;
    concreteBeams += b.width * b.depth * L;
    formwork += (2 * b.depth + b.width) * L;
    steel += L * RATES.beamSteelKgPerM;
    if (b.bottomBars) {
      steel += barSteelKg(b.bottomBars.diameterMm, b.bottomBars.count, L);
    }
    if (b.topBars) {
      steel += barSteelKg(b.topBars.diameterMm, b.topBars.count, L);
    }
    if (b.extraBars) {
      steel += barSteelKg(b.extraBars.diameterMm, b.extraBars.count, L);
    }
    if (b.stirrups) {
      const peri = 2 * (b.width + b.depth);
      const n = Math.ceil(L / (b.stirrups.spacingMm / 1000));
      const len = peri * n;
      stirrupLengthM += len;
      steel += barSteelKg(b.stirrups.diameterMm, 1, len);
    }
  }

  let slabAreaM2 = 0;
  for (const s of slabs) {
    const area = s.area * (hasFloorScopedMembers ? 1 : nFloors);
    slabAreaM2 += area;
    concreteSlabs += s.thickness * area;
    formwork += area;
    steel += area * RATES.slabSteelKgPerM2;
  }

  let wallCount = 0;
  let doorCount = 0;
  let windowCount = 0;
  let stairCount = 0;

  for (const plate of floorPlates) {
    for (const w of plate.walls) {
      wallCount += 1;
      const len = wallLength(w);
      const vol = len * w.thickness * w.height;
      formwork += 2 * len * w.height;
      if (w.material === "brick" || w.material === "aac" || w.material === "block") {
        brick += vol;
      } else {
        concreteWalls += vol;
      }
    }
    doorCount += plate.openings.filter((o) => o.type === "door").length;
    windowCount += plate.openings.filter((o) => o.type === "window").length;
    stairCount += plate.stairs.length;
    for (const st of plate.stairs) {
      concreteSlabs += st.width * st.depth * 0.2;
    }
  }

  let excavationVolumeM3 = 0;
  const footing = building?.foundation;
  if (footing) {
    const type = footing.type ?? "isolated";
    if (type === "raft") {
      const matW = (building?.width ?? 20) + 1.2;
      const matL = (building?.length ?? 15) + 1.2;
      concreteFootings = matW * matL * footing.thickness;
      formwork += 2 * (matW + matL) * footing.thickness;
      excavationVolumeM3 =
        (matW + 0.6) * (matL + 0.6) * (footing.thickness + 0.4);
    } else if (type === "strip") {
      const stripW = Math.min(footing.width, footing.length);
      const perimeter =
        2 * ((building?.width ?? 20) + (building?.length ?? 15));
      concreteFootings = perimeter * stripW * footing.thickness;
      formwork += perimeter * 2 * footing.thickness;
      excavationVolumeM3 =
        perimeter * (stripW + 0.5) * (footing.thickness + 0.35);
    } else {
      // isolated / combined / pile — one pad per column
      const n = Math.max(pillars.length, 1);
      const scale = type === "combined" ? 1.15 : 1;
      concreteFootings =
        footing.width *
        scale *
        footing.length *
        scale *
        footing.thickness *
        n;
      formwork +=
        2 *
        (footing.width * scale + footing.length * scale) *
        footing.thickness *
        n;
      if (type === "pile") {
        // 4 piles × ~2.4m × πr² per column
        concreteFootings += n * 4 * Math.PI * 0.15 * 0.15 * 2.4;
      }
      excavationVolumeM3 =
        (footing.width * scale + 0.6) *
        (footing.length * scale + 0.6) *
        (footing.thickness + 0.3) *
        n;
    }
    const mesh = footing.bottomMesh ?? footing.mainBars;
    if (mesh) {
      const n =
        type === "raft" || type === "strip" ? 1 : Math.max(pillars.length, 1);
      steel +=
        barSteelKg(mesh.diameterMm, Math.max(mesh.count, 8), footing.width) * n;
    }
  }

  const concrete =
    concreteColumns +
    concreteBeams +
    concreteSlabs +
    concreteWalls +
    concreteFootings;
  const brickCount = Math.round(brick / RATES.brickUnitVolumeM3);

  const concreteCost = concrete * RATES.concretePerM3;
  const steelCost = steel * RATES.steelPerKg;
  const brickCost = brick * RATES.brickPerM3;
  const labourCost = concrete * RATES.labourPerM3;
  const excavationCost = excavationVolumeM3 * RATES.excavationPerM3;
  const formworkCost = formwork * RATES.formworkPerM2;
  const foundationCost =
    concreteFootings * RATES.concretePerM3 + excavationCost * 0.5;
  const columnsCost = concreteColumns * RATES.concretePerM3;
  const beamsCost = concreteBeams * RATES.concretePerM3;
  const slabsCost = concreteSlabs * RATES.concretePerM3;
  const wallsCost = brickCost + concreteWalls * RATES.concretePerM3;
  const roof = building?.roof;
  const roofType = roof?.type ?? building?.roofType ?? "flat";
  const roofArea =
    ((building?.width ?? 0) + (roof?.overhangM ?? 0) * 2) *
    ((building?.length ?? 0) + (roof?.overhangM ?? 0) * 2);
  const roofPitchFactor =
    roofType === "slope" || roofType === "gable" ? 1.25 : 1;
  const roofMaterialRate =
    roof?.material === "metal" ? 18 : roof?.material === "tile" ? 22 : 12;
  const roofCost = roofArea
    ? roofArea * roofMaterialRate * roofPitchFactor
    : 0;

  const totalCost =
    concreteCost +
    steelCost +
    brickCost +
    labourCost +
    excavationCost +
    formworkCost +
    roofCost;

  const boq: BoqLine[] = [
    line("boq-conc-col", "Concrete", "Columns", "m³", concreteColumns, RATES.concretePerM3),
    line("boq-conc-bm", "Concrete", "Beams", "m³", concreteBeams, RATES.concretePerM3),
    line("boq-conc-sl", "Concrete", "Slabs", "m³", concreteSlabs, RATES.concretePerM3),
    line("boq-conc-ft", "Concrete", "Foundations", "m³", concreteFootings, RATES.concretePerM3),
    line("boq-steel", "Steel", "Reinforcement (all)", "kg", steel, RATES.steelPerKg),
    line("boq-stir", "Steel", "Stirrup length", "m", stirrupLengthM, 0.4),
    line("boq-tie", "Steel", "Column tie length", "m", tieLengthM, 0.4),
    line("boq-form", "Formwork", "Shuttering area", "m²", formwork, RATES.formworkPerM2),
    line("boq-exc", "Earthwork", "Excavation", "m³", excavationVolumeM3, RATES.excavationPerM3),
    line("boq-brick", "Masonry", "Brick / AAC volume", "m³", brick, RATES.brickPerM3),
    line("boq-brick-n", "Masonry", "Approx. brick count", "nos", brickCount, 0.15),
    line("boq-lab", "Labour", "Concrete labour", "m³", concrete, RATES.labourPerM3),
    line("boq-beam-l", "Geometry", "Total beam length", "m", beamLengthM, 0),
    line("boq-col-h", "Geometry", "Total column height", "m", columnHeightM, 0),
    line("boq-slab-a", "Geometry", "Total slab area", "m²", slabAreaM2, 0),
  ];

  return {
    concreteVolumeM3: round(concrete, 2),
    steelWeightKg: round(steel, 2),
    brickVolumeM3: round(brick, 2),
    concreteCost: round(concreteCost, 2),
    steelCost: round(steelCost, 2),
    brickCost: round(brickCost, 2),
    labourCost: round(labourCost, 2),
    excavationCost: round(excavationCost, 2),
    formworkCost: round(formworkCost, 2),
    foundationCost: round(foundationCost, 2),
    columnsCost: round(columnsCost, 2),
    beamsCost: round(beamsCost, 2),
    slabsCost: round(slabsCost, 2),
    wallsCost: round(wallsCost, 2),
    roofCost: round(roofCost, 2),
    totalCost: round(totalCost, 2),
    pillarCount: hasFloorScopedMembers ? pillars.length : pillars.length * nFloors,
    beamCount: hasFloorScopedMembers ? beams.length : beams.length * nFloors,
    slabCount: hasFloorScopedMembers ? slabs.length : slabs.length * nFloors,
    wallCount,
    doorCount,
    windowCount,
    stairCount,
    formworkM2: round(formwork, 2),
    footingVolumeM3: round(concreteFootings, 2),
    excavationVolumeM3: round(excavationVolumeM3, 2),
    stirrupLengthM: round(stirrupLengthM, 1),
    tieLengthM: round(tieLengthM, 1),
    beamLengthM: round(beamLengthM, 2),
    columnHeightM: round(columnHeightM, 2),
    slabAreaM2: round(slabAreaM2, 2),
    brickCount,
    boq,
  };
}

export function estimateMultiFloorMaterials(
  floors: Floor[],
  building: BuildingConfig
): MaterialEstimate {
  const flattened = floors.flatMap((floor) => ({
    floor,
    plate: {
      floor: floor.floorNumber,
      floorId: floor.id,
      walls: floor.walls,
      openings: floor.openings,
      stairs: floor.stairs,
    },
  }));
  const estimate = estimateMaterials(
    floors.flatMap((item) => item.pillars),
    floors.flatMap((item) => item.beams),
    floors.flatMap((item) => item.slabs),
    flattened.map((item) => item.plate),
    1,
    building
  );
  const floorEstimates: FloorCostEstimate[] = floors.map((floor) => {
    const floorOnlyBuilding: BuildingConfig = {
      ...building,
      foundation: undefined,
      roof: undefined,
      roofType: "flat",
    };
    const perFloor = estimateMaterials(
      floor.pillars,
      floor.beams,
      floor.slabs,
      [flattened.find((item) => item.floor.id === floor.id)!.plate],
      1,
      floorOnlyBuilding
    );
    return {
      floorId: floor.id,
      floorNumber: floor.floorNumber,
      name: floor.name,
      concreteVolumeM3: perFloor.concreteVolumeM3,
      reinforcementKg: perFloor.steelWeightKg,
      formworkM2: perFloor.formworkM2,
      pillarCost: perFloor.columnsCost,
      beamCost: perFloor.beamsCost,
      slabCost: perFloor.slabsCost,
      totalCost: perFloor.totalCost,
    };
  });
  return { ...estimate, floorEstimates };
}

export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
