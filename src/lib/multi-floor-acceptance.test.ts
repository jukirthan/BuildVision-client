import { strict as assert } from "node:assert";
import { cloneFloor, makeFloor, recalculateFloorElevations } from "@/lib/floor-structure";
import { runMultiFloorDependencyEngine } from "@/lib/engineering/dependency-engine";
import { defaultBuilding } from "@/lib/structural-engine";
import { estimateMultiFloorMaterials } from "@/lib/cost-estimator";
import type { BuildingConfig, Floor, Pillar } from "@/types/structure";

/**
 * Lightweight invariant test module for the floor-owned data model.
 * It is intentionally framework-neutral so it can run under the project's
 * existing TypeScript toolchain or be imported by Vitest/Node test runners.
 */
export function runMultiFloorAcceptanceInvariants() {
  const building: BuildingConfig = {
    name: "Acceptance tower",
    width: 12,
    length: 10,
    floors: 5,
    floorHeight: 3,
    showFoundation: true,
    showAllFloors: false,
  };
  const base = makeFloor(building, 1, { id: "floor-1" });
  const pillar: Pillar = {
    id: "pillar-c2-f1",
    floorId: base.id,
    stackId: "stack-c2",
    name: "C2",
    x: 10,
    y: 2,
    width: 0.45,
    depth: 0.45,
    height: 3,
    baseElevation: 0,
    material: "concrete",
    loadCapacity: 1,
  };
  const floor: Floor = { ...base, pillars: [pillar] };
  const floors: Floor[] = [floor];
  for (let number = 2; number <= 5; number += 1) {
    floors.push(
      cloneFloor(
        floors[number - 2],
        { id: `floor-${number}`, floorNumber: number, name: `Floor ${number}`, elevation: 0, height: 3 },
        "copy_layout"
      )
    );
  }
  const normalized = recalculateFloorElevations(floors);
  const floor2 = { ...normalized[1], pillars: [{ ...normalized[1].pillars[0], width: 0.45 }] };
  const floor4 = { ...normalized[3], pillars: [{ ...normalized[3].pillars[0], width: 0.30 }] };
  const edited = [normalized[0], floor2, normalized[2], floor4, normalized[4]];
  assert.equal(edited.length, 5);
  assert.notEqual(edited[0].pillars[0].id, edited[1].pillars[0].id);
  assert.equal(edited[0].pillars[0].stackId, edited[1].pillars[0].stackId);
  assert.equal(edited[1].pillars[0].width, 0.45);
  assert.equal(edited[3].pillars[0].width, 0.30);
  assert.equal(edited[0].pillars[0].width, 0.45);
  const movedUpper = { ...edited[3], pillars: [{ ...edited[3].pillars[0], x: 9.5 }] };
  assert.equal(edited[1].pillars[0].x, 10);
  assert.equal(movedUpper.pillars[0].x, 9.5);
  const misaligned = [
    normalized[0],
    { ...normalized[1], pillars: [{ ...normalized[1].pillars[0], x: 9.5 }] },
  ];
  const continuity = runMultiFloorDependencyEngine({
    building: { ...defaultBuilding(), floors: 2 },
    floors: misaligned,
  });
  assert(
    continuity.advisor.some(
      (message) => message.severity === "critical" && message.body.includes("away")
    )
  );
  const cost = estimateMultiFloorMaterials(edited, building);
  assert.equal(cost.floorEstimates?.length, 5);
  assert.notEqual(
    cost.floorEstimates?.[1].concreteVolumeM3,
    cost.floorEstimates?.[3].concreteVolumeM3
  );
  return true;
}
