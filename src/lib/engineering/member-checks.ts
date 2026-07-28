import type {
  Beam,
  BuildingConfig,
  MemberCheck,
  Pillar,
  RebarLayer,
  Slab,
  StirrupSpec,
} from "@/types/structure";
import { FCK, FY, barAreaMm2 } from "@/lib/engineering/codes";
import {
  estimateBeamUniformLoadKNm,
  estimateColumnAxialKN,
} from "@/lib/engineering/loads";

function statusFromUtil(u: number): MemberCheck["status"] {
  if (u <= 0.85) return "safe";
  if (u <= 1.0) return "warning";
  return "fail";
}

export function defaultColumnBars(widthM: number, depthM: number): RebarLayer {
  const minSide = Math.min(widthM, depthM);
  if (minSide >= 0.45) return { diameterMm: 20, count: 8 };
  if (minSide >= 0.35) return { diameterMm: 16, count: 8 };
  return { diameterMm: 16, count: 6 };
}

export function defaultStirrups(): StirrupSpec {
  return { diameterMm: 8, spacingMm: 150, legs: 2 };
}

export function defaultBeamBars(depthM: number): {
  top: RebarLayer;
  bottom: RebarLayer;
  stirrups: StirrupSpec;
} {
  const botDia = depthM >= 0.5 ? 20 : 16;
  const botCount = depthM >= 0.55 ? 4 : 3;
  return {
    top: { diameterMm: 12, count: 2 },
    bottom: { diameterMm: botDia as 16 | 20, count: botCount },
    stirrups: { diameterMm: 8, spacingMm: depthM >= 0.5 ? 150 : 125, legs: 2 },
  };
}

/**
 * IS 456–inspired short column capacity (uniaxial, simplified):
 * Pu_lim ≈ 0.4 fck Ac + 0.67 fy Asc  (approx working → ultimate hybrid teaching model)
 */
export function checkColumn(
  pillar: Pillar,
  pillars: Pillar[],
  building: BuildingConfig,
  slab?: Slab
): MemberCheck {
  const fck = FCK[pillar.concreteGrade ?? building.design?.concreteGrade ?? "M25"];
  const fy = FY[pillar.steelGrade ?? building.design?.steelGrade ?? "Fe500"];
  const Ac = pillar.width * pillar.depth * 1e6; // mm²
  const bars = pillar.longitudinalBars ?? defaultColumnBars(pillar.width, pillar.depth);
  const Asc = bars.count * barAreaMm2(bars.diameterMm);
  // Ultimate axial capacity (kN) — simplified Pu = 0.4 fck Ac + 0.67 fy Asc
  const Pu = (0.4 * fck * Ac + 0.67 * fy * Asc) / 1000;
  const axial = estimateColumnAxialKN(pillar, pillars, building, slab);
  const util = Pu > 0 ? axial / Pu : 99;
  const warnings: string[] = [];
  const minAs = 0.008 * Ac;
  const maxAs = 0.04 * Ac;
  if (Asc < minAs) warnings.push("Longitudinal steel below ~0.8% of gross section (IS456 min).");
  if (Asc > maxAs) warnings.push("Longitudinal steel exceeds ~4% of gross section.");
  if (Math.min(pillar.width, pillar.depth) < 0.2)
    warnings.push("Section below practical 200 mm minimum for RC columns.");

  return {
    status: statusFromUtil(util),
    utilization: Math.round(util * 1000) / 1000,
    capacityNote: `Pu ≈ ${Pu.toFixed(0)} kN · N ≈ ${axial.toFixed(0)} kN (${(util * 100).toFixed(0)}% util)`,
    warnings,
  };
}

/**
 * Beam flexure: Mu ≈ wu L² / 8 (simply supported teaching case).
 * Required d from Mu_lim ≈ 0.138 fck b d² (Fe500 limiting).
 * We recommend — we do not silently overwrite member size.
 */
export function checkBeam(
  beam: Beam,
  building: BuildingConfig,
  slab?: Slab
): MemberCheck {
  const fck = FCK[beam.concreteGrade ?? building.design?.concreteGrade ?? "M25"];
  const fy = FY[beam.steelGrade ?? building.design?.steelGrade ?? "Fe500"];
  const wu = estimateBeamUniformLoadKNm(beam, building, slab);
  const L = beam.length;
  const Mu = (wu * L * L) / 8; // kNm
  const b = beam.width * 1000; // mm
  const D = beam.depth * 1000;
  const cover = beam.stirrups ? 25 + beam.stirrups.diameterMm : 33;
  const d = Math.max(D - cover - 10, 50); // mm effective
  const Ru = fy <= 415 ? 0.138 : 0.133; // limiting Mu / (fck b d²) approx
  const MuLim = (Ru * fck * b * d * d) / 1e6; // kNm
  const util = MuLim > 0 ? Mu / MuLim : 99;

  const bars = beam.bottomBars ?? defaultBeamBars(beam.depth).bottom;
  const Ast = bars.count * barAreaMm2(bars.diameterMm);
  const pt = (100 * Ast) / (b * d);
  const warnings: string[] = [];
  if (pt < 0.2) warnings.push("Bottom steel ratio looks low for flexure — check Ast.");
  if (pt > 2.5) warnings.push("Bottom steel ratio is high — consider larger depth.");
  if (L / (d / 1000) > 20)
    warnings.push("Span/effective depth is slender — check deflection serviceability.");

  return {
    status: statusFromUtil(util),
    utilization: Math.round(util * 1000) / 1000,
    capacityNote: `Mu ≈ ${Mu.toFixed(1)} kNm · Mu,lim ≈ ${MuLim.toFixed(1)} kNm · wu ≈ ${wu} kN/m`,
    warnings,
  };
}

export function checkSlab(slab: Slab, building: BuildingConfig): MemberCheck {
  const fck = FCK[building.design?.concreteGrade ?? "M25"];
  const short = Math.min(slab.width, slab.length);
  const Lx = short;
  const t = slab.thickness;
  // Span/depth check teaching: simply supported two-way ~28, continuous ~32
  const limit = 32;
  const ratio = Lx / t;
  const util = ratio / limit;
  const warnings: string[] = [];
  if (t < 0.1) warnings.push("Thickness below 100 mm — usually inadequate for RC floor slabs.");
  if (ratio > limit) warnings.push(`Lx/D = ${ratio.toFixed(1)} exceeds ~${limit} (serviceability teaching limit).`);

  return {
    status: statusFromUtil(util),
    utilization: Math.round(util * 1000) / 1000,
    capacityNote: `Lx/D = ${ratio.toFixed(1)} (limit ~${limit}) · fck=${fck} MPa`,
    warnings,
  };
}

/** Recommended beam depth from span (L/12 to L/16 teaching band for continuous). */
export function recommendBeamDepthM(spanM: number) {
  const d = spanM / 14;
  return Math.ceil(d * 20) / 20; // 50 mm steps
}

export function recommendColumnSizeM(axialKN: number, fck = 25) {
  // Rough: capacity ~ 0.4 fck Ac → Ac ≈ N / (0.4 fck) with mm units
  const AcMm2 = (axialKN * 1000) / (0.35 * fck);
  const sideMm = Math.sqrt(AcMm2);
  const sideM = Math.ceil(sideMm / 50) * 0.05; // 50 mm steps
  return Math.max(0.3, Math.min(sideM, 0.9));
}

export function recommendFootingSizeM(
  axialKN: number,
  bearingKNm2: number
) {
  const area = (axialKN * 1.1) / Math.max(bearingKNm2, 50); // service-ish
  const side = Math.sqrt(area);
  return Math.ceil(side * 20) / 20;
}
