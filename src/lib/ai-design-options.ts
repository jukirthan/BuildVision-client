/**
 * Multi-option AI structural recommendations (IS 456–inspired teaching engine).
 * Generates several safe alternatives with cost, steel, safety %, and difficulty.
 */

import type {
  Beam,
  BuildingConfig,
  DesignOption,
  Pillar,
  Slab,
} from "@/types/structure";
import { barAreaMm2, FCK, FY } from "@/lib/engineering/codes";
import {
  defaultColumnBars,
  defaultStirrups,
  recommendBeamDepthM,
  recommendColumnSizeM,
  recommendFootingSizeM,
} from "@/lib/engineering/member-checks";
import { estimateColumnAxialKN } from "@/lib/engineering/loads";
import { RATES } from "@/lib/cost-estimator";

function round(n: number, d = 2) {
  const f = 10 ** d;
  return Math.round(n * f) / f;
}

function columnCapacityKN(
  width: number,
  depth: number,
  dia: number,
  count: number,
  fck: number,
  fy: number
) {
  const Ac = width * depth * 1e6;
  const Asc = count * barAreaMm2(dia as 8 | 10 | 12 | 16 | 20 | 25 | 32 | 40);
  return (0.4 * fck * Ac + 0.67 * fy * Asc) / 1000;
}

function steelKgBars(dia: number, count: number, lengthM: number) {
  // π/4 d² × L × 7850 kg/m³
  const areaM2 = (Math.PI / 4) * (dia / 1000) ** 2;
  return areaM2 * lengthM * count * 7850;
}

export function generateColumnDesignOptions(
  pillar: Pillar,
  pillars: Pillar[],
  building: BuildingConfig,
  slab?: Slab
): DesignOption[] {
  const fck = FCK[pillar.concreteGrade ?? building.design?.concreteGrade ?? "M25"];
  const fy = FY[pillar.steelGrade ?? building.design?.steelGrade ?? "Fe500"];
  const axial = estimateColumnAxialKN(pillar, pillars, building, slab);
  const H = pillar.height * building.floors;
  const baseSide = recommendColumnSizeM(axial, fck);

  const variants: {
    label: string;
    w: number;
    d: number;
    count: number;
    dia: number;
    stirDia: number;
    stirSp: number;
  }[] = [
    {
      label: "Option A",
      w: Math.max(pillar.width, baseSide * 0.95),
      d: Math.max(pillar.depth, baseSide * 0.95),
      count: 8,
      dia: 16,
      stirDia: 8,
      stirSp: 100,
    },
    {
      label: "Option B",
      w: Math.ceil((baseSide + 0.05) * 20) / 20,
      d: Math.max(0.3, Math.ceil(baseSide * 20) / 20),
      count: 6,
      dia: 20,
      stirDia: 8,
      stirSp: 125,
    },
    {
      label: "Option C",
      w: Math.ceil((baseSide + 0.1) * 20) / 20,
      d: Math.max(0.3, Math.ceil(baseSide * 20) / 20),
      count: 8,
      dia: 12,
      stirDia: 10,
      stirSp: 150,
    },
  ];

  // Keep current as first if already sized
  if (pillar.width >= 0.25) {
    variants[0] = {
      label: "Option A",
      w: pillar.width,
      d: pillar.depth,
      count: pillar.longitudinalBars?.count ?? 8,
      dia: pillar.longitudinalBars?.diameterMm ?? 16,
      stirDia: pillar.stirrups?.diameterMm ?? 8,
      stirSp: pillar.stirrups?.spacingMm ?? 100,
    };
  }

  const options: DesignOption[] = variants.map((v, i) => {
    const Pu = columnCapacityKN(v.w, v.d, v.dia, v.count, fck, fy);
    const util = Pu > 0 ? axial / Pu : 2;
    const safety = Math.max(0, Math.min(99, Math.round((1 / Math.max(util, 0.5)) * 55 + 40)));
    const concreteM3 = v.w * v.d * H;
    const steelKg =
      steelKgBars(v.dia, v.count, H) +
      steelKgBars(v.stirDia, Math.ceil(H / (v.stirSp / 1000)), (v.w + v.d) * 2);
    const estimatedCost =
      concreteM3 * RATES.concretePerM3 + steelKg * RATES.steelPerKg;
    const status = util <= 0.85 ? "safe" : util <= 1 ? "warning" : "fail";
    const difficulty =
      v.count >= 10 || v.stirSp <= 75
        ? "hard"
        : v.dia >= 25
          ? "moderate"
          : "easy";

    return {
      id: `${pillar.id}-opt-${i}`,
      label: v.label,
      kind: "column",
      memberId: pillar.id,
      summary: `${Math.round(v.w * 1000)}×${Math.round(v.d * 1000)} · ${v.count}×${v.dia} mm`,
      section: `${Math.round(v.w * 1000)}×${Math.round(v.d * 1000)} mm`,
      rebar: `${v.count} × ${v.dia} mm`,
      stirrups: `${v.stirDia} mm @${v.stirSp}`,
      safetyRating: safety,
      status,
      estimatedCost: round(estimatedCost),
      steelKg: round(steelKg),
      concreteM3: round(concreteM3, 3),
      difficulty,
      recommended: false,
      applyPatch: {
        width: v.w,
        depth: v.d,
        shape: v.w === v.d ? "square" : "rectangle",
        longitudinalBars: { diameterMm: v.dia, count: v.count },
        stirrups: {
          diameterMm: v.stirDia,
          spacingMm: v.stirSp,
          legs: 2,
          shape: "square",
          hook: "135",
        },
        rebarZones: {
          bottom: { diameterMm: v.stirDia, spacingMm: Math.min(v.stirSp, 100) },
          middle: { diameterMm: v.stirDia, spacingMm: Math.max(v.stirSp, 150) },
          top: { diameterMm: v.stirDia, spacingMm: Math.min(v.stirSp, 100) },
        },
      },
      rationale: `Pu ≈ ${Pu.toFixed(0)} kN vs N ≈ ${axial.toFixed(0)} kN (${(util * 100).toFixed(0)}% util).`,
    };
  });

  // Pick recommended = safest among status=safe, else highest safety
  const safe = options.filter((o) => o.status === "safe");
  const pick = (safe.length ? safe : options).sort(
    (a, b) => b.safetyRating - a.safetyRating || a.estimatedCost - b.estimatedCost
  )[0];
  if (pick) pick.recommended = true;

  return options;
}

export function generateBeamDesignOptions(
  beam: Beam,
  building: BuildingConfig
): DesignOption[] {
  const depthA = beam.depth;
  const depthB = recommendBeamDepthM(beam.length);
  const depthC = Math.ceil((depthB + 0.05) * 20) / 20;
  const widths = [beam.width, Math.max(0.23, beam.width), Math.max(0.3, beam.width)];

  const variants = [
    { label: "Option A", w: widths[0], d: depthA, bot: 3, dia: 16, sp: 150 },
    { label: "Option B", w: widths[1], d: depthB, bot: 3, dia: 20, sp: 125 },
    { label: "Option C", w: widths[2], d: depthC, bot: 4, dia: 16, sp: 100 },
  ];

  return variants.map((v, i) => {
    const concreteM3 = v.w * v.d * beam.length * building.floors;
    const steelKg =
      steelKgBars(v.dia, v.bot, beam.length * building.floors) +
      steelKgBars(12, 2, beam.length * building.floors);
    const cost = concreteM3 * RATES.concretePerM3 + steelKg * RATES.steelPerKg;
    const L_d = beam.length / Math.max(v.d - 0.05, 0.2);
    const util = L_d / 20;
    const safety = Math.max(70, Math.min(99, Math.round(100 - util * 15)));
    return {
      id: `${beam.id}-opt-${i}`,
      label: v.label,
      kind: "beam" as const,
      memberId: beam.id,
      summary: `${Math.round(v.w * 1000)}×${Math.round(v.d * 1000)} · ${v.bot}×${v.dia}`,
      section: `${Math.round(v.w * 1000)}×${Math.round(v.d * 1000)} mm`,
      rebar: `Bottom ${v.bot} × ${v.dia} mm`,
      stirrups: `8 mm @${v.sp}`,
      safetyRating: safety,
      status: (util <= 0.85 ? "safe" : util <= 1 ? "warning" : "fail") as DesignOption["status"],
      estimatedCost: round(cost),
      steelKg: round(steelKg),
      concreteM3: round(concreteM3, 3),
      difficulty: (v.sp <= 100 ? "moderate" : "easy") as DesignOption["difficulty"],
      recommended: i === 1,
      applyPatch: {
        width: v.w,
        depth: v.d,
        bottomBars: { diameterMm: v.dia, count: v.bot },
        topBars: { diameterMm: 12, count: 2 },
        stirrups: { diameterMm: 8, spacingMm: v.sp, legs: 2, shape: "rectangular", hook: "135" },
        anchorageMm: Math.round(v.dia * 50),
      },
      rationale: `Teaching L/d ≈ ${L_d.toFixed(1)} (target ≤ 20 continuous).`,
    };
  });
}

export function generateMemberDesignOptions(input: {
  pillar?: Pillar | null;
  beam?: Beam | null;
  slab?: Slab | null;
  pillars: Pillar[];
  building: BuildingConfig;
}): DesignOption[] {
  if (input.pillar) {
    return generateColumnDesignOptions(
      input.pillar,
      input.pillars,
      input.building,
      input.slab ?? undefined
    );
  }
  if (input.beam) {
    return generateBeamDesignOptions(input.beam, input.building);
  }
  if (input.slab) {
    const short = Math.min(input.slab.width, input.slab.length);
    const tA = input.slab.thickness;
    const tB = Math.ceil((short / 32) * 20) / 20;
    const tC = Math.ceil((short / 28) * 20) / 20;
    return [tA, tB, tC].map((t, i) => {
      const concreteM3 = t * input.slab!.area * input.building.floors;
      const steelKg = input.slab!.area * 2.2 * input.building.floors;
      const cost = concreteM3 * RATES.concretePerM3 + steelKg * RATES.steelPerKg;
      const ratio = short / t;
      const util = ratio / 32;
      return {
        id: `${input.slab!.id}-opt-${i}`,
        label: `Option ${String.fromCharCode(65 + i)}`,
        kind: "slab" as const,
        memberId: input.slab!.id,
        summary: `${Math.round(t * 1000)} mm · mesh 8@150`,
        section: `${Math.round(t * 1000)} mm`,
        rebar: `8 mm @150 bottom`,
        stirrups: "—",
        safetyRating: Math.max(70, Math.min(99, Math.round(100 - util * 20))),
        status: (util <= 0.85 ? "safe" : util <= 1 ? "warning" : "fail") as DesignOption["status"],
        estimatedCost: round(cost),
        steelKg: round(steelKg),
        concreteM3: round(concreteM3, 3),
        difficulty: "easy" as const,
        recommended: i === 1,
        applyPatch: {
          thickness: t,
          bottomMesh: { diameterMm: 8, count: 0, spacingMm: 150 },
          topMesh: { diameterMm: 8, count: 0, spacingMm: 200 },
          system: input.slab!.system ?? "two_way",
        },
        rationale: `Lx/D = ${ratio.toFixed(1)} (teaching limit ~32).`,
      };
    });
  }
  // Footing options from max column
  const maxAxial = Math.max(
    0,
    ...input.pillars.map((p) => p.loads?.axialKN ?? 0)
  );
  const bearing = input.building.site?.bearingCapacityKNm2 ?? 200;
  const side = recommendFootingSizeM(maxAxial || 400, bearing);
  const cur = input.building.foundation;
  return [0, 0.1, 0.2].map((extra, i) => {
    const s = round(side + extra, 2);
    const t = cur?.thickness ?? 0.45;
    const concreteM3 = s * s * t * input.pillars.length;
    const steelKg = s * s * 8 * input.pillars.length;
    const cost = concreteM3 * RATES.concretePerM3 + steelKg * RATES.steelPerKg;
    return {
      id: `footing-opt-${i}`,
      label: `Option ${String.fromCharCode(65 + i)}`,
      kind: "footing" as const,
      memberId: "foundation",
      summary: `${s}×${s}×${t} m pad`,
      section: `${s}×${s} m`,
      rebar: `12 mm mesh`,
      stirrups: "—",
      safetyRating: 90 + i * 3,
      status: "safe" as const,
      estimatedCost: round(cost),
      steelKg: round(steelKg),
      concreteM3: round(concreteM3, 3),
      difficulty: "moderate" as const,
      recommended: i === 1,
      applyPatch: { width: s, length: s, thickness: t, type: "isolated" },
      rationale: `Pressure ≈ ${((maxAxial || 400) / (s * s)).toFixed(0)} kN/m² vs SBC ${bearing}.`,
    };
  });
}

/** Defaults used when enriching members. */
export function defaultColumnZones(): Pillar["rebarZones"] {
  return {
    bottom: { diameterMm: 8, spacingMm: 100 },
    middle: { diameterMm: 8, spacingMm: 150 },
    top: { diameterMm: 8, spacingMm: 100 },
  };
}

export { defaultColumnBars, defaultStirrups };
