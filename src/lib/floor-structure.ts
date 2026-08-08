import type {
  Beam,
  BuildingConfig,
  Floor,
  FloorPlate,
  Opening,
  Pillar,
  Slab,
  Stair,
  Wall,
} from "@/types/structure";
import {
  emptyFloorPlate,
  generateBeamsFromPillars,
  generatePillarGrid,
  generateSlab,
  generatePerimeterWalls,
  pillarLoadCapacity,
  uid,
} from "@/lib/structural-engine";

export type FloorCreationMode = "copy_layout" | "pillars_only" | "empty";

export type FloorMemberCollections = Pick<
  Floor,
  "pillars" | "beams" | "slabs" | "walls" | "openings" | "stairs"
>;

export function floorNumberOf(floor: Floor) {
  return floor.floorNumber;
}

export function floorById(floors: Floor[], floorId: string) {
  return floors.find((floor) => floor.id === floorId);
}

export function floorByNumber(floors: Floor[], floorNumber: number) {
  return floors.find((floor) => floor.floorNumber === floorNumber);
}

export function recalculateFloorElevations(floors: Floor[]) {
  let elevation = 0;
  return floors
    .slice()
    .sort((a, b) => a.floorNumber - b.floorNumber)
    .map((floor, index) => {
      const next = {
        ...floor,
        floorNumber: index + 1,
        elevation,
        pillars: floor.pillars.map((pillar) => ({
          ...pillar,
          baseElevation: elevation,
          height: pillar.height || floor.height,
          floorId: floor.id,
        })),
        beams: floor.beams.map((beam) => ({
          ...beam,
          floorId: floor.id,
          height: beam.height || floor.height,
        })),
        slabs: floor.slabs.map((slab) => ({ ...slab, floorId: floor.id })),
        walls: floor.walls.map((wall) => ({ ...wall, floor: index + 1 })),
        openings: floor.openings.map((opening) => ({
          ...opening,
          floor: index + 1,
        })),
        stairs: floor.stairs.map((stair) => ({
          ...stair,
          floor: index + 1,
        })),
      };
      elevation += next.height;
      return next;
    });
}

function cloneWallSet(source: Floor, floorNumber: number) {
  const wallIdMap = new Map<string, string>();
  const walls = source.walls.map((wall) => {
    const id = uid("w");
    wallIdMap.set(wall.id, id);
    return { ...structuredClone(wall), id, floor: floorNumber };
  });
  const openings = source.openings.map((opening) => ({
    ...structuredClone(opening),
    id: uid("o"),
    wallId: wallIdMap.get(opening.wallId) ?? opening.wallId,
    floor: floorNumber,
  }));
  const stairs = source.stairs.map((stair) => ({
    ...structuredClone(stair),
    id: uid("st"),
    floor: floorNumber,
  }));
  return { walls, openings, stairs };
}

export function cloneFloor(
  source: Floor,
  target: Pick<Floor, "id" | "floorNumber" | "name" | "elevation" | "height">,
  mode: FloorCreationMode
): Floor {
  const floorId = target.id;
  const sourcePillarIdMap = new Map<string, string>();
  const pillars =
    mode === "empty"
      ? []
      : source.pillars.map((pillar) => {
          const id = uid("p");
          sourcePillarIdMap.set(pillar.id, id);
          return {
            ...structuredClone(pillar),
            id,
            floorId,
            baseElevation: target.elevation,
            height: target.height,
          };
        });

  const beams =
    mode === "copy_layout"
      ? source.beams.map((beam) => ({
          ...structuredClone(beam),
          id: uid("b"),
          floorId,
          startPillarId: sourcePillarIdMap.get(beam.startPillarId) ?? "",
          endPillarId: sourcePillarIdMap.get(beam.endPillarId) ?? "",
        }))
      : [];
  const slabs =
    mode === "copy_layout"
      ? source.slabs.map((slab) => ({
          ...structuredClone(slab),
          id: uid("s"),
          floorId,
        }))
      : [];
  const ancillary =
    mode === "copy_layout" ? cloneWallSet(source, target.floorNumber) : {
      walls: [],
      openings: [],
      stairs: [],
    };

  return {
    ...target,
    pillars,
    beams,
    slabs,
    ...ancillary,
  };
}

export function makeFloor(
  building: BuildingConfig,
  floorNumber: number,
  options?: Partial<Pick<Floor, "id" | "name" | "height">> & {
    pillars?: Pillar[];
    beams?: Beam[];
    slabs?: Slab[];
    walls?: Wall[];
    openings?: Opening[];
    stairs?: Stair[];
  }
): Floor {
  const height = options?.height ?? building.floorHeight;
  const floor: Floor = {
    id: options?.id ?? uid("floor"),
    floorNumber,
    name: options?.name ?? `Floor ${floorNumber}`,
    elevation: 0,
    height,
    pillars: options?.pillars ?? [],
    beams: options?.beams ?? [],
    slabs: options?.slabs ?? [],
    walls: options?.walls ?? [],
    openings: options?.openings ?? [],
    stairs: options?.stairs ?? [],
  };
  return floor;
}

export function createInitialFloors(building: BuildingConfig) {
  const floorIds = Array.from({ length: building.floors }, () => uid("floor"));
  const base = makeFloor(building, 1, { id: floorIds[0] });
  const basePillars = generatePillarGrid(
    building,
    4,
    3,
    0.4,
    0.4,
    1,
    base.id,
    0
  );
  base.pillars = basePillars;
  base.walls = generatePerimeterWalls(building, 1);
  base.beams = generateBeamsFromPillars(
    basePillars,
    0.3,
    0.5,
    base.height,
    base.id
  );
  base.slabs = [generateSlab(building, 0.15, base.id)];
  const floors = [base];
  for (let number = 2; number <= building.floors; number += 1) {
    floors.push(
      cloneFloor(
        floors[number - 2],
        {
          id: floorIds[number - 1],
          floorNumber: number,
          name: `Floor ${number}`,
          elevation: 0,
          height: building.floorHeight,
        },
        "copy_layout"
      )
    );
  }
  return recalculateFloorElevations(floors);
}

export function createFloorsFromLegacy(
  building: BuildingConfig,
  pillars: Pillar[],
  beams: Beam[],
  slabs: Slab[],
  plates: FloorPlate[] = []
) {
  const floors = Array.from({ length: building.floors }, (_, index) => {
    const number = index + 1;
    const plate = plates.find((item) => item.floor === number);
    return makeFloor(building, number, {
      name: `Floor ${number}`,
      walls: structuredClone(plate?.walls ?? emptyFloorPlate(number, building).walls),
      openings: structuredClone(plate?.openings ?? []),
      stairs: structuredClone(plate?.stairs ?? []),
    });
  });
  const hasExplicitFloorOwnership =
    pillars.some((item) => item.floorId && item.floorId !== "legacy-floor") ||
    beams.some((item) => item.floorId && item.floorId !== "legacy-floor") ||
    slabs.some((item) => item.floorId && item.floorId !== "legacy-floor");

  if (!hasExplicitFloorOwnership) {
    const base = makeFloor(building, 1, {
      id: floors[0].id,
      pillars: structuredClone(pillars),
      beams: structuredClone(beams),
      slabs: structuredClone(slabs),
    });
    floors[0] = base;
    for (let i = 1; i < floors.length; i += 1) {
      floors[i] = cloneFloor(
        base,
        {
          id: floors[i].id,
          floorNumber: i + 1,
          name: floors[i].name,
          elevation: 0,
          height: floors[i].height,
        },
        "copy_layout"
      );
    }
  } else {
    const floorIdByNumber = new Map(
      floors.map((floor) => [floor.floorNumber, floor.id])
    );
    for (const floor of floors) {
      floor.pillars = structuredClone(
        pillars.filter(
          (item) => item.floorId === floor.id || item.floor === floor.floorNumber
        )
      );
      floor.beams = structuredClone(
        beams.filter(
          (item) => item.floorId === floor.id || item.floorId === floorIdByNumber.get(floor.floorNumber)
        )
      );
      floor.slabs = structuredClone(
        slabs.filter(
          (item) => item.floorId === floor.id || item.floorId === floorIdByNumber.get(floor.floorNumber)
        )
      );
    }
  }

  return recalculateFloorElevations(floors);
}

export function floorPlatesFromFloors(floors: Floor[]): FloorPlate[] {
  return floors.map((floor) => ({
    floor: floor.floorNumber,
    floorId: floor.id,
    walls: structuredClone(floor.walls),
    openings: structuredClone(floor.openings),
    stairs: structuredClone(floor.stairs),
  }));
}

export function flattenFloors(floors: Floor[]) {
  return {
    pillars: floors.flatMap((floor) => floor.pillars.map((item) => structuredClone(item))),
    beams: floors.flatMap((floor) => floor.beams.map((item) => structuredClone(item))),
    slabs: floors.flatMap((floor) => floor.slabs.map((item) => structuredClone(item))),
  };
}

export function updateAncillaryFromPlates(floors: Floor[], plates: FloorPlate[]) {
  return floors.map((floor) => {
    const plate = plates.find(
      (item) => item.floorId === floor.id || item.floor === floor.floorNumber
    );
    return plate
      ? {
          ...floor,
          walls: structuredClone(plate.walls),
          openings: structuredClone(plate.openings),
          stairs: structuredClone(plate.stairs),
        }
      : floor;
  });
}

export function buildEmptyFloorMembers(
  floor: Floor,
  building: BuildingConfig,
  mode: FloorCreationMode
) {
  if (mode !== "pillars_only") return floor;
  const pillars = floor.pillars.map((pillar) => ({
    ...structuredClone(pillar),
    id: uid("p"),
    floorId: floor.id,
    width: 0.4,
    depth: 0.4,
    height: floor.height,
    baseElevation: floor.elevation,
    loadCapacity: pillarLoadCapacity(0.4, 0.4, floor.height),
  }));
  return { ...floor, pillars, beams: [], slabs: [] };
}
