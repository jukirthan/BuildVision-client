import { estimateMaterials } from "@/lib/cost-estimator";
import {
  generatePillarGrid,
  recalculateStructure,
} from "@/lib/structural-engine";
import type { BuildingConfig, LayoutSuggestion } from "@/types/structure";

export function generateLayoutSuggestions(
  building: BuildingConfig
): LayoutSuggestion[] {
  const candidates = [
    {
      id: "balanced",
      label: "Balanced grid",
      description: "Even 4×3 spacing — good default for mid-rise residential.",
      gridCols: 4,
      gridRows: 3,
      pillarWidth: 0.4,
      pillarDepth: 0.4,
      tradeoff: "Best cost-to-span balance for most apartments.",
    },
    {
      id: "economy",
      label: "Economy layout",
      description: "Wider 3×2 bay — fewer pillars, longer beams.",
      gridCols: 3,
      gridRows: 2,
      pillarWidth: 0.45,
      pillarDepth: 0.45,
      tradeoff: "Lower pillar count; beams carry more load.",
    },
    {
      id: "dense",
      label: "Dense support",
      description: "Tighter 5×4 grid with slimmer columns.",
      gridCols: 5,
      gridRows: 4,
      pillarWidth: 0.35,
      pillarDepth: 0.35,
      tradeoff: "Higher material use; shorter spans, simpler beams.",
    },
    {
      id: "heavy",
      label: "Heavy columns",
      description: "3×3 grid with oversized pillars for commercial loads.",
      gridCols: 3,
      gridRows: 3,
      pillarWidth: 0.55,
      pillarDepth: 0.55,
      tradeoff: "Higher capacity per bay; fewer but heavier elements.",
    },
  ];

  return candidates.map((c) => {
    const pillars = generatePillarGrid(
      building,
      c.gridCols,
      c.gridRows,
      c.pillarWidth,
      c.pillarDepth
    );
    const { beams, slabs } = recalculateStructure(building, pillars);
    const estimate = estimateMaterials(pillars, beams, slabs, [], building.floors);
    return { ...c, estimatedCost: estimate.totalCost };
  });
}
