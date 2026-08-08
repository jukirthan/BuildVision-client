"use client";

import { create } from "zustand";
import { generateMemberDesignOptions } from "@/lib/ai-design-options";
import { generateLayoutSuggestions } from "@/lib/ai-recommendations";
import { estimateMaterials, estimateMultiFloorMaterials } from "@/lib/cost-estimator";
import {
  applyRecommendation,
  runMultiFloorDependencyEngine,
  runDependencyEngine,
} from "@/lib/engineering/dependency-engine";
import {
  buildEmptyFloorMembers,
  cloneFloor,
  createFloorsFromLegacy,
  createInitialFloors,
  flattenFloors,
  floorById,
  floorByNumber,
  floorPlatesFromFloors,
  makeFloor,
  recalculateFloorElevations,
  updateAncillaryFromPlates,
  type FloorCreationMode,
} from "@/lib/floor-structure";
import {
  computeStairFromSteps,
  defaultStepCount,
} from "@/lib/stair-geometry";
import {
  defaultBuilding,
  emptyFloorPlate,
  generatePerimeterWalls,
  generatePillarGrid,
  generateBeamsFromPillars,
  beamLoadBearing,
  pillarLoadCapacity,
  recalculateStructure,
  uid,
} from "@/lib/structural-engine";
import type {
  AdvisorMessage,
  Beam,
  BuildingConfig,
  DesignCodes,
  DesignOption,
  EditTool,
  EditScope,
  Floor,
  EngineeringRecommendation,
  FloorPlate,
  FoundationConfig,
  LayoutSuggestion,
  MaterialEstimate,
  Opening,
  Pillar,
  RoofConfig,
  SiteConfig,
  Slab,
  Stair,
  ViewFlags,
  ViewMode,
  Wall,
} from "@/types/structure";

type StructureSnapshot = {
  building: BuildingConfig;
  floors: Floor[];
  activeFloorId: string;
  activeFloor: number;
  pillars: Pillar[];
  beams: ReturnType<typeof recalculateStructure>["beams"];
  slabs: ReturnType<typeof recalculateStructure>["slabs"];
  floorPlates: FloorPlate[];
  estimate: MaterialEstimate;
  suggestions: LayoutSuggestion[];
};

export type PersistedDesign = {
  schemaVersion: 1 | 2;
  building: BuildingConfig;
  floors: Floor[];
  activeFloorId?: string;
  activeFloor: number;
  /** Legacy fields remain optional for migrating schemaVersion 1 snapshots. */
  pillars?: Pillar[];
  beams?: Beam[];
  slabs?: Slab[];
  floorPlates?: FloorPlate[];
};

interface StructureStore {
  building: BuildingConfig;
  /** Canonical floor-owned state. Flat arrays below are compatibility DTOs. */
  floors: Floor[];
  activeFloorId: string;
  activeFloor: number;
  pillars: Pillar[];
  beams: ReturnType<typeof recalculateStructure>["beams"];
  slabs: ReturnType<typeof recalculateStructure>["slabs"];
  floorPlates: FloorPlate[];
  selectedPillarId: string | null;
  selectedWallId: string | null;
  selectedOpeningId: string | null;
  selectedStairId: string | null;
  selectedBeamId: string | null;
  selectedSlabId: string | null;
  /** Ctrl/Cmd+click multi-selection — "logo" group of pillars (and pillars
   * pulled in from ctrl-clicked beams) that move together as one rigid body. */
  multiSelectedPillarIds: string[];
  multiSelectedBeamIds: string[];
  estimate: MaterialEstimate;
  suggestions: LayoutSuggestion[];
  designOptions: DesignOption[];
  advisor: AdvisorMessage[];
  recommendations: EngineeringRecommendation[];
  inspectorOpen: boolean;
  floorCreationOpen: boolean;
  tool: EditTool;
  wallDraftStart: { x: number; y: number } | null;
  /** Steps used when placing a new stair (rise = floorHeight / steps). */
  stairStepCount: number;
  leftOpen: boolean;
  rightOpen: boolean;
  hydrated: boolean;
  isDragging: boolean;
  /** Orbit exterior vs walk-inside camera. */
  viewMode: ViewMode;
  /** Hide ceilings / floors above active so you can edit interiors. */
  cutaway: boolean;
  viewFlags: ViewFlags;
  /** Bumped to trigger cinematic camera framing of the current selection. */
  focusToken: number;
  past: StructureSnapshot[];
  future: StructureSnapshot[];

  initDemo: () => void;
  /** Hydrate planner from project/building metadata (API or query params). */
  hydrateFromMeta: (meta: {
    name?: string;
    width?: number;
    length?: number;
    floors?: number;
    floorHeight?: number;
  }) => void;
  hydrateFromDesign: (design: PersistedDesign) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  setBuilding: (patch: Partial<BuildingConfig>) => void;
  setActiveFloor: (floorId: string | number) => void;
  addFloor: (options?: {
    mode?: FloorCreationMode;
    sourceFloorId?: string;
  }) => void;
  duplicateFloor: (sourceFloorId: string) => void;
  removeFloor: (floorId?: string | number) => void;
  setTool: (tool: EditTool) => void;
  setStairStepCount: (n: number) => void;
  setViewFlags: (patch: Partial<ViewFlags>) => void;
  /** Frame the camera on the current selection (Iron Man focus). */
  requestFocusSelection: () => void;
  setDragging: (v: boolean) => void;
  setViewMode: (mode: ViewMode) => void;
  setCutaway: (v: boolean) => void;
  clearSelection: () => void;
  selectPillar: (id: string | null) => void;
  selectWall: (id: string | null) => void;
  selectStair: (id: string | null) => void;
  selectBeam: (id: string | null) => void;
  selectSlab: (id: string | null) => void;
  selectOpening: (id: string | null) => void;
  toggleMultiSelectPillar: (id: string) => void;
  toggleMultiSelectBeam: (id: string) => void;
  clearMultiSelect: () => void;
  moveSelectedGroupBy: (dx: number, dy: number) => void;
  setInspectorOpen: (open: boolean) => void;
  setFloorCreationOpen: (open: boolean) => void;
  updatePillar: (
    floorIdOrMemberId: string,
    pillarIdOrPatch: string | Partial<Pillar>,
    patch?: Partial<Pillar>,
    scope?: EditScope
  ) => void;
  updateBeam: (
    floorIdOrMemberId: string,
    beamIdOrPatch: string | Partial<Beam>,
    patch?: Partial<Beam>
  ) => void;
  updateSlab: (
    floorIdOrMemberId: string,
    slabIdOrPatch: string | Partial<Slab>,
    patch?: Partial<Slab>
  ) => void;
  updateWall: (id: string, patch: Partial<Wall>) => void;
  updateStair: (id: string, patch: Partial<Stair>) => void;
  updateOpening: (id: string, patch: Partial<Opening>) => void;
  setSite: (patch: Partial<SiteConfig>) => void;
  setDesign: (patch: Partial<DesignCodes>) => void;
  setFoundation: (patch: Partial<FoundationConfig>) => void;
  setRoof: (patch: Partial<RoofConfig>) => void;
  applyEngineeringRecommendation: (rec: EngineeringRecommendation) => void;
  applyDesignOption: (opt: DesignOption) => void;
  refreshDesignOptions: () => void;
  movePillar: (
    floorIdOrMemberId: string,
    pillarIdOrX: string | number,
    xOrY: number,
    y?: number
  ) => void;
  moveWallBy: (id: string, dx: number, dy: number) => void;
  moveStair: (id: string, x: number, y: number) => void;
  nudgeSelected: (dx: number, dy: number) => void;
  addPillar: (floorIdOrX: string | number, xOrY: number, y?: number) => void;
  removePillar: (floorIdOrMemberId: string, pillarId?: string) => void;
  addBeam: (floorId: string, startPillarId: string, endPillarId: string) => void;
  removeBeam: (floorId: string, beamId: string) => void;
  addWall: (startX: number, startY: number, endX: number, endY: number) => void;
  setWallDraftStart: (p: { x: number; y: number } | null) => void;
  removeWall: (id: string) => void;
  addOpeningOnWall: (
    wallId: string,
    type: "door" | "window",
    t: number
  ) => void;
  removeOpening: (id: string) => void;
  addStair: (x: number, y: number, opts?: { stepCount?: number }) => void;
  removeStair: (id: string) => void;
  handleCanvasClick: (x: number, y: number, hit?: CanvasHit) => void;
  applySuggestion: (suggestion: LayoutSuggestion) => void;
  setLeftOpen: (open: boolean) => void;
  setRightOpen: (open: boolean) => void;
  regenerateFromGrid: (cols: number, rows: number, size?: number) => void;
  updateFloor: (floorId: string, patch: Partial<Pick<Floor, "name" | "height">>) => void;
}

const MAX_HISTORY = 40;

function cloneSnapshot(state: {
  building: BuildingConfig;
  floors: Floor[];
  activeFloorId: string;
  activeFloor: number;
  pillars: Pillar[];
  beams: ReturnType<typeof recalculateStructure>["beams"];
  slabs: ReturnType<typeof recalculateStructure>["slabs"];
  floorPlates: FloorPlate[];
  estimate: MaterialEstimate;
  suggestions: LayoutSuggestion[];
}): StructureSnapshot {
  return structuredClone({
    building: state.building,
    floors: state.floors,
    activeFloorId: state.activeFloorId,
    activeFloor: state.activeFloor,
    pillars: state.pillars,
    beams: state.beams,
    slabs: state.slabs,
    floorPlates: state.floorPlates,
    estimate: state.estimate,
    suggestions: state.suggestions,
  });
}

export type CanvasHit =
  | { kind: "pillar"; id: string }
  | { kind: "wall"; id: string; t: number }
  | { kind: "opening"; id: string }
  | { kind: "stair"; id: string }
  | { kind: "ground" };

const emptyEstimate = (): MaterialEstimate => ({
  concreteVolumeM3: 0,
  steelWeightKg: 0,
  brickVolumeM3: 0,
  concreteCost: 0,
  steelCost: 0,
  brickCost: 0,
  labourCost: 0,
  excavationCost: 0,
  formworkCost: 0,
  foundationCost: 0,
  columnsCost: 0,
  beamsCost: 0,
  slabsCost: 0,
  wallsCost: 0,
  roofCost: 0,
  totalCost: 0,
  pillarCount: 0,
  beamCount: 0,
  slabCount: 0,
  wallCount: 0,
  doorCount: 0,
  windowCount: 0,
  stairCount: 0,
  formworkM2: 0,
  footingVolumeM3: 0,
  excavationVolumeM3: 0,
  stirrupLengthM: 0,
  tieLengthM: 0,
  beamLengthM: 0,
  columnHeightM: 0,
  slabAreaM2: 0,
  brickCount: 0,
  boq: [],
});

const defaultViewFlags = (): ViewFlags => ({
  showLabels: false,
  showDimensions: false,
  dimensionMode: "selected",
  showReinforcement: false,
  wireframe: false,
  exploded: false,
  sectionView: false,
  snapToGrid: true,
  gridSizeM: 0.25,
  gizmoMode: "translate",
  isolateSelection: false,
  floorVisibility: "active_with_lower_ghosted",
});

/** Debounced live cost — keeps inspector edits from thrashing the main thread. */
let estimateTimer: ReturnType<typeof setTimeout> | null = null;
/** Debounced full structure rebuild after property-panel patches. */
let structureDebounceTimer: ReturnType<typeof setTimeout> | null = null;

type RebuildGet = () => {
  floors: Floor[];
  activeFloorId: string;
  beams: Beam[];
  slabs: Slab[];
  selectedPillarId: string | null;
  selectedBeamId: string | null;
  selectedSlabId: string | null;
  pillars: Pillar[];
  floorPlates: FloorPlate[];
  building: BuildingConfig;
};

function scheduleEstimate(get: RebuildGet, set: (partial: object) => void) {
  if (estimateTimer) clearTimeout(estimateTimer);
  estimateTimer = setTimeout(() => {
    const s = get();
    set({
      estimate: s.floors.length
        ? estimateMultiFloorMaterials(s.floors, s.building)
        : estimateMaterials(
            s.pillars,
            s.beams,
            s.slabs,
            s.floorPlates,
            s.building.floors,
            s.building
          ),
    });
  }, 220);
}

function commitStructure(
  get: RebuildGet,
  set: (partial: object) => void,
  building: BuildingConfig,
  pillars: Pillar[],
  floorPlates: FloorPlate[],
  extra: Record<string, unknown> = {},
  options?: { footprintChanged?: boolean }
) {
  set({ ...rebuild(get, building, pillars, floorPlates, options), ...extra });
  scheduleEstimate(get, set);
}

function commitFloors(
  get: RebuildGet,
  set: (partial: object) => void,
  building: BuildingConfig,
  floors: Floor[],
  extra: Record<string, unknown> = {}
) {
  const rebuilt = rebuildFloors(
    get,
    building,
    floors,
    floorPlatesFromFloors(floors)
  );
  set({ ...rebuilt, ...extra });
  scheduleEstimate(get, set);
}

function scheduleCommitStructure(
  get: RebuildGet,
  set: (partial: object) => void,
  extra: Record<string, unknown> = {},
  options?: { footprintChanged?: boolean }
) {
  if (structureDebounceTimer) clearTimeout(structureDebounceTimer);
  structureDebounceTimer = setTimeout(() => {
    const s = get();
    commitStructure(
      get,
      set,
      s.building,
      s.pillars,
      s.floorPlates,
      extra,
      options
    );
  }, 140);
}

function syncFloorPlates(
  building: BuildingConfig,
  plates: FloorPlate[],
  footprintChanged = false
) {
  const next: FloorPlate[] = [];
  for (let f = 1; f <= building.floors; f++) {
    const existing = plates.find((p) => p.floor === f);
    if (existing) {
      const walls = footprintChanged
        ? generatePerimeterWalls(building, f)
        : existing.walls.map((w) => ({
            ...w,
            height: building.floorHeight,
            floor: f,
          }));
      next.push({
        ...existing,
        walls,
        openings: footprintChanged ? [] : existing.openings,
        stairs: existing.stairs.map((s) => ({ ...s, floor: f })),
      });
    } else {
      next.push(emptyFloorPlate(f, building));
    }
  }
  return next;
}

function rebuildFloors(
  get: RebuildGet,
  building: BuildingConfig,
  inputFloors: Floor[],
  floorPlates: FloorPlate[],
  options?: { footprintChanged?: boolean }
) {
  const normalizedFloors = recalculateFloorElevations(inputFloors);
  const plates = syncFloorPlates(
    building,
    floorPlates.length ? floorPlates : floorPlatesFromFloors(normalizedFloors),
    options?.footprintChanged ?? false
  );
  const withAncillary = updateAncillaryFromPlates(normalizedFloors, plates);
  const engineered = runMultiFloorDependencyEngine({
    building,
    floors: withAncillary,
  });
  const floors = recalculateFloorElevations(engineered.floors);
  const flat = flattenFloors(floors);
  const selectedPillar = flat.pillars.find(
    (pillar) => pillar.id === get().selectedPillarId
  );
  const selectedBeam = flat.beams.find(
    (beam) => beam.id === get().selectedBeamId
  );
  const selectedSlab = flat.slabs.find(
    (slab) => slab.id === get().selectedSlabId
  );
  return {
    building: engineered.building,
    floors,
    pillars: flat.pillars,
    beams: flat.beams,
    slabs: flat.slabs,
    floorPlates: floorPlatesFromFloors(floors),
    estimate: estimateMultiFloorMaterials(floors, engineered.building),
    suggestions: generateLayoutSuggestions(engineered.building),
    designOptions: generateMemberDesignOptions({
      pillar: selectedPillar ?? null,
      beam: selectedBeam ?? null,
      slab: selectedPillar || selectedBeam ? null : selectedSlab ?? null,
      pillars: flat.pillars,
      building: engineered.building,
    }),
    advisor: engineered.advisor,
    recommendations: engineered.recommendations,
  };
}

function rebuild(
  get: RebuildGet,
  building: BuildingConfig,
  pillars: Pillar[],
  floorPlates: FloorPlate[],
  options?: { footprintChanged?: boolean }
) {
  if (get().floors.length) {
    return rebuildFloors(get, building, get().floors, floorPlates, options);
  }
  const prev = get();
  const { pillars: p0, beams: b0, slabs: s0 } = recalculateStructure(
    building,
    pillars,
    prev.slabs?.[0]?.thickness ?? 0.15,
    prev.beams,
    prev.slabs
  );
  const engineered = runDependencyEngine({
    building,
    pillars: p0,
    beams: b0,
    slabs: s0,
    autoUpdateFooting: true,
    autoAdjustBeams: true,
  });
  const plates = syncFloorPlates(
    engineered.building,
    floorPlates,
    options?.footprintChanged ?? false
  );
  const pillar = engineered.pillars.find((p) => p.id === prev.selectedPillarId);
  const beam = engineered.beams.find((b) => b.id === prev.selectedBeamId);
  const slabMember =
    engineered.slabs.find((s) => s.id === prev.selectedSlabId) ??
    engineered.slabs[0];
  const designOptions = generateMemberDesignOptions({
    pillar: pillar ?? null,
    beam: beam ?? null,
    slab: pillar || beam ? null : slabMember ?? null,
    pillars: engineered.pillars,
    building: engineered.building,
  });
  // Cost estimate is applied separately via scheduleEstimate (debounced).
  return {
    building: engineered.building,
    pillars: engineered.pillars,
    beams: engineered.beams,
    slabs: engineered.slabs,
    floorPlates: plates,
    suggestions: generateLayoutSuggestions(engineered.building),
    designOptions,
    advisor: engineered.advisor,
    recommendations: engineered.recommendations,
  };
}

function clamp(building: BuildingConfig, x: number, y: number) {
  return {
    x: Math.min(Math.max(x, 0), building.width),
    y: Math.min(Math.max(y, 0), building.length),
  };
}

export const useStructureStore = create<StructureStore>((set, get) => ({
  building: defaultBuilding(),
  floors: [],
  activeFloorId: "",
  activeFloor: 1,
  pillars: [],
  beams: [],
  slabs: [],
  floorPlates: [],
  selectedPillarId: null,
  selectedWallId: null,
  selectedOpeningId: null,
  selectedStairId: null,
  selectedBeamId: null,
  selectedSlabId: null,
  multiSelectedPillarIds: [],
  multiSelectedBeamIds: [],
  estimate: emptyEstimate(),
  suggestions: [],
  designOptions: [],
  advisor: [],
  recommendations: [],
  inspectorOpen: false,
  floorCreationOpen: false,
  tool: "select",
  wallDraftStart: null,
  stairStepCount: defaultStepCount(3.5),
  leftOpen: true,
  rightOpen: false,
  hydrated: false,
  isDragging: false,
  viewMode: "orbit",
  cutaway: true,
  viewFlags: defaultViewFlags(),
  focusToken: 0,
  past: [],
  future: [],

  pushHistory: () => {
    const state = get();
    const snapshot = cloneSnapshot(state);
    const past = [...state.past, snapshot].slice(-MAX_HISTORY);
    set({ past, future: [] });
  },

  undo: () => {
    const state = get();
    if (!state.past.length) return;
    const previous = state.past[state.past.length - 1];
    const past = state.past.slice(0, -1);
    const current = cloneSnapshot(state);
    set({
      ...previous,
      past,
      future: [current, ...state.future].slice(0, MAX_HISTORY),
      selectedPillarId: null,
      selectedWallId: null,
      selectedOpeningId: null,
      selectedStairId: null,
      selectedBeamId: null,
      selectedSlabId: null,
      multiSelectedPillarIds: [],
      multiSelectedBeamIds: [],
      wallDraftStart: null,
      isDragging: false,
    });
  },

  redo: () => {
    const state = get();
    if (!state.future.length) return;
    const next = state.future[0];
    const future = state.future.slice(1);
    const current = cloneSnapshot(state);
    set({
      ...next,
      past: [...state.past, current].slice(-MAX_HISTORY),
      future,
      selectedPillarId: null,
      selectedWallId: null,
      selectedOpeningId: null,
      selectedStairId: null,
      selectedBeamId: null,
      selectedSlabId: null,
      multiSelectedPillarIds: [],
      multiSelectedBeamIds: [],
      wallDraftStart: null,
      isDragging: false,
    });
  },

  initDemo: () => {
    const building = defaultBuilding();
    let floors = createInitialFloors(building);
    floors = floors.map((floor) => {
      const walls = generatePerimeterWalls(building, floor.floorNumber).map(
        (wall) => ({ ...wall, floor: floor.floorNumber })
      );
      const openings: Opening[] = walls[0]
        ? [
            {
              id: uid("o"),
              name: `D${floor.floorNumber}-1`,
              type: "door",
              wallId: walls[0].id,
              t: 0.5,
              width: 1.0,
              height: 2.1,
              sillHeight: 0,
              floor: floor.floorNumber,
            },
          ]
        : [];
      const stairGeo = computeStairFromSteps(
        floor.height,
        defaultStepCount(floor.height)
      );
      const stairs: Stair[] =
        floor.floorNumber < building.floors
          ? [
              {
                id: uid("st"),
                name: `Stair-${floor.floorNumber}`,
                x: building.width - 3,
                y: building.length - 4,
                width: 1.2,
                depth: stairGeo.depthM,
                floor: floor.floorNumber,
                stairType: "straight",
                stepCount: stairGeo.stepCount,
                riseMm: stairGeo.riseMm,
                treadMm: stairGeo.treadMm,
                waistThickness: 0.15,
                rotationDeg: 0,
              },
            ]
          : [];
      return { ...floor, walls, openings, stairs };
    });
    floors = runMultiFloorDependencyEngine({ building, floors }).floors;
    const flat = flattenFloors(floors);

    set({
      building,
      floors,
      activeFloorId: floors[0]?.id ?? "",
      pillars: flat.pillars,
      beams: flat.beams,
      slabs: flat.slabs,
      floorPlates: floorPlatesFromFloors(floors),
      estimate: estimateMultiFloorMaterials(floors, building),
      suggestions: generateLayoutSuggestions(building),
      designOptions: generateMemberDesignOptions({
        pillar: flat.pillars[0] ?? null,
        beam: null,
        slab: null,
        pillars: flat.pillars,
        building,
      }),
      selectedPillarId: flat.pillars[0]?.id ?? null,
      activeFloor: 1,
      tool: "select",
      cutaway: true,
      viewMode: "orbit",
      hydrated: true,
      past: [],
      future: [],
    });
  },

  hydrateFromMeta: (meta) => {
    const building: BuildingConfig = {
      ...defaultBuilding(),
      name: meta.name || defaultBuilding().name,
      width: meta.width ?? 30,
      length: meta.length ?? 20,
      floors: Math.min(50, Math.max(1, meta.floors ?? 3)),
      floorHeight: meta.floorHeight ?? 3.5,
    };
    const floors = runMultiFloorDependencyEngine({
      building,
      floors: createInitialFloors(building),
    }).floors;
    const flat = flattenFloors(floors);
    set({
      building,
      floors,
      activeFloorId: floors[0]?.id ?? "",
      pillars: flat.pillars,
      beams: flat.beams,
      slabs: flat.slabs,
      floorPlates: floorPlatesFromFloors(floors),
      estimate: estimateMultiFloorMaterials(floors, building),
      suggestions: generateLayoutSuggestions(building),
      designOptions: generateMemberDesignOptions({
        pillar: flat.pillars[0] ?? null,
        beam: null,
        slab: null,
        pillars: flat.pillars,
        building,
      }),
      selectedPillarId: flat.pillars[0]?.id ?? null,
      activeFloor: 1,
      tool: "select",
      hydrated: true,
      past: [],
      future: [],
      wallDraftStart: null,
    });
  },

  hydrateFromDesign: (design) => {
    const building = structuredClone(design.building);
    const floors = design.floors?.length
      ? recalculateFloorElevations(structuredClone(design.floors))
      : createFloorsFromLegacy(
          building,
          structuredClone(design.pillars ?? []),
          structuredClone(design.beams ?? []),
          structuredClone(design.slabs ?? []),
          structuredClone(design.floorPlates ?? [])
        );
    const flat = flattenFloors(floors);
    const requestedFloorId = design.activeFloorId;
    const active =
      (requestedFloorId && floorById(floors, requestedFloorId)) ||
      floorByNumber(floors, design.activeFloor || 1) ||
      floors[0];
    set({
      building,
      floors,
      activeFloorId: active?.id ?? "",
      activeFloor: active?.floorNumber ?? 1,
      pillars: flat.pillars,
      beams: flat.beams,
      slabs: flat.slabs,
      floorPlates: floorPlatesFromFloors(floors),
      estimate: estimateMultiFloorMaterials(floors, building),
      suggestions: generateLayoutSuggestions(building),
      designOptions: [],
      selectedPillarId: null,
      selectedWallId: null,
      selectedOpeningId: null,
      selectedStairId: null,
      selectedBeamId: null,
      selectedSlabId: null,
      multiSelectedPillarIds: [],
      multiSelectedBeamIds: [],
      hydrated: true,
      past: [],
      future: [],
      wallDraftStart: null,
    });
  },

  setBuilding: (patch) => {
    const keys = Object.keys(patch);
    const visualOnly =
      keys.length > 0 &&
      keys.every(
        (k) =>
          k === "showAllFloors" ||
          k === "showFoundation" ||
          k === "showRoof" ||
          k === "name"
      );
    if (!visualOnly) get().pushHistory();
    const prev = get().building;
    const building = { ...prev, ...patch };
    if (building.floors < 1) building.floors = 1;
    if (building.floors > 50) building.floors = 50;
    const footprintChanged =
      (patch.width !== undefined && patch.width !== prev.width) ||
      (patch.length !== undefined && patch.length !== prev.length);
    let floorPlates = get().floorPlates;
    // When floor height changes, recompute rise/tread/run for stairs that
    // have an explicit step count (user's chosen number of steps).
    if (
      patch.floorHeight !== undefined &&
      patch.floorHeight !== prev.floorHeight
    ) {
      floorPlates = floorPlates.map((p) => ({
        ...p,
        stairs: p.stairs.map((s) => {
          if (s.stepCount == null) return s;
          const steps = Math.min(30, Math.max(3, Math.round(s.stepCount)));
          const riseMm = Math.round((building.floorHeight * 1000) / steps);
          // Keep plan footprint; tread follows current going length.
          const treadMm = Math.round((s.depth * 1000) / steps);
          return { ...s, stepCount: steps, riseMm, treadMm };
        }),
      }));
    }
    let floors = get().floors.length
      ? structuredClone(get().floors)
      : createFloorsFromLegacy(
          building,
          get().pillars,
          get().beams,
          get().slabs,
          get().floorPlates
        );
    if (patch.floorHeight !== undefined && patch.floorHeight !== prev.floorHeight) {
      floors = floors.map((floor) => ({
        ...floor,
        height: patch.floorHeight ?? floor.height,
        pillars: floor.pillars.map((pillar) => ({
          ...pillar,
          height: patch.floorHeight ?? pillar.height,
        })),
      }));
    }
    while (floors.length < building.floors) {
      const source = floors[floors.length - 1] ?? makeFloor(building, 1);
      floors.push(
        cloneFloor(
          source,
          {
            id: uid("floor"),
            floorNumber: floors.length + 1,
            name: `Floor ${floors.length + 1}`,
            elevation: 0,
            height: building.floorHeight,
          },
          "copy_layout"
        )
      );
    }
    floors = floors.slice(0, building.floors);
    const rebuilt = rebuildFloors(
      get,
      building,
      floors,
      floorPlates,
      { footprintChanged }
    );
    const activeFloor = Math.min(get().activeFloor, building.floors);
    const active = floorByNumber(rebuilt.floors, activeFloor) ?? rebuilt.floors[0];
    set({ ...rebuilt, activeFloor, activeFloorId: active?.id ?? "" });
    scheduleEstimate(get, set);
  },

  setActiveFloor: (floorIdOrNumber) => {
    const state = get();
    const floor =
      typeof floorIdOrNumber === "string"
        ? floorById(state.floors, floorIdOrNumber)
        : floorByNumber(state.floors, floorIdOrNumber);
    if (!floor) return;
    set({
      activeFloorId: floor.id,
      activeFloor: floor.floorNumber,
      wallDraftStart: null,
      selectedPillarId: null,
      selectedBeamId: null,
      selectedSlabId: null,
      selectedWallId: null,
      selectedStairId: null,
      selectedOpeningId: null,
      multiSelectedPillarIds: [],
      multiSelectedBeamIds: [],
    });
  },

  updateFloor: (floorId, patch) => {
    const state = get();
    if (!floorById(state.floors, floorId)) return;
    state.pushHistory();
    const floors = state.floors.map((floor) => {
      if (floor.id !== floorId) return floor;
      const nextHeight = patch.height ?? floor.height;
      return {
        ...floor,
        ...patch,
        height: nextHeight,
        pillars: floor.pillars.map((pillar) => ({
          ...pillar,
          height: patch.height === undefined ? pillar.height : nextHeight,
        })),
      };
    });
    const rebuilt = rebuildFloors(
      get,
      state.building,
      floors,
      floorPlatesFromFloors(floors)
    );
    const active = floorById(rebuilt.floors, state.activeFloorId) ?? rebuilt.floors[0];
    set({ ...rebuilt, activeFloorId: active.id, activeFloor: active.floorNumber });
  },

  addFloor: (options) => {
    const state = get();
    if (state.floors.length >= 50) return;
    state.pushHistory();
    const source =
      floorById(state.floors, options?.sourceFloorId ?? "") ??
      state.floors[state.floors.length - 1];
    if (!source) return;
    const mode = options?.mode ?? "copy_layout";
    const targetNumber = state.floors.length + 1;
    const target = {
      id: uid("floor"),
      floorNumber: targetNumber,
      name: `Floor ${targetNumber}`,
      elevation: 0,
      height: source.height || state.building.floorHeight,
    } as const;
    let newFloor = cloneFloor(source, target, mode);
    newFloor = buildEmptyFloorMembers(newFloor, state.building, mode);
    const floors = recalculateFloorElevations([...state.floors, newFloor]);
    const building = { ...state.building, floors: floors.length };
    const rebuilt = rebuildFloors(
      get,
      building,
      floors,
      floorPlatesFromFloors(floors)
    );
    const active = floors[floors.length - 1];
    set({
      ...rebuilt,
      activeFloorId: active.id,
      activeFloor: active.floorNumber,
      wallDraftStart: null,
    });
  },

  duplicateFloor: (sourceFloorId) => {
    get().addFloor({ sourceFloorId, mode: "copy_layout" });
  },

  removeFloor: (floorIdOrNumber) => {
    const state = get();
    if (state.floors.length <= 1) return;
    const target =
      typeof floorIdOrNumber === "string"
        ? floorById(state.floors, floorIdOrNumber)
        : floorByNumber(state.floors, floorIdOrNumber ?? state.activeFloor);
    if (!target) return;
    state.pushHistory();
    const remaining = state.floors.filter((floor) => floor.id !== target.id);
    const floors = recalculateFloorElevations(remaining);
    const building = { ...state.building, floors: floors.length };
    const rebuilt = rebuildFloors(
      get,
      building,
      floors,
      floorPlatesFromFloors(floors)
    );
    const active =
      floorById(floors, state.activeFloorId) ??
      floors[Math.min(target.floorNumber - 1, floors.length - 1)];
    set({
      ...rebuilt,
      activeFloorId: active?.id ?? floors[0].id,
      activeFloor: active?.floorNumber ?? 1,
      wallDraftStart: null,
    });
  },

  setTool: (tool) => set({ tool, wallDraftStart: null }),
  setStairStepCount: (n) =>
    set({ stairStepCount: Math.min(30, Math.max(3, Math.round(n))) }),
  setDragging: (v) => {
    // Capture history once when a drag starts (not on every move).
    if (v && !get().isDragging) {
      get().pushHistory();
    }
    // On drag end, run a full structural rebuild (deferred from movePillar).
    if (!v && get().isDragging) {
      const { building, pillars, floorPlates } = get();
      commitStructure(get, set, building, pillars, floorPlates, {
        isDragging: false,
      });
      return;
    }
    set({ isDragging: v });
  },

  setViewMode: (mode) =>
    set({
      viewMode: mode,
      // Inside mode always uses cutaway so ceilings don't block editing.
      cutaway: mode === "inside" ? true : get().cutaway,
      // Prefer active floor only while walking inside.
      building:
        mode === "inside"
          ? { ...get().building, showAllFloors: false }
          : get().building,
    }),

  setCutaway: (v) => set({ cutaway: v }),

  setViewFlags: (patch) =>
    set({ viewFlags: { ...get().viewFlags, ...patch } }),

  requestFocusSelection: () => set({ focusToken: get().focusToken + 1 }),

  clearSelection: () =>
    set({
      selectedPillarId: null,
      selectedWallId: null,
      selectedOpeningId: null,
      selectedStairId: null,
      selectedBeamId: null,
      selectedSlabId: null,
      multiSelectedPillarIds: [],
      multiSelectedBeamIds: [],
    }),

  selectPillar: (id) => {
    set({
      selectedPillarId: id,
      selectedWallId: null,
      selectedOpeningId: null,
      selectedStairId: null,
      selectedBeamId: null,
      selectedSlabId: null,
      multiSelectedPillarIds: [],
      multiSelectedBeamIds: [],
      inspectorOpen: id ? true : get().inspectorOpen,
    });
    get().refreshDesignOptions();
  },

  selectWall: (id) =>
    set({
      selectedWallId: id,
      selectedPillarId: null,
      selectedOpeningId: null,
      selectedStairId: null,
      selectedBeamId: null,
      selectedSlabId: null,
      multiSelectedPillarIds: [],
      multiSelectedBeamIds: [],
      inspectorOpen: id ? true : get().inspectorOpen,
    }),

  selectStair: (id) =>
    set({
      selectedStairId: id,
      selectedPillarId: null,
      selectedWallId: null,
      selectedOpeningId: null,
      selectedBeamId: null,
      selectedSlabId: null,
      multiSelectedPillarIds: [],
      multiSelectedBeamIds: [],
      inspectorOpen: id ? true : get().inspectorOpen,
    }),

  selectOpening: (id) =>
    set({
      selectedOpeningId: id,
      selectedPillarId: null,
      selectedWallId: null,
      selectedStairId: null,
      selectedBeamId: null,
      selectedSlabId: null,
      multiSelectedPillarIds: [],
      multiSelectedBeamIds: [],
      inspectorOpen: id ? true : get().inspectorOpen,
    }),

  selectBeam: (id) => {
    set({
      selectedBeamId: id,
      selectedPillarId: null,
      selectedWallId: null,
      selectedOpeningId: null,
      selectedStairId: null,
      selectedSlabId: null,
      multiSelectedPillarIds: [],
      multiSelectedBeamIds: [],
      inspectorOpen: id ? true : get().inspectorOpen,
    });
    get().refreshDesignOptions();
  },

  selectSlab: (id) => {
    set({
      selectedSlabId: id,
      selectedPillarId: null,
      selectedWallId: null,
      selectedOpeningId: null,
      selectedStairId: null,
      selectedBeamId: null,
      multiSelectedPillarIds: [],
      multiSelectedBeamIds: [],
      inspectorOpen: id ? true : get().inspectorOpen,
    });
    get().refreshDesignOptions();
  },

  toggleMultiSelectPillar: (id) => {
    const current = get().multiSelectedPillarIds;
    const exists = current.includes(id);
    set({
      multiSelectedPillarIds: exists
        ? current.filter((x) => x !== id)
        : [...current, id],
      // Group mode replaces single-item selection while active.
      selectedPillarId: null,
      selectedWallId: null,
      selectedOpeningId: null,
      selectedStairId: null,
      selectedBeamId: null,
      selectedSlabId: null,
    });
  },

  toggleMultiSelectBeam: (id) => {
    const beam = get().beams.find((b) => b.id === id);
    if (!beam) return;
    const pillarIds = [beam.startPillarId, beam.endPillarId].filter(
      (x): x is string => Boolean(x)
    );
    const beams = get().multiSelectedBeamIds;
    const pillars = get().multiSelectedPillarIds;
    const alreadyIn = beams.includes(id);
    if (alreadyIn) {
      set({
        multiSelectedBeamIds: beams.filter((x) => x !== id),
        multiSelectedPillarIds: pillars.filter((p) => !pillarIds.includes(p)),
      });
    } else {
      set({
        multiSelectedBeamIds: [...beams, id],
        multiSelectedPillarIds: Array.from(
          new Set([...pillars, ...pillarIds])
        ),
        selectedPillarId: null,
        selectedWallId: null,
        selectedOpeningId: null,
        selectedStairId: null,
        selectedBeamId: null,
        selectedSlabId: null,
      });
    }
  },

  clearMultiSelect: () =>
    set({ multiSelectedPillarIds: [], multiSelectedBeamIds: [] }),

  moveSelectedGroupBy: (dx, dy) => {
    const ids = get().multiSelectedPillarIds;
    if (!ids.length) return;
    const idSet = new Set(ids);
    const building = get().building;
    const floors = get().floors.map((floor) => {
      const moved = floor.pillars.map((pillar) => {
        if (!idSet.has(pillar.id)) return pillar;
        const pos = clamp(building, pillar.x + dx, pillar.y + dy);
        return { ...pillar, x: pos.x, y: pos.y };
      });
      const movedIds = new Set(
        moved.filter((pillar, index) => pillar !== floor.pillars[index]).map((pillar) => pillar.id)
      );
      return {
        ...floor,
        pillars: moved,
        beams: floor.beams.map((beam) => ({
          ...beam,
          startX: movedIds.has(beam.startPillarId)
            ? moved.find((pillar) => pillar.id === beam.startPillarId)?.x ?? beam.startX
            : beam.startX,
          startY: movedIds.has(beam.startPillarId)
            ? moved.find((pillar) => pillar.id === beam.startPillarId)?.y ?? beam.startY
            : beam.startY,
          endX: movedIds.has(beam.endPillarId)
            ? moved.find((pillar) => pillar.id === beam.endPillarId)?.x ?? beam.endX
            : beam.endX,
          endY: movedIds.has(beam.endPillarId)
            ? moved.find((pillar) => pillar.id === beam.endPillarId)?.y ?? beam.endY
            : beam.endY,
        })),
      };
    });
    if (get().isDragging) {
      const flat = flattenFloors(floors);
      set({ floors, pillars: flat.pillars, beams: flat.beams });
      return;
    }
    commitFloors(get, set, building, floors);
  },

  setInspectorOpen: (open) => set({ inspectorOpen: open }),
  setFloorCreationOpen: (open) => set({ floorCreationOpen: open }),

  updatePillar: (floorIdOrMemberId, pillarIdOrPatch, patchArg, scopeArg) => {
    const state = get();
    const legacyCall = typeof pillarIdOrPatch !== "string";
    const floorId = legacyCall ? state.activeFloorId : floorIdOrMemberId;
    const pillarId = legacyCall ? floorIdOrMemberId : (pillarIdOrPatch as string);
    const patch = legacyCall ? (pillarIdOrPatch as Partial<Pillar>) : patchArg ?? {};
    const scope: EditScope = legacyCall ? "this_member" : scopeArg ?? "this_member";
    const targetFloor = floorById(state.floors, floorId);
    const target = targetFloor?.pillars.find((pillar) => pillar.id === pillarId);
    if (!targetFloor || !target) return;
    state.pushHistory();
    const targetStackId = target.stackId;
    const shouldUpdate = (floor: Floor, pillar: Pillar) => {
      if (scope === "selected_members") {
        return state.multiSelectedPillarIds.includes(pillar.id) || pillar.id === pillarId;
      }
      if (scope === "stack_all_floors") return pillar.stackId === targetStackId;
      if (scope === "stack_upward") {
        return pillar.stackId === targetStackId && floor.floorNumber >= targetFloor.floorNumber;
      }
      return floor.id === floorId && pillar.id === pillarId;
    };
    const floors = state.floors.map((floor) => ({
      ...floor,
      pillars: floor.pillars.map((pillar) => {
        if (!shouldUpdate(floor, pillar)) return pillar;
        const next = { ...pillar, ...patch, floorId: floor.id, baseElevation: floor.elevation };
        return {
          ...next,
          loadCapacity: pillarLoadCapacity(
            next.width,
            next.depth,
            next.height,
            next.material === "steel" ? "steel" : "concrete"
          ),
        };
      }),
    }));
    commitFloors(get, set, state.building, floors, {
      selectedPillarId: pillarId,
    });
  },

  updateBeam: (floorIdOrMemberId, beamIdOrPatch, patchArg) => {
    const state = get();
    const legacyCall = typeof beamIdOrPatch !== "string";
    const floorId = legacyCall ? state.activeFloorId : floorIdOrMemberId;
    const beamId = legacyCall ? floorIdOrMemberId : (beamIdOrPatch as string);
    const patch = legacyCall ? (beamIdOrPatch as Partial<Beam>) : patchArg ?? {};
    const floor = floorById(state.floors, floorId);
    const existingBeam = floor?.beams.find((beam) => beam.id === beamId);
    if (!existingBeam) return;
    if (
      (patch.startPillarId ?? existingBeam.startPillarId) ===
      (patch.endPillarId ?? existingBeam.endPillarId)
    ) return;
    state.pushHistory();
    const floors = state.floors.map((item) => {
      if (item.id !== floorId) return item;
      const pillarsById = new Map(item.pillars.map((pillar) => [pillar.id, pillar]));
      return {
        ...item,
        beams: item.beams.map((beam) => {
          if (beam.id !== beamId) return beam;
          const next = { ...beam, ...patch, floorId: item.id };
          const start = pillarsById.get(next.startPillarId);
          const end = pillarsById.get(next.endPillarId);
          const startX = start?.x ?? next.startX;
          const startY = start?.y ?? next.startY;
          const endX = end?.x ?? next.endX;
          const endY = end?.y ?? next.endY;
          const length = Math.hypot(endX - startX, endY - startY);
          return {
            ...next,
            startX,
            startY,
            endX,
            endY,
            length,
            loadBearing: beamLoadBearing(next.width, next.depth, length),
          };
        }),
      };
    });
    commitFloors(get, set, state.building, floors, { selectedBeamId: beamId });
  },

  updateSlab: (floorIdOrMemberId, slabIdOrPatch, patchArg) => {
    const state = get();
    const legacyCall = typeof slabIdOrPatch !== "string";
    const floorId = legacyCall ? state.activeFloorId : floorIdOrMemberId;
    const slabId = legacyCall ? floorIdOrMemberId : (slabIdOrPatch as string);
    const patch = legacyCall ? (slabIdOrPatch as Partial<Slab>) : patchArg ?? {};
    const floor = floorById(state.floors, floorId);
    if (!floor?.slabs.some((slab) => slab.id === slabId)) return;
    state.pushHistory();
    const floors = state.floors.map((item) =>
      item.id !== floorId
        ? item
        : {
            ...item,
            slabs: item.slabs.map((slab) =>
              slab.id === slabId ? { ...slab, ...patch, floorId: item.id } : slab
            ),
          }
    );
    commitFloors(get, set, state.building, floors, { selectedSlabId: slabId });
  },

  updateWall: (id, patch) => {
    get().pushHistory();
    const floorPlates = get().floorPlates.map((p) => ({
      ...p,
      walls: p.walls.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    }));
    set({ floorPlates, selectedWallId: id });
    scheduleCommitStructure(get, set, { selectedWallId: id });
  },

  updateStair: (id, patch) => {
    get().pushHistory();
    const floorH = get().building.floorHeight;
    const floorPlates = get().floorPlates.map((p) => ({
      ...p,
      stairs: p.stairs.map((s) => {
        if (s.id !== id) return s;
        let next = { ...s, ...patch };
        if (patch.stepCount != null) {
          const geo = computeStairFromSteps(
            floorH,
            patch.stepCount,
            patch.treadMm ?? s.treadMm
          );
          next = {
            ...next,
            stepCount: geo.stepCount,
            riseMm: geo.riseMm,
            treadMm: geo.treadMm,
            depth: patch.depth ?? geo.depthM,
          };
        } else if (patch.riseMm != null && patch.stepCount === undefined) {
          // Keep step count in sync when editing target rise.
          next.stepCount = Math.min(
            30,
            Math.max(3, Math.round((floorH * 1000) / patch.riseMm))
          );
        }
        return next;
      }),
    }));
    set({ floorPlates, selectedStairId: id });
  },

  updateOpening: (id, patch) => {
    get().pushHistory();
    const floorPlates = get().floorPlates.map((p) => ({
      ...p,
      openings: p.openings.map((o) => (o.id === id ? { ...o, ...patch } : o)),
    }));
    set({ floorPlates, selectedOpeningId: id });
  },

  setSite: (patch) => {
    get().pushHistory();
    const building = {
      ...get().building,
      site: { ...defaultBuilding().site!, ...get().building.site, ...patch },
    };
    commitStructure(get, set, building, get().pillars, get().floorPlates);
  },

  setDesign: (patch) => {
    get().pushHistory();
    const building = {
      ...get().building,
      design: {
        ...defaultBuilding().design!,
        ...get().building.design,
        ...patch,
      },
    };
    commitStructure(get, set, building, get().pillars, get().floorPlates);
  },

  setFoundation: (patch) => {
    get().pushHistory();
    const building = {
      ...get().building,
      foundation: {
        ...defaultBuilding().foundation!,
        ...get().building.foundation,
        ...patch,
      },
    };
    commitStructure(get, set, building, get().pillars, get().floorPlates);
  },

  setRoof: (patch) => {
    get().pushHistory();
    const prev = get().building.roof ?? defaultBuilding().roof!;
    const next = { ...prev, ...patch };
    const building = {
      ...get().building,
      roof: next,
      roofType: next.type,
    };
    // Geometry-only for roof visuals/cost — still schedule estimate.
    set({ building });
    scheduleEstimate(get, set);
  },

  applyEngineeringRecommendation: (rec) => {
    get().pushHistory();
    const state = get();
    const next = applyRecommendation(rec, {
      pillars: state.pillars,
      beams: state.beams,
      slabs: state.slabs,
      building: state.building,
    });
    const floors = state.floors.map((floor) => ({
      ...floor,
      pillars: floor.pillars.map((member) =>
        next.pillars.find((item) => item.id === member.id) ?? member
      ),
      beams: floor.beams.map((member) =>
        next.beams.find((item) => item.id === member.id) ?? member
      ),
      slabs: floor.slabs.map((member) =>
        next.slabs.find((item) => item.id === member.id) ?? member
      ),
    }));
    commitFloors(get, set, next.building, floors);
  },

  applyDesignOption: (opt) => {
    get().pushHistory();
    const patch = opt.applyPatch as Record<string, unknown>;
    if (opt.kind === "column") {
      const floors = get().floors.map((floor) => ({
        ...floor,
        pillars: floor.pillars.map((pillar) =>
          pillar.id === opt.memberId ? ({ ...pillar, ...patch } as Pillar) : pillar
        ),
      }));
      commitFloors(get, set, get().building, floors, {
        selectedPillarId: opt.memberId,
      });
      return;
    }
    if (opt.kind === "beam") {
      const floors = get().floors.map((floor) => ({
        ...floor,
        beams: floor.beams.map((beam) =>
          beam.id === opt.memberId ? ({ ...beam, ...patch } as Beam) : beam
        ),
      }));
      commitFloors(get, set, get().building, floors, {
        selectedBeamId: opt.memberId,
      });
      return;
    }
    if (opt.kind === "slab") {
      const floors = get().floors.map((floor) => ({
        ...floor,
        slabs: floor.slabs.map((slab) =>
          slab.id === opt.memberId ? ({ ...slab, ...patch } as Slab) : slab
        ),
      }));
      commitFloors(get, set, get().building, floors, {
        selectedSlabId: opt.memberId,
      });
      return;
    }
    if (opt.kind === "footing") {
      const building = {
        ...get().building,
        foundation: {
          ...get().building.foundation!,
          ...(patch as Partial<FoundationConfig>),
        },
      };
      commitStructure(get, set, building, get().pillars, get().floorPlates);
    }
  },

  refreshDesignOptions: () => {
    const s = get();
    const pillar = s.pillars.find((p) => p.id === s.selectedPillarId);
    const beam = s.beams.find((b) => b.id === s.selectedBeamId);
    const slab =
      s.slabs.find((sl) => sl.id === s.selectedSlabId) ?? s.slabs[0];
    set({
      designOptions: generateMemberDesignOptions({
        pillar: pillar ?? null,
        beam: beam ?? null,
        slab: pillar || beam ? null : slab ?? null,
        pillars: s.pillars,
        building: s.building,
      }),
    });
  },

  movePillar: (floorIdOrMemberId, pillarIdOrX, xOrY, yArg) => {
    const state = get();
    const legacyCall = typeof pillarIdOrX === "number";
    const floorId = legacyCall ? state.activeFloorId : floorIdOrMemberId;
    const pillarId = legacyCall ? floorIdOrMemberId : (pillarIdOrX as string);
    const x = legacyCall ? pillarIdOrX : xOrY;
    const y = legacyCall ? xOrY : yArg;
    const building = state.building;
    const floor = floorById(state.floors, floorId);
    const target = floor?.pillars.find((pillar) => pillar.id === pillarId);
    if (!floor || !target) return;
    if (y === undefined) return;
    const pos = clamp(building, x as number, y);
    const floors = state.floors.map((item) => {
      if (item.id !== floorId) return item;
      const pillars = item.pillars.map((pillar) =>
        pillar.id === pillarId ? { ...pillar, x: pos.x, y: pos.y } : pillar
      );
      return {
        ...item,
        pillars,
        beams: item.beams.map((beam) => ({
          ...beam,
          startX: beam.startPillarId === pillarId ? pos.x : beam.startX,
          startY: beam.startPillarId === pillarId ? pos.y : beam.startY,
          endX: beam.endPillarId === pillarId ? pos.x : beam.endX,
          endY: beam.endPillarId === pillarId ? pos.y : beam.endY,
          length: Math.hypot(
            (beam.endPillarId === pillarId ? pos.x : beam.endX) -
              (beam.startPillarId === pillarId ? pos.x : beam.startX),
            (beam.endPillarId === pillarId ? pos.y : beam.endY) -
              (beam.startPillarId === pillarId ? pos.y : beam.startY)
          ),
        })),
      };
    });
    const flat = flattenFloors(floors);
    if (state.isDragging) {
      set({ floors, pillars: flat.pillars, beams: flat.beams, selectedPillarId: pillarId });
      return;
    }
    commitFloors(get, set, building, floors, { selectedPillarId: pillarId });
  },

  moveWallBy: (id, dx, dy) => {
    const building = get().building;
    const floorPlates = get().floorPlates.map((p) => ({
      ...p,
      walls: p.walls.map((w) => {
        if (w.id !== id) return w;
        let sx = w.startX + dx;
        let sy = w.startY + dy;
        let ex = w.endX + dx;
        let ey = w.endY + dy;
        const minX = Math.min(sx, ex);
        const maxX = Math.max(sx, ex);
        const minY = Math.min(sy, ey);
        const maxY = Math.max(sy, ey);
        if (minX < 0) {
          sx -= minX;
          ex -= minX;
        }
        if (maxX > building.width) {
          const o = maxX - building.width;
          sx -= o;
          ex -= o;
        }
        if (minY < 0) {
          sy -= minY;
          ey -= minY;
        }
        if (maxY > building.length) {
          const o = maxY - building.length;
          sy -= o;
          ey -= o;
        }
        return { ...w, startX: sx, startY: sy, endX: ex, endY: ey };
      }),
    }));
    if (get().isDragging) {
      set({ floorPlates });
      return;
    }
    commitStructure(get, set, building, get().pillars, floorPlates);
  },

  moveStair: (id, x, y) => {
    const building = get().building;
    const pos = clamp(building, x, y);
    const floorPlates = get().floorPlates.map((p) => ({
      ...p,
      stairs: p.stairs.map((s) =>
        s.id === id ? { ...s, x: pos.x, y: pos.y } : s
      ),
    }));
    if (get().isDragging) {
      set({ floorPlates });
      return;
    }
    commitStructure(get, set, building, get().pillars, floorPlates);
  },

  nudgeSelected: (dx, dy) => {
    const {
      selectedPillarId,
      selectedWallId,
      selectedStairId,
      multiSelectedPillarIds,
      isDragging,
    } = get();
    if (isDragging) return;
    if (multiSelectedPillarIds.length) {
      get().pushHistory();
      get().moveSelectedGroupBy(dx, dy);
      return;
    }
    if (selectedPillarId) {
      const p = get().pillars.find((x) => x.id === selectedPillarId);
      if (!p) return;
      get().pushHistory();
      get().movePillar(selectedPillarId, p.x + dx, p.y + dy);
      return;
    }
    if (selectedWallId) {
      get().pushHistory();
      get().moveWallBy(selectedWallId, dx, dy);
      return;
    }
    if (selectedStairId) {
      const plate = get().floorPlates.find((p) =>
        p.stairs.some((s) => s.id === selectedStairId)
      );
      const stair = plate?.stairs.find((s) => s.id === selectedStairId);
      if (!stair) return;
      get().pushHistory();
      get().moveStair(selectedStairId, stair.x + dx, stair.y + dy);
    }
  },

  addPillar: (floorIdOrX, xOrY, yArg) => {
    const state = get();
    const legacyCall = typeof floorIdOrX === "number";
    const floorId = legacyCall ? state.activeFloorId : floorIdOrX;
    const x = legacyCall ? floorIdOrX : xOrY;
    const y = legacyCall ? xOrY : yArg;
    if (y === undefined) return;
    const floor = floorById(state.floors, floorId);
    if (!floor) return;
    state.pushHistory();
    const building = state.building;
    const pos = clamp(building, x, y);
    const aligned = state.floors
      .flatMap((item) => item.pillars)
      .find((pillar) => Math.hypot(pillar.x - pos.x, pillar.y - pos.y) <= 0.02);
    const nameIndex = floor.pillars.length + 1;
    const pillar: Pillar = {
      id: uid("p"),
      floorId,
      stackId: aligned?.stackId ?? uid("stack"),
      name: `P${nameIndex}`,
      x: pos.x,
      y: pos.y,
      width: 0.4,
      depth: 0.4,
      height: building.floorHeight,
      baseElevation: floor.elevation,
      material: "concrete",
      loadCapacity: pillarLoadCapacity(0.4, 0.4, building.floorHeight),
    };
    const floors = state.floors.map((item) =>
      item.id === floorId
        ? { ...item, pillars: [...item.pillars, pillar] }
        : item
    );
    commitFloors(get, set, building, floors, {
      selectedPillarId: pillar.id,
      tool: "select",
    });
  },

  removePillar: (floorIdOrMemberId, pillarIdArg) => {
    const state = get();
    const legacyCall = pillarIdArg === undefined;
    const floorId = legacyCall ? state.activeFloorId : floorIdOrMemberId;
    const pillarId = legacyCall ? floorIdOrMemberId : pillarIdArg;
    const floor = floorById(state.floors, floorId);
    if (!floor?.pillars.some((pillar) => pillar.id === pillarId)) return;
    state.pushHistory();
    const floors = state.floors.map((item) => {
      if (item.id !== floorId) return item;
      const beamIds = new Set(
        item.beams
          .filter(
            (beam) =>
              beam.startPillarId === pillarId || beam.endPillarId === pillarId
          )
          .map((beam) => beam.id)
      );
      return {
        ...item,
        pillars: item.pillars.filter((pillar) => pillar.id !== pillarId),
        beams: item.beams.filter((beam) => !beamIds.has(beam.id)),
      };
    });
    commitFloors(get, set, state.building, floors, {
      selectedPillarId: state.selectedPillarId === pillarId ? null : state.selectedPillarId,
    });
  },

  addBeam: (floorId, startPillarId, endPillarId) => {
    const state = get();
    const floor = floorById(state.floors, floorId);
    const start = floor?.pillars.find((pillar) => pillar.id === startPillarId);
    const end = floor?.pillars.find((pillar) => pillar.id === endPillarId);
    if (!floor || !start || !end || start.id === end.id) return;
    state.pushHistory();
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    const beam: Beam = {
      id: uid("b"),
      floorId,
      name: `B${floor.beams.length + 1}`,
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y,
      width: 0.3,
      depth: 0.5,
      length,
      material: "concrete",
      loadBearing: beamLoadBearing(0.3, 0.5, length),
      height: floor.height,
      startPillarId,
      endPillarId,
    };
    const floors = state.floors.map((item) =>
      item.id === floorId ? { ...item, beams: [...item.beams, beam] } : item
    );
    commitFloors(get, set, state.building, floors, { selectedBeamId: beam.id });
  },

  removeBeam: (floorId, beamId) => {
    const state = get();
    const floor = floorById(state.floors, floorId);
    if (!floor?.beams.some((beam) => beam.id === beamId)) return;
    state.pushHistory();
    const floors = state.floors.map((item) =>
      item.id === floorId
        ? { ...item, beams: item.beams.filter((beam) => beam.id !== beamId) }
        : item
    );
    commitFloors(get, set, state.building, floors, {
      selectedBeamId: state.selectedBeamId === beamId ? null : state.selectedBeamId,
    });
  },

  addWall: (startX, startY, endX, endY) => {
    if (Math.hypot(endX - startX, endY - startY) < 0.4) return;
    get().pushHistory();
    const building = get().building;
    const floor = get().activeFloor;
    const wall: Wall = {
      id: uid("w"),
      name: `W${floor}-${(get().floorPlates.find((p) => p.floor === floor)?.walls.length ?? 0) + 1}`,
      startX,
      startY,
      endX,
      endY,
      thickness: 0.2,
      height: building.floorHeight,
      material: "brick",
      floor,
    };
    const floorPlates = get().floorPlates.map((p) =>
      p.floor === floor ? { ...p, walls: [...p.walls, wall] } : p
    );
    commitStructure(get, set, building, get().pillars, floorPlates, {
      selectedWallId: wall.id,
      wallDraftStart: null,
      tool: "select",
    });
  },

  setWallDraftStart: (p) => set({ wallDraftStart: p }),

  removeWall: (id) => {
    get().pushHistory();
    const floorPlates = get().floorPlates.map((p) => ({
      ...p,
      walls: p.walls.filter((w) => w.id !== id),
      openings: p.openings.filter((o) => o.wallId !== id),
    }));
    commitStructure(get, set, get().building, get().pillars, floorPlates, {
      selectedWallId: get().selectedWallId === id ? null : get().selectedWallId,
    });
  },

  addOpeningOnWall: (wallId, type, t) => {
    get().pushHistory();
    const floor = get().activeFloor;
    const opening: Opening = {
      id: uid("o"),
      name: `${type === "door" ? "D" : "Win"}${floor}-${Date.now() % 1000}`,
      type,
      wallId,
      t: Math.min(Math.max(t, 0.1), 0.9),
      width: type === "door" ? 1.0 : 1.2,
      height: type === "door" ? 2.1 : 1.2,
      sillHeight: type === "door" ? 0 : 0.9,
      floor,
    };
    const floorPlates = get().floorPlates.map((p) =>
      p.floor === floor ? { ...p, openings: [...p.openings, opening] } : p
    );
    commitStructure(get, set, get().building, get().pillars, floorPlates, {
      selectedOpeningId: opening.id,
      tool: "select",
    });
  },

  removeOpening: (id) => {
    get().pushHistory();
    const floorPlates = get().floorPlates.map((p) => ({
      ...p,
      openings: p.openings.filter((o) => o.id !== id),
    }));
    commitStructure(get, set, get().building, get().pillars, floorPlates, {
      selectedOpeningId:
        get().selectedOpeningId === id ? null : get().selectedOpeningId,
    });
  },

  addStair: (x, y, opts) => {
    get().pushHistory();
    const building = get().building;
    const floor = get().activeFloor;
    const pos = clamp(building, x, y);
    const steps =
      opts?.stepCount ??
      get().stairStepCount ??
      defaultStepCount(building.floorHeight);
    const geo = computeStairFromSteps(building.floorHeight, steps);
    const stair: Stair = {
      id: uid("st"),
      name: `Stair-${floor}`,
      x: pos.x,
      y: pos.y,
      width: 1.2,
      depth: geo.depthM,
      floor,
      stairType: "straight",
      stepCount: geo.stepCount,
      riseMm: geo.riseMm,
      treadMm: geo.treadMm,
      waistThickness: 0.15,
      rotationDeg: 0,
    };
    const floorPlates = get().floorPlates.map((p) =>
      p.floor === floor ? { ...p, stairs: [...p.stairs, stair] } : p
    );
    commitStructure(get, set, building, get().pillars, floorPlates, {
      selectedStairId: stair.id,
      tool: "select",
    });
  },

  removeStair: (id) => {
    get().pushHistory();
    const floorPlates = get().floorPlates.map((p) => ({
      ...p,
      stairs: p.stairs.filter((s) => s.id !== id),
    }));
    commitStructure(get, set, get().building, get().pillars, floorPlates, {
      selectedStairId:
        get().selectedStairId === id ? null : get().selectedStairId,
    });
  },

  handleCanvasClick: (x, y, hit) => {
    const tool = get().tool;
    const building = get().building;
    const pos = clamp(building, x, y);

    if (tool === "delete" && hit) {
      if (hit.kind === "pillar") get().removePillar(hit.id);
      else if (hit.kind === "wall") get().removeWall(hit.id);
      else if (hit.kind === "opening") get().removeOpening(hit.id);
      else if (hit.kind === "stair") get().removeStair(hit.id);
      return;
    }

    if (tool === "pillar") {
      get().addPillar(pos.x, pos.y);
      return;
    }

    if (tool === "stair") {
      get().addStair(pos.x, pos.y);
      return;
    }

    if (tool === "wall") {
      const draft = get().wallDraftStart;
      if (!draft) {
        set({ wallDraftStart: pos });
      } else {
        get().addWall(draft.x, draft.y, pos.x, pos.y);
      }
      return;
    }

    if ((tool === "door" || tool === "window") && hit?.kind === "wall") {
      get().addOpeningOnWall(hit.id, tool, hit.t);
      return;
    }

    if (tool === "select") {
      if (hit?.kind === "pillar") get().selectPillar(hit.id);
      else if (hit?.kind === "wall") get().selectWall(hit.id);
      else get().clearSelection();
    }
  },

  applySuggestion: (suggestion) => {
    get().pushHistory();
    const building = get().building;
    const floor = floorById(get().floors, get().activeFloorId);
    if (!floor) return;
    const pillars = generatePillarGrid(
      building,
      suggestion.gridCols,
      suggestion.gridRows,
      suggestion.pillarWidth,
      suggestion.pillarDepth,
      1,
      floor.id,
      floor.elevation
    );
    const nextFloor = {
      ...floor,
      pillars,
      beams: generateBeamsFromPillars(pillars, 0.3, 0.5, floor.height, floor.id),
    };
    commitFloors(get, set, building, get().floors.map((item) => item.id === floor.id ? nextFloor : item), {
      selectedPillarId: pillars[0]?.id ?? null,
    });
  },

  setLeftOpen: (open) => set({ leftOpen: open }),
  setRightOpen: (open) => set({ rightOpen: open }),

  regenerateFromGrid: (cols, rows, size = 0.4) => {
    get().pushHistory();
    const building = get().building;
    const floor = floorById(get().floors, get().activeFloorId);
    if (!floor) return;
    const pillars = generatePillarGrid(
      building,
      cols,
      rows,
      size,
      size,
      1,
      floor.id,
      floor.elevation
    );
    const nextFloor = {
      ...floor,
      pillars,
      beams: generateBeamsFromPillars(pillars, 0.3, 0.5, floor.height, floor.id),
    };
    commitFloors(get, set, building, get().floors.map((item) => item.id === floor.id ? nextFloor : item), {
      selectedPillarId: pillars[0]?.id ?? null,
    });
  },
}));
