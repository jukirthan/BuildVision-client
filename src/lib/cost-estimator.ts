import type {
  Beam,
  BoqLine,
  BuildingConfig,
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
  const nFloors = Math.max(floors, 1);
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
    const H = p.height * nFloors;
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
    const L = b.length * nFloors;
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
    const area = s.area * nFloors;
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

  const footing = building?.foundation;
  if (footing) {
    concreteFootings =
      footing.width * footing.length * footing.thickness * pillars.length;
    formwork +=
      2 * (footing.width + footing.length) * footing.thickness * pillars.length;
    const mesh = footing.bottomMesh ?? footing.mainBars;
    if (mesh) {
      steel +=
        barSteelKg(mesh.diameterMm, Math.max(mesh.count, 8), footing.width) *
        pillars.length;
    }
  }

  const excavationVolumeM3 =
    footing != null
      ? (footing.width + 0.6) *
        (footing.length + 0.6) *
        (footing.thickness + 0.3) *
        pillars.length
      : 0;

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
  const roofCost = slabs.length
    ? slabs[0].area * 12 * (building?.roofType === "slope" ? 1.3 : 1)
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
    pillarCount: pillars.length * nFloors,
    beamCount: beams.length * nFloors,
    slabCount: slabs.length * nFloors,
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

export function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
