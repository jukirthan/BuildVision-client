import type {
  AdvisorMessage,
  Beam,
  BuildingConfig,
  EngineeringRecommendation,
  Floor,
  Pillar,
  Slab,
} from "@/types/structure";
import { uid } from "@/lib/structural-engine";
import {
  checkBeam,
  checkColumn,
  checkSlab,
  defaultBeamBars,
  defaultColumnBars,
  defaultStirrups,
  recommendBeamDepthM,
  recommendColumnSizeM,
  recommendFootingSizeM,
} from "@/lib/engineering/member-checks";
import { defaultSite } from "@/lib/engineering/loads";
import { defaultColumnZones } from "@/lib/ai-design-options";

export type EngineResult = {
  pillars: Pillar[];
  beams: Beam[];
  slabs: Slab[];
  building: BuildingConfig;
  advisor: AdvisorMessage[];
  recommendations: EngineeringRecommendation[];
};

function ensureDesign(building: BuildingConfig): BuildingConfig {
  const site = defaultSite(building);
  const design = building.design ?? {
    concreteGrade: "M25" as const,
    steelGrade: "Fe500" as const,
    clearCoverMm: 40,
    designCode: "IS456" as const,
  };
  const foundation = building.foundation ?? {
    type: "isolated" as const,
    thickness: 0.45,
    width: 1.5,
    length: 1.5,
    pedestalHeight: 0.3,
    concreteGrade: design.concreteGrade,
    steelGrade: design.steelGrade,
    mainBars: { diameterMm: 12, count: 8 },
    distributionBars: { diameterMm: 10, count: 8 },
    bottomMesh: { diameterMm: 12, count: 8, spacingMm: 150 },
    topMesh: { diameterMm: 10, count: 6, spacingMm: 200 },
    foundationLevel: -1.5,
  };
  return { ...building, site, design, foundation };
}

function nearestPillarId(
  x: number,
  y: number,
  pillars: Pillar[],
  tol = 0.45
): string | undefined {
  let best: Pillar | undefined;
  let bestD = tol;
  for (const p of pillars) {
    const d = Math.hypot(p.x - x, p.y - y);
    if (d < bestD) {
      bestD = d;
      best = p;
    }
  }
  return best?.id;
}

/**
 * Live dependency engine:
 * 1) Wire column ↔ beam ↔ slab relationships
 * 2) When columns grow, nudge connected beam endpoints & widen beam seats
 * 3) Auto-grow footing from max column reaction
 * 4) Recalculate loads / checks / reinforcement defaults
 * 5) Emit advisor + recommendations (apply on user click for section changes)
 */
export function runDependencyEngine(input: {
  building: BuildingConfig;
  pillars: Pillar[];
  beams: Beam[];
  slabs: Slab[];
  /** When true, auto-adjust footing size to demand (floor add / column resize). */
  autoUpdateFooting?: boolean;
  /** When true, slightly deepen undersized beams connected to resized columns. */
  autoAdjustBeams?: boolean;
}): EngineResult {
  const building = ensureDesign(input.building);
  const slab = input.slabs[0];
  const advisor: AdvisorMessage[] = [];
  const recommendations: EngineeringRecommendation[] = [];
  const now = Date.now();
  const autoFooting = input.autoUpdateFooting ?? true;
  const autoBeams = input.autoAdjustBeams ?? true;

  // --- Graph: beam ↔ pillar ---
  let beams: Beam[] = input.beams.map((b) => {
    const startPillarId =
      b.startPillarId || nearestPillarId(b.startX, b.startY, input.pillars) || "";
    const endPillarId =
      b.endPillarId || nearestPillarId(b.endX, b.endY, input.pillars) || "";
    return { ...b, startPillarId, endPillarId, supportedSlabIds: slab ? [slab.id] : [] };
  });

  // Snap beam ends to column centers & seat width ≥ column face
  if (autoBeams) {
    beams = beams.map((b) => {
      const start = input.pillars.find((p) => p.id === b.startPillarId);
      const end = input.pillars.find((p) => p.id === b.endPillarId);
      const next = { ...b };
      if (start) {
        next.startX = start.x;
        next.startY = start.y;
      }
      if (end) {
        next.endX = end.x;
        next.endY = end.y;
      }
      next.length = Math.hypot(next.endX - next.startX, next.endY - next.startY);
      const colFace = Math.max(
        start ? Math.min(start.width, start.depth) : 0.3,
        end ? Math.min(end.width, end.depth) : 0.3
      );
      // Beam width should not be thinner than supporting column face (seat)
      if (next.width + 0.02 < colFace * 0.85) {
        next.width = Math.round(colFace * 0.85 * 20) / 20;
      }
      const want = recommendBeamDepthM(next.length);
      if (next.depth < want * 0.9) {
        next.depth = Math.round(want * 20) / 20;
      }
      return next;
    });
  }

  const beamIdsByPillar = new Map<string, string[]>();
  for (const b of beams) {
    for (const pid of [b.startPillarId, b.endPillarId]) {
      if (!pid) continue;
      const list = beamIdsByPillar.get(pid) ?? [];
      list.push(b.id);
      beamIdsByPillar.set(pid, list);
    }
  }

  const pillars = input.pillars.map((p) => {
    const shape =
      p.shape ?? (Math.abs(p.width - p.depth) < 0.01 ? "square" : "rectangle");
    const enriched: Pillar = {
      ...p,
      shape,
      rotationDeg: p.rotationDeg ?? 0,
      concreteGrade: p.concreteGrade ?? building.design!.concreteGrade,
      steelGrade: p.steelGrade ?? building.design!.steelGrade,
      clearCoverMm: p.clearCoverMm ?? building.design!.clearCoverMm,
      longitudinalBars:
        p.longitudinalBars ?? defaultColumnBars(p.width, p.depth),
      stirrups: {
        ...defaultStirrups(),
        ...p.stirrups,
        shape: p.stirrups?.shape ?? (shape === "circular" ? "circular" : "square"),
        hook: p.stirrups?.hook ?? "135",
      },
      rebarZones: p.rebarZones ?? defaultColumnZones(),
      connectedBeamIds: beamIdsByPillar.get(p.id) ?? [],
      footingId: "foundation",
    };
    const check = checkColumn(enriched, input.pillars, building, slab);
    enriched.check = check;
    enriched.loads = {
      axialKN: parseFloat(check.capacityNote.match(/N ≈ ([\d.]+)/)?.[1] ?? "0"),
      momentXKnm: 0,
      momentYKnm: 0,
      shearKN: Math.max(10, (enriched.loads?.axialKN ?? 0) * 0.05),
      wallLoadKN: 0,
      windLoadKN: (building.site?.windZone === "D" ? 25 : 12) * building.floors,
      roofLoadKN: slab ? slab.area * 0.5 : 0,
    };

    // Congestion / misalignment warnings
    if (check.warnings.length === 0) {
      const AscPct =
        ((enriched.longitudinalBars!.count *
          (Math.PI / 4) *
          (enriched.longitudinalBars!.diameterMm / 1000) ** 2) /
          (p.width * p.depth)) *
        100;
      if (AscPct > 3.5) {
        check.warnings.push("Steel congestion risk — high longitudinal steel ratio.");
      }
    }

    if (check.status !== "safe") {
      const side = recommendColumnSizeM(enriched.loads.axialKN, 25);
      const recBars = defaultColumnBars(side, side);
      recommendations.push({
        kind: "column",
        memberId: p.id,
        reason: check.capacityNote,
        current: `${Math.round(p.width * 1000)}×${Math.round(p.depth * 1000)} mm`,
        recommended: `${Math.round(side * 1000)}×${Math.round(side * 1000)} mm · ${recBars.count}−${recBars.diameterMm}⌀`,
        applyPatch: { width: side, depth: side },
      });
      advisor.push({
        id: uid("adv"),
        severity: check.status === "fail" ? "critical" : "warning",
        title:
          check.status === "fail"
            ? `${p.name} unsafe — column too small`
            : `${p.name} capacity warning`,
        body: `${check.capacityNote}. Connected beams (${enriched.connectedBeamIds?.length ?? 0}) and footing will update when you apply a larger section.`,
        memberId: p.id,
        memberKind: "column",
        suggestedAction: `Try ${Math.round(side * 1000)} mm square, or ${recBars.count}×${recBars.diameterMm} mm bars.`,
        timestamp: now,
      });
    }
    for (const w of check.warnings) {
      advisor.push({
        id: uid("adv"),
        severity: "warning",
        title: `${p.name}: ${w.slice(0, 48)}`,
        body: w,
        memberId: p.id,
        memberKind: "column",
        timestamp: now,
      });
    }
    return enriched;
  });

  // Column misalignment check (grid tolerance)
  for (let i = 0; i < pillars.length; i++) {
    for (let j = i + 1; j < pillars.length; j++) {
      const a = pillars[i];
      const b = pillars[j];
      const dx = Math.abs(a.x - b.x);
      const dy = Math.abs(a.y - b.y);
      if ((dx > 0.05 && dx < 0.25) || (dy > 0.05 && dy < 0.25)) {
        advisor.push({
          id: uid("adv"),
          severity: "warning",
          title: "Column misalignment",
          body: `${a.name} and ${b.name} are nearly aligned but offset by ${Math.min(dx, dy).toFixed(2)} m — check grid snap.`,
          memberKind: "building",
          timestamp: now,
        });
      }
    }
  }

  beams = beams.map((b) => {
    const defaults = defaultBeamBars(b.depth);
    const enriched: Beam = {
      ...b,
      concreteGrade: b.concreteGrade ?? building.design!.concreteGrade,
      steelGrade: b.steelGrade ?? building.design!.steelGrade,
      topBars: b.topBars ?? defaults.top,
      bottomBars: b.bottomBars ?? defaults.bottom,
      extraBars: b.extraBars ?? { diameterMm: 12, count: 0 },
      supportBars: b.supportBars ?? { diameterMm: 12, count: 2 },
      spanBars: b.spanBars ?? defaults.bottom,
      stirrups: {
        ...defaults.stirrups,
        ...b.stirrups,
        shape: b.stirrups?.shape ?? "rectangular",
        hook: b.stirrups?.hook ?? "135",
      },
      anchorageMm: b.anchorageMm ?? 40 * (b.bottomBars?.diameterMm ?? 16),
      supportCondition: b.supportCondition ?? "continuous",
    };
    const check = checkBeam(enriched, building, slab);
    enriched.check = check;
    enriched.loads = {
      axialKN: 0,
      momentXKnm: parseFloat(check.capacityNote.match(/Mu ≈ ([\d.]+)/)?.[1] ?? "0"),
      momentYKnm: 0,
      shearKN: parseFloat(check.capacityNote.match(/wu ≈ ([\d.]+)/)?.[1] ?? "0") * 0.5 * b.length,
    };

    if (check.status !== "safe") {
      const depth = recommendBeamDepthM(b.length);
      const nextBars = defaultBeamBars(depth);
      recommendations.push({
        kind: "beam",
        memberId: b.id,
        reason: check.capacityNote,
        current: `${Math.round(b.width * 1000)}×${Math.round(b.depth * 1000)} mm · L=${b.length.toFixed(2)} m`,
        recommended: `Depth ≈ ${Math.round(depth * 1000)} mm · bottom ${nextBars.bottom.count}−${nextBars.bottom.diameterMm}⌀`,
        applyPatch: { depth },
      });
      advisor.push({
        id: uid("adv"),
        severity: check.status === "fail" ? "critical" : "warning",
        title:
          check.status === "fail"
            ? `${b.name} — beam depth insufficient`
            : `${b.name} flexure warning`,
        body: check.capacityNote,
        memberId: b.id,
        memberKind: "beam",
        suggestedAction: `Increase depth toward ${Math.round(depth * 1000)} mm.`,
        timestamp: now,
      });
    }
    for (const w of check.warnings) {
      advisor.push({
        id: uid("adv"),
        severity: "warning",
        title: `${b.name}: warning`,
        body: w,
        memberId: b.id,
        memberKind: "beam",
        timestamp: now,
      });
    }
    return enriched;
  });

  const slabs = input.slabs.map((s) => {
    const enriched: Slab = {
      ...s,
      system:
        s.system ??
        (s.width / s.length > 2 || s.length / s.width > 2 ? "one_way" : "two_way"),
      steelDirection: s.steelDirection ?? (s.system === "one_way" ? "x" : "both"),
      finishLoadKNm2: s.finishLoadKNm2 ?? 1.0,
      waterproofLayerMm: s.waterproofLayerMm ?? 0,
      deadLoadKNm2:
        s.deadLoadKNm2 ??
        s.thickness * 25 + (s.finishLoadKNm2 ?? 1) + (s.waterproofLayerMm ?? 0) * 0.02,
      liveLoadKNm2: s.liveLoadKNm2 ?? 2,
      topMesh: s.topMesh ?? { diameterMm: 8, count: 0, spacingMm: 200 },
      bottomMesh: s.bottomMesh ?? { diameterMm: 8, count: 0, spacingMm: 150 },
      supportingBeamIds: beams.map((b) => b.id),
      openings: s.openings ?? [],
    };
    enriched.check = checkSlab(enriched, building);
    if (enriched.check.status !== "safe") {
      const short = Math.min(s.width, s.length);
      const t = Math.ceil((short / 32) * 20) / 20;
      recommendations.push({
        kind: "slab",
        memberId: s.id,
        reason: enriched.check.capacityNote,
        current: `${Math.round(s.thickness * 1000)} mm`,
        recommended: `≈ ${Math.round(t * 1000)} mm`,
        applyPatch: { thickness: t },
      });
      advisor.push({
        id: uid("adv"),
        severity: "warning",
        title: `${s.name} — slab too thin`,
        body: enriched.check.capacityNote,
        memberId: s.id,
        memberKind: "slab",
        suggestedAction: `Consider thickness ≈ ${Math.round(t * 1000)} mm.`,
        timestamp: now,
      });
    }
    return enriched;
  });

  // Footing from max column load + auto update
  const maxAxial = Math.max(0, ...pillars.map((p) => p.loads?.axialKN ?? 0));
  const bearing = building.site!.bearingCapacityKNm2;
  const footSide = recommendFootingSizeM(maxAxial, bearing);
  let nextBuilding = building;
  const cur = building.foundation!;
  const pressure = maxAxial / Math.max(cur.width * cur.length, 0.01);

  for (const p of pillars) {
    if (p.loads) {
      p.loads.footingPressureKNm2 = pressure;
    }
  }

  if (pressure > bearing * 1.05) {
    advisor.push({
      id: uid("adv"),
      severity: "critical",
      title: "Footing pressure exceeded",
      body: `q ≈ ${pressure.toFixed(0)} kN/m² > SBC ${bearing} kN/m². Foundation reaction grew with floors / column loads.`,
      memberKind: "footing",
      suggestedAction: `Increase pad toward ${footSide.toFixed(2)} m square.`,
      timestamp: now,
    });
  }

  if (footSide > Math.max(cur.width, cur.length) + 0.05) {
    if (autoFooting) {
      nextBuilding = {
        ...building,
        foundation: {
          ...cur,
          width: footSide,
          length: footSide,
          type: cur.type === "pile" ? "pile" : "isolated",
        },
      };
      advisor.push({
        id: uid("adv"),
        severity: "recommendation",
        title: "Foundation auto-updated",
        body: `Isolated footing resized to ${footSide.toFixed(2)}×${footSide.toFixed(2)} m from max column load ${maxAxial.toFixed(0)} kN.`,
        memberKind: "footing",
        timestamp: now,
      });
    } else {
      recommendations.push({
        kind: "footing",
        memberId: "foundation",
        reason: `Max column ${maxAxial.toFixed(0)} kN on ${bearing} kN/m²`,
        current: `${cur.width.toFixed(2)}×${cur.length.toFixed(2)} m`,
        recommended: `${footSide.toFixed(2)}×${footSide.toFixed(2)} m`,
        applyPatch: { width: footSide, length: footSide },
      });
    }
  }

  // Storey drift teaching proxy
  const H = building.floors * building.floorHeight;
  const driftProxy = building.floors > 8 ? H / 250 : H / 400;
  if (building.floors >= 6 && (building.site?.earthquakeZone === "IV" || building.site?.earthquakeZone === "V")) {
    advisor.push({
      id: uid("adv"),
      severity: "warning",
      title: "Storey drift — review required",
      body: `Teaching proxy Δ ≈ ${driftProxy.toFixed(1)} mm for ${building.floors} storeys in seismic zone ${building.site.earthquakeZone}. Full dynamic analysis not run.`,
      memberKind: "building",
      timestamp: now,
    });
  }

  if (advisor.filter((a) => a.severity !== "info").length === 0) {
    advisor.push({
      id: uid("adv"),
      severity: "info",
      title: "Structure within teaching checks",
      body: "Columns → beams → slab → footing load path updated. Verify with licensed engineering judgment.",
      memberKind: "building",
      timestamp: now,
    });
  }

  return {
    pillars,
    beams,
    slabs,
    building: nextBuilding,
    advisor,
    recommendations,
  };
}

export type MultiFloorEngineResult = {
  floors: Floor[];
  building: BuildingConfig;
  advisor: AdvisorMessage[];
  recommendations: EngineeringRecommendation[];
};

/**
 * Runs the fast TypeScript checks independently for every storey and then
 * validates the vertical load path. No member from one floor is passed into
 * another floor's local dependency graph.
 */
export function runMultiFloorDependencyEngine(input: {
  building: BuildingConfig;
  floors: Floor[];
}): MultiFloorEngineResult {
  let building = input.building;
  const advisor: AdvisorMessage[] = [];
  const recommendations: EngineeringRecommendation[] = [];
  const floors = input.floors
    .slice()
    .sort((a, b) => a.floorNumber - b.floorNumber)
    .map((floor) => {
      const result = runDependencyEngine({
        building,
        pillars: floor.pillars.map((pillar) => ({
          ...pillar,
          floorId: floor.id,
          baseElevation: floor.elevation,
          height: pillar.height || floor.height,
        })),
        beams: floor.beams.map((beam) => ({ ...beam, floorId: floor.id })),
        slabs: floor.slabs.map((slab) => ({ ...slab, floorId: floor.id })),
        autoUpdateFooting: false,
        // A manually selected floor member must not be resized as a side
        // effect of editing a supporting column.
        autoAdjustBeams: false,
      });
      building = result.building;
      advisor.push(...result.advisor);
      recommendations.push(...result.recommendations);
      const structuralWarningCount = result.advisor.filter(
        (message) => message.severity === "warning" || message.severity === "critical"
      ).length;
      return {
        ...floor,
        pillars: result.pillars.map((pillar) => ({
          ...pillar,
          floorId: floor.id,
          baseElevation: floor.elevation,
          height: pillar.height || floor.height,
          stackId:
            pillar.stackId || `stack-${pillar.x.toFixed(3)}-${pillar.y.toFixed(3)}`,
        })),
        beams: result.beams.map((beam) => ({ ...beam, floorId: floor.id })),
        slabs: result.slabs.map((slab) => ({ ...slab, floorId: floor.id })),
        structuralWarningCount,
      };
    });

  const stacks = new Map<string, Pillar[]>();
  for (const floor of floors) {
    for (const pillar of floor.pillars) {
      const stackId = pillar.stackId || `stack-${pillar.x.toFixed(3)}-${pillar.y.toFixed(3)}`;
      const stack = stacks.get(stackId) ?? [];
      stack.push({ ...pillar, stackId });
      stacks.set(stackId, stack);
    }
  }

  stacks.forEach((segments, stackId) => {
    const ordered = segments.sort((a, b) => a.baseElevation - b.baseElevation);
    for (let index = 1; index < ordered.length; index += 1) {
      const lower = ordered[index - 1];
      const upper = ordered[index];
      const offset = Math.hypot(upper.x - lower.x, upper.y - lower.y);
      const lowerSection = Math.min(lower.width, lower.depth);
      const upperSection = Math.min(upper.width, upper.depth);
      const reduction = lowerSection > 0 ? 1 - upperSection / lowerSection : 0;
      const sameFloorWarning = (message: AdvisorMessage) => {
        advisor.push({ ...message, memberId: upper.id });
      };

      if (offset > 0.08) {
        sameFloorWarning({
          id: uid("adv"),
          severity:
            upper.transferCondition === "transfer_beam" ||
            upper.transferCondition === "transfer_slab"
              ? "warning"
              : "critical",
          title: `${upper.name}: vertical load path is offset`,
          body: `${upper.name} is ${offset.toFixed(3)} m away from ${lower.name} in stack ${stackId}. A transfer beam or transfer slab must be explicitly identified; no connection was invented.`,
          memberKind: "column",
          suggestedAction: "Align the segment or set an explicit transfer condition and verify it with a structural engineer.",
          timestamp: Date.now(),
        });
      } else if (offset > 0.02) {
        sameFloorWarning({
          id: uid("adv"),
          severity: "warning",
          title: `${upper.name}: centre-line alignment review`,
          body: `Column centre lines differ by ${offset.toFixed(3)} m from the segment below.`,
          memberKind: "column",
          timestamp: Date.now(),
        });
      }

      if (upperSection > lowerSection + 0.01) {
        sameFloorWarning({
          id: uid("adv"),
          severity: "warning",
          title: `${upper.name}: upper section exceeds support`,
          body: `Upper section ${Math.round(upperSection * 1000)} mm is larger than lower supporting section ${Math.round(lowerSection * 1000)} mm. Check bearing and load transfer.`,
          memberKind: "column",
          timestamp: Date.now(),
        });
      } else if (reduction > 0.35) {
        sameFloorWarning({
          id: uid("adv"),
          severity: "warning",
          title: `${upper.name}: sudden section reduction`,
          body: `Section reduces by ${(reduction * 100).toFixed(0)}% from the storey below. Review confinement, eccentricity and load transfer.`,
          memberKind: "column",
          timestamp: Date.now(),
        });
      }
    }
  });

  // A matching centre line on adjacent floors is expected to use the same
  // stack ID. Flag this explicitly rather than silently treating two
  // independently-created segments as connected.
  for (let floorIndex = 1; floorIndex < floors.length; floorIndex += 1) {
    const lowerFloor = floors[floorIndex - 1];
    const upperFloor = floors[floorIndex];
    for (const upper of upperFloor.pillars) {
      const lower = lowerFloor.pillars.reduce<Pillar | null>((nearest, candidate) => {
        const candidateDistance = Math.hypot(upper.x - candidate.x, upper.y - candidate.y);
        if (!nearest) return candidate;
        return candidateDistance < Math.hypot(upper.x - nearest.x, upper.y - nearest.y)
          ? candidate
          : nearest;
      }, null);
      if (!lower) continue;
      const offset = Math.hypot(upper.x - lower.x, upper.y - lower.y);
      if (offset <= 0.02 && upper.stackId !== lower.stackId) {
        advisor.push({
          id: uid("adv"),
          severity: "warning",
          memberId: upper.id,
          memberKind: "column",
          title: `${upper.name}: aligned segment has a different stack ID`,
          body: `This segment is aligned with ${lower.name} on ${lowerFloor.name}, but belongs to ${upper.stackId || "no stack"}. Confirm whether the column is continuous or intentionally discontinued with an explicit transfer condition.`,
          suggestedAction: "Assign the same stack ID for a continuous column, or identify a transfer beam/slab.",
          timestamp: Date.now(),
        });
      }
    }
  }

  const warningsByFloor = new Map<string, number>();
  for (const message of advisor) {
    if (!message.memberId) continue;
    const owner = floors.find((floor) =>
      floor.pillars.some((pillar) => pillar.id === message.memberId) ||
      floor.beams.some((beam) => beam.id === message.memberId) ||
      floor.slabs.some((slab) => slab.id === message.memberId)
    );
    if (owner) warningsByFloor.set(owner.id, (warningsByFloor.get(owner.id) ?? 0) + 1);
  }

  return {
    building,
    floors: floors.map((floor) => ({
      ...floor,
      structuralWarningCount: warningsByFloor.get(floor.id) ?? floor.structuralWarningCount ?? 0,
    })),
    advisor,
    recommendations,
  };
}

export function applyRecommendation(
  rec: EngineeringRecommendation,
  state: {
    pillars: Pillar[];
    beams: Beam[];
    slabs: Slab[];
    building: BuildingConfig;
  }
) {
  const patch = rec.applyPatch ?? {};
  if (rec.kind === "column") {
    return {
      ...state,
      pillars: state.pillars.map((p) =>
        p.id === rec.memberId ? { ...p, ...patch } : p
      ),
    };
  }
  if (rec.kind === "beam") {
    return {
      ...state,
      beams: state.beams.map((b) =>
        b.id === rec.memberId ? { ...b, ...patch } : b
      ),
    };
  }
  if (rec.kind === "slab") {
    return {
      ...state,
      slabs: state.slabs.map((s) =>
        s.id === rec.memberId ? { ...s, ...patch } : s
      ),
    };
  }
  if (rec.kind === "footing" && state.building.foundation) {
    return {
      ...state,
      building: {
        ...state.building,
        foundation: { ...state.building.foundation, ...patch },
      },
    };
  }
  return state;
}
