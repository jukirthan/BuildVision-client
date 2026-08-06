"use client";

import { create } from "zustand";
import { generateMemberDesignOptions } from "@/lib/ai-design-options";
import { generateLayoutSuggestions } from "@/lib/ai-recommendations";
import { estimateMaterials } from "@/lib/cost-estimator";
import {
  applyRecommendation,
  runDependencyEngine,
} from "@/lib/engineering/dependency-engine";
import {
  computeStairFromSteps,
  defaultStepCount,
} from "@/lib/stair-geometry";
import {
  createInitialStructure,
  defaultBuilding,
  emptyFloorPlate,
  generatePerimeterWalls,
  generatePillarGrid,
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
  activeFloor: number;
  pillars: Pillar[];
  beams: ReturnType<typeof recalculateStructure>["beams"];
  slabs: ReturnType<typeof recalculateStructure>["slabs"];
  floorPlates: FloorPlate[];
  estimate: MaterialEstimate;
  suggestions: LayoutSuggestion[];
};

interface StructureStore {
  building: BuildingConfig;
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
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  setBuilding: (patch: Partial<BuildingConfig>) => void;
  setActiveFloor: (floor: number) => void;
  addFloor: () => void;
  removeFloor: (floor?: number) => void;
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
  updatePillar: (id: string, patch: Partial<Pillar>) => void;
  updateBeam: (id: string, patch: Partial<Beam>) => void;
  updateSlab: (id: string, patch: Partial<Slab>) => void;
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
  movePillar: (id: string, x: number, y: number) => void;
  moveWallBy: (id: string, dx: number, dy: number) => void;
  moveStair: (id: string, x: number, y: number) => void;
  nudgeSelected: (dx: number, dy: number) => void;
  addPillar: (x: number, y: number) => void;
  removePillar: (id: string) => void;
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
}

const MAX_HISTORY = 40;

function cloneSnapshot(state: {
  building: BuildingConfig;
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
});

/** Debounced live cost — keeps inspector edits from thrashing the main thread. */
let estimateTimer: ReturnType<typeof setTimeout> | null = null;
/** Debounced full structure rebuild after property-panel patches. */
let structureDebounceTimer: ReturnType<typeof setTimeout> | null = null;

type RebuildGet = () => {
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
      estimate: estimateMaterials(
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

function rebuild(
  get: RebuildGet,
  building: BuildingConfig,
  pillars: Pillar[],
  floorPlates: FloorPlate[],
  options?: { footprintChanged?: boolean }
) {
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
    const { pillars, beams, slabs } = createInitialStructure();
    const floorPlates = Array.from({ length: building.floors }, (_, i) => {
      const floor = i + 1;
      const walls = generatePerimeterWalls(building, floor);
      const openings: Opening[] = [];
      if (walls[0]) {
        openings.push({
          id: uid("o"),
          name: `D${floor}-1`,
          type: "door",
          wallId: walls[0].id,
          t: 0.5,
          width: 1.0,
          height: 2.1,
          sillHeight: 0,
          floor,
        });
      }
      if (walls[1]) {
        openings.push({
          id: uid("o"),
          name: `Win${floor}-1`,
          type: "window",
          wallId: walls[1].id,
          t: 0.35,
          width: 1.2,
          height: 1.2,
          sillHeight: 0.9,
          floor,
        });
      }
      const stairGeo = computeStairFromSteps(
        building.floorHeight,
        defaultStepCount(building.floorHeight)
      );
      const stairs: Stair[] =
        floor < building.floors
          ? [
              {
                id: uid("st"),
                name: `Stair-${floor}`,
                x: building.width - 3,
                y: building.length - 4,
                width: 1.2,
                depth: stairGeo.depthM,
                floor,
                stairType: "straight",
                stepCount: stairGeo.stepCount,
                riseMm: stairGeo.riseMm,
                treadMm: stairGeo.treadMm,
                waistThickness: 0.15,
                rotationDeg: 0,
              },
            ]
          : [];
      return { floor, walls, openings, stairs };
    });

    set({
      building,
      pillars,
      beams,
      slabs,
      floorPlates,
      estimate: estimateMaterials(
        pillars,
        beams,
        slabs,
        floorPlates,
        building.floors,
        building
      ),
      suggestions: generateLayoutSuggestions(building),
      designOptions: generateMemberDesignOptions({
        pillar: pillars[0] ?? null,
        beam: null,
        slab: null,
        pillars,
        building,
      }),
      selectedPillarId: pillars[0]?.id ?? null,
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
      floors: Math.min(20, Math.max(1, meta.floors ?? 3)),
      floorHeight: meta.floorHeight ?? 3.5,
    };
    const pillars = generatePillarGrid(building, 4, 3, 0.4, 0.4);
    const { beams, slabs } = recalculateStructure(building, pillars);
    const floorPlates = Array.from({ length: building.floors }, (_, i) =>
      emptyFloorPlate(i + 1, building)
    );
    set({
      building,
      pillars,
      beams,
      slabs,
      floorPlates,
      estimate: estimateMaterials(
        pillars,
        beams,
        slabs,
        floorPlates,
        building.floors,
        building
      ),
      suggestions: generateLayoutSuggestions(building),
      designOptions: generateMemberDesignOptions({
        pillar: pillars[0] ?? null,
        beam: null,
        slab: null,
        pillars,
        building,
      }),
      selectedPillarId: pillars[0]?.id ?? null,
      activeFloor: 1,
      tool: "select",
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
    if (building.floors > 20) building.floors = 20;
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
    const rebuilt = rebuild(get, building, get().pillars, floorPlates, {
      footprintChanged,
    });
    const activeFloor = Math.min(get().activeFloor, building.floors);
    set({ ...rebuilt, activeFloor });
    scheduleEstimate(get, set);
  },

  setActiveFloor: (floor) =>
    set({
      activeFloor: Math.min(Math.max(floor, 1), get().building.floors),
      wallDraftStart: null,
    }),

  addFloor: () => {
    get().pushHistory();
    const prevFloors = get().building.floors;
    const building = {
      ...get().building,
      floors: Math.min(prevFloors + 1, 20),
    };
    // Duplicate last floor plate (walls/openings/stairs) onto the new storey
    const lastPlate =
      get().floorPlates.find((p) => p.floor === prevFloors) ??
      get().floorPlates[get().floorPlates.length - 1];
    const newFloor = building.floors;
    const cloned: FloorPlate = lastPlate
      ? {
          floor: newFloor,
          walls: lastPlate.walls.map((w) => ({
            ...w,
            id: uid("w"),
            floor: newFloor,
            height: building.floorHeight,
          })),
          openings: lastPlate.openings.map((o) => ({
            ...o,
            id: uid("o"),
            floor: newFloor,
          })),
          stairs:
            newFloor < building.floors
              ? lastPlate.stairs.map((s) => ({
                  ...s,
                  id: uid("st"),
                  floor: newFloor,
                }))
              : [],
        }
      : emptyFloorPlate(newFloor, building);
    // Remap opening wallIds to cloned walls by index
    if (lastPlate) {
      cloned.openings = cloned.openings.map((o, i) => {
        const srcWall = lastPlate.walls.find((w) => w.id === lastPlate.openings[i]?.wallId);
        const idx = srcWall ? lastPlate.walls.indexOf(srcWall) : 0;
        return { ...o, wallId: cloned.walls[idx]?.id ?? o.wallId };
      });
    }
    const floorPlates = [...get().floorPlates, cloned];
    commitStructure(get, set, building, get().pillars, floorPlates, {
      activeFloor: building.floors,
      wallDraftStart: null,
    });
  },

  removeFloor: (floor) => {
    const target = floor ?? get().activeFloor;
    if (get().building.floors <= 1) return;
    get().pushHistory();
    const building = { ...get().building, floors: get().building.floors - 1 };
    const floorPlates = get()
      .floorPlates.filter((p) => p.floor !== target)
      .map((p, idx) => ({
        ...p,
        floor: idx + 1,
        walls: p.walls.map((w) => ({ ...w, floor: idx + 1 })),
        openings: p.openings.map((o) => ({ ...o, floor: idx + 1 })),
        stairs: p.stairs.map((s) => ({ ...s, floor: idx + 1 })),
      }));
    commitStructure(get, set, building, get().pillars, floorPlates, {
      activeFloor: Math.min(get().activeFloor, building.floors),
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
    const pillars = get().pillars.map((p) => {
      if (!idSet.has(p.id)) return p;
      const pos = clamp(building, p.x + dx, p.y + dy);
      return { ...p, x: pos.x, y: pos.y };
    });
    if (get().isDragging) {
      set({ pillars });
      return;
    }
    commitStructure(get, set, building, pillars, get().floorPlates);
  },

  setInspectorOpen: (open) => set({ inspectorOpen: open }),

  updatePillar: (id, patch) => {
    get().pushHistory();
    const pillars = get().pillars.map((p) => {
      if (p.id !== id) return p;
      const next = { ...p, ...patch };
      next.loadCapacity = pillarLoadCapacity(
        next.width,
        next.depth,
        next.height,
        next.material === "steel" ? "steel" : "concrete"
      );
      return next;
    });
    // Immediate geometry for snappy inspector; debounce engine + cost.
    set({ pillars, selectedPillarId: id });
    scheduleCommitStructure(get, set, { selectedPillarId: id });
  },

  updateBeam: (id, patch) => {
    get().pushHistory();
    const beams = get().beams.map((b) =>
      b.id === id ? { ...b, ...patch } : b
    );
    set({ beams, selectedBeamId: id });
    scheduleCommitStructure(get, set, { selectedBeamId: id });
  },

  updateSlab: (id, patch) => {
    get().pushHistory();
    const slabs = get().slabs.map((s) =>
      s.id === id ? { ...s, ...patch } : s
    );
    set({ slabs, selectedSlabId: id });
    scheduleCommitStructure(get, set, { selectedSlabId: id });
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
    const next = applyRecommendation(rec, {
      pillars: get().pillars,
      beams: get().beams,
      slabs: get().slabs,
      building: get().building,
    });
    set({ pillars: next.pillars, beams: next.beams, slabs: next.slabs });
    commitStructure(get, set, next.building, next.pillars, get().floorPlates);
  },

  applyDesignOption: (opt) => {
    get().pushHistory();
    const patch = opt.applyPatch as Record<string, unknown>;
    if (opt.kind === "column") {
      const pillars = get().pillars.map((p) =>
        p.id === opt.memberId ? ({ ...p, ...patch } as Pillar) : p
      );
      commitStructure(get, set, get().building, pillars, get().floorPlates, {
        selectedPillarId: opt.memberId,
      });
      return;
    }
    if (opt.kind === "beam") {
      const beams = get().beams.map((b) =>
        b.id === opt.memberId ? ({ ...b, ...patch } as Beam) : b
      );
      set({ beams });
      commitStructure(get, set, get().building, get().pillars, get().floorPlates, {
        selectedBeamId: opt.memberId,
      });
      return;
    }
    if (opt.kind === "slab") {
      const slabs = get().slabs.map((s) =>
        s.id === opt.memberId ? ({ ...s, ...patch } as Slab) : s
      );
      set({ slabs });
      commitStructure(get, set, get().building, get().pillars, get().floorPlates, {
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

  movePillar: (id, x, y) => {
    // History is recorded when drag starts via setDragging(true).
    const building = get().building;
    const pos = clamp(building, x, y);
    const pillars = get().pillars.map((p) =>
      p.id === id ? { ...p, x: pos.x, y: pos.y } : p
    );
    // During drag: update positions only. Beams/cost rebuild on pointer up.
    if (get().isDragging) {
      set({ pillars });
      return;
    }
    commitStructure(get, set, building, pillars, get().floorPlates);
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

  addPillar: (x, y) => {
    get().pushHistory();
    const building = get().building;
    const pos = clamp(building, x, y);
    const pillar: Pillar = {
      id: uid("p"),
      name: `P${get().pillars.length + 1}`,
      x: pos.x,
      y: pos.y,
      width: 0.4,
      depth: 0.4,
      height: building.floorHeight,
      material: "concrete",
      loadCapacity: pillarLoadCapacity(0.4, 0.4, building.floorHeight),
    };
    commitStructure(
      get,
      set,
      building,
      [...get().pillars, pillar],
      get().floorPlates,
      {
        selectedPillarId: pillar.id,
        tool: "select",
      }
    );
  },

  removePillar: (id) => {
    get().pushHistory();
    const pillars = get().pillars.filter((p) => p.id !== id);
    commitStructure(get, set, get().building, pillars, get().floorPlates, {
      selectedPillarId:
        get().selectedPillarId === id ? null : get().selectedPillarId,
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
    const pillars = generatePillarGrid(
      building,
      suggestion.gridCols,
      suggestion.gridRows,
      suggestion.pillarWidth,
      suggestion.pillarDepth
    );
    commitStructure(get, set, building, pillars, get().floorPlates, {
      selectedPillarId: pillars[0]?.id ?? null,
    });
  },

  setLeftOpen: (open) => set({ leftOpen: open }),
  setRightOpen: (open) => set({ rightOpen: open }),

  regenerateFromGrid: (cols, rows, size = 0.4) => {
    get().pushHistory();
    const building = get().building;
    const pillars = generatePillarGrid(building, cols, rows, size, size);
    commitStructure(get, set, building, pillars, get().floorPlates, {
      selectedPillarId: pillars[0]?.id ?? null,
    });
  },
}));
