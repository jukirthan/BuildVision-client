/**
 * BuildVision AI — Reinforced concrete engineering types.
 * Units: meters (geometry), MPa (grades), kN / kNm (forces), mm for bar diameters.
 */

export type MaterialType = "concrete" | "steel" | "brick" | "glass" | "aac" | "block";

export type EditTool =
  | "select"
  | "pillar"
  | "wall"
  | "door"
  | "window"
  | "stair"
  | "delete";

export type ViewMode = "orbit" | "inside";

export type MemberStatus = "safe" | "warning" | "fail";

export type ConcreteGrade = "M20" | "M25" | "M30" | "M35" | "M40";
export type SteelGrade = "Fe415" | "Fe500" | "Fe550";

export type SoilType =
  | "soft_clay"
  | "stiff_clay"
  | "sandy"
  | "gravel"
  | "rock"
  | "filled";

export type EarthquakeZone = "II" | "III" | "IV" | "V";
export type WindZone = "A" | "B" | "C" | "D";

export type FoundationType =
  | "isolated"
  | "combined"
  | "strip"
  | "raft"
  | "pile";

export type SlabSystem = "one_way" | "two_way" | "flat" | "drop_panel";
export type StairType = "dog_legged" | "straight" | "spiral";
export type RoofType = "flat" | "slope";

export type SectionShape = "square" | "rectangle" | "circular";
export type StirrupShape = "square" | "rectangular" | "circular";
export type StirrupHook =
  | "90"
  | "135"
  | "closed"
  | "double"
  | "cross";

export type WallBearing = "load_bearing" | "non_load_bearing";
export type ConstructionDifficulty = "easy" | "moderate" | "hard";

/** Standard bar diameters (mm) per IS schedule. */
export const BAR_DIAMETERS_MM = [6, 8, 10, 12, 16, 20, 25, 32, 40] as const;
export type BarDiameterMm = (typeof BAR_DIAMETERS_MM)[number];

export const MAIN_BAR_DIAMETERS_MM = [8, 10, 12, 16, 20, 25, 32, 40] as const;
export const STIRRUP_DIAMETERS_MM = [6, 8, 10, 12] as const;
export const STIRRUP_SPACINGS_MM = [75, 100, 125, 150, 175, 200] as const;

export interface RebarLayer {
  diameterMm: BarDiameterMm;
  count: number;
  /** Spacing in mm (for mesh / stirrups). */
  spacingMm?: number;
}

export interface StirrupSpec {
  diameterMm: BarDiameterMm;
  spacingMm: number;
  legs: 2 | 4 | 6;
  shape?: StirrupShape;
  hook?: StirrupHook;
}

/** Zone-based tie spacing along member height/span. */
export interface RebarZone {
  diameterMm: BarDiameterMm;
  spacingMm: number;
}

export interface RebarZones {
  bottom: RebarZone;
  middle: RebarZone;
  top: RebarZone;
}

export interface DesignLoads {
  axialKN: number;
  momentXKnm: number;
  momentYKnm: number;
  shearKN: number;
  deadLoadKNm2?: number;
  liveLoadKNm2?: number;
  windLoadKN?: number;
  roofLoadKN?: number;
  wallLoadKN?: number;
  footingPressureKNm2?: number;
}

export interface MemberCheck {
  status: MemberStatus;
  utilization: number;
  capacityNote: string;
  warnings: string[];
  axialCapacityKN?: number;
  momentCapacityKNm?: number;
  shearCapacityKN?: number;
  slenderness?: number;
  safetyFactor?: number;
  deflectionMm?: number;
  punchingShearUtil?: number;
  settlementMm?: number;
}

export interface SiteConfig {
  plotWidth: number;
  plotLength: number;
  soilType: SoilType;
  /** Allowable bearing capacity kN/m² */
  bearingCapacityKNm2: number;
  groundLevel: number;
  roadLevel: number;
  orientationDeg: number;
  earthquakeZone: EarthquakeZone;
  windZone: WindZone;
  rainfallMm: number;
  floodLevel: number;
}

export interface DesignCodes {
  concreteGrade: ConcreteGrade;
  steelGrade: SteelGrade;
  clearCoverMm: number;
  designCode: "IS456" | "ACI318" | "EC2";
}

export interface FoundationConfig {
  type: FoundationType;
  thickness: number;
  width: number;
  length: number;
  pedestalHeight: number;
  concreteGrade: ConcreteGrade;
  steelGrade: SteelGrade;
  mainBars: RebarLayer;
  distributionBars: RebarLayer;
  topMesh?: RebarLayer;
  bottomMesh?: RebarLayer;
  foundationLevel?: number;
}

export interface Pillar {
  id: string;
  name: string;
  x: number;
  y: number;
  /** Section width (m) */
  width: number;
  /** Section depth (m) */
  depth: number;
  height: number;
  material: MaterialType;
  loadCapacity: number;
  floor?: number;
  concreteGrade?: ConcreteGrade;
  steelGrade?: SteelGrade;
  clearCoverMm?: number;
  shape?: SectionShape;
  rotationDeg?: number;
  longitudinalBars?: RebarLayer;
  stirrups?: StirrupSpec;
  rebarZones?: RebarZones;
  loads?: DesignLoads;
  check?: MemberCheck;
  /** Connected beam ids (dependency graph). */
  connectedBeamIds?: string[];
  footingId?: string;
}

export interface Beam {
  id: string;
  name: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
  depth: number;
  length: number;
  material: MaterialType;
  loadBearing: number;
  height: number;
  concreteGrade?: ConcreteGrade;
  steelGrade?: SteelGrade;
  topBars?: RebarLayer;
  bottomBars?: RebarLayer;
  extraBars?: RebarLayer;
  stirrups?: StirrupSpec;
  supportBars?: RebarLayer;
  spanBars?: RebarLayer;
  anchorageMm?: number;
  supportCondition?: "simply" | "continuous" | "cantilever";
  loads?: DesignLoads;
  check?: MemberCheck;
  startPillarId?: string;
  endPillarId?: string;
  supportedSlabIds?: string[];
}

export interface Slab {
  id: string;
  name: string;
  thickness: number;
  area: number;
  material: MaterialType;
  loadCapacity: number;
  width: number;
  length: number;
  centerX: number;
  centerY: number;
  system?: SlabSystem;
  topMesh?: RebarLayer;
  bottomMesh?: RebarLayer;
  steelDirection?: "x" | "y" | "both";
  finishLoadKNm2?: number;
  waterproofLayerMm?: number;
  deadLoadKNm2?: number;
  liveLoadKNm2?: number;
  openings?: SlabOpening[];
  check?: MemberCheck;
  supportingBeamIds?: string[];
}

export interface SlabOpening {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  length: number;
}

export interface Wall {
  id: string;
  name: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  thickness: number;
  height: number;
  material: MaterialType;
  floor: number;
  bearing?: WallBearing;
  hasLintel?: boolean;
  lintelDepthMm?: number;
}

export interface Opening {
  id: string;
  name: string;
  type: "door" | "window";
  wallId: string;
  t: number;
  width: number;
  height: number;
  sillHeight: number;
  floor: number;
  fireRatingHours?: number;
  glassType?: string;
  lintelDepthMm?: number;
}

export interface Stair {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  floor: number;
  stairType?: StairType;
  /** User-chosen number of risers; rise = floorHeight / stepCount */
  stepCount?: number;
  riseMm?: number;
  treadMm?: number;
  waistThickness?: number;
  /** Plan rotation around the stair centre, degrees (0–360). */
  rotationDeg?: number;
}

export interface BuildingConfig {
  name: string;
  width: number;
  length: number;
  floors: number;
  floorHeight: number;
  showFoundation: boolean;
  showAllFloors: boolean;
  site?: SiteConfig;
  design?: DesignCodes;
  foundation?: FoundationConfig;
  roofType?: RoofType;
  rotationDeg?: number;
}

export interface BoqLine {
  id: string;
  category: string;
  description: string;
  unit: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface MaterialEstimate {
  concreteVolumeM3: number;
  steelWeightKg: number;
  brickVolumeM3: number;
  concreteCost: number;
  steelCost: number;
  brickCost: number;
  labourCost: number;
  excavationCost: number;
  formworkCost: number;
  foundationCost: number;
  columnsCost: number;
  beamsCost: number;
  slabsCost: number;
  wallsCost: number;
  roofCost: number;
  totalCost: number;
  pillarCount: number;
  beamCount: number;
  slabCount: number;
  wallCount: number;
  doorCount: number;
  windowCount: number;
  stairCount: number;
  formworkM2: number;
  footingVolumeM3: number;
  excavationVolumeM3: number;
  stirrupLengthM: number;
  tieLengthM: number;
  beamLengthM: number;
  columnHeightM: number;
  slabAreaM2: number;
  brickCount: number;
  boq: BoqLine[];
}

export interface LayoutSuggestion {
  id: string;
  label: string;
  description: string;
  gridCols: number;
  gridRows: number;
  pillarWidth: number;
  pillarDepth: number;
  estimatedCost: number;
  tradeoff: string;
}

/** Multi-option AI structural design alternative for a selected member. */
export interface DesignOption {
  id: string;
  label: string;
  kind: "column" | "beam" | "slab" | "footing";
  memberId: string;
  summary: string;
  section: string;
  rebar: string;
  stirrups: string;
  safetyRating: number;
  status: MemberStatus;
  estimatedCost: number;
  steelKg: number;
  concreteM3: number;
  difficulty: ConstructionDifficulty;
  recommended: boolean;
  applyPatch: Record<string, number | string | object>;
  rationale: string;
}

export interface FloorPlate {
  floor: number;
  walls: Wall[];
  openings: Opening[];
  stairs: Stair[];
}

export type AdvisorSeverity = "info" | "recommendation" | "warning" | "critical";

export interface AdvisorMessage {
  id: string;
  severity: AdvisorSeverity;
  title: string;
  body: string;
  memberId?: string;
  memberKind?: "column" | "beam" | "slab" | "footing" | "building" | "wall";
  suggestedAction?: string;
  timestamp: number;
}

export interface EngineeringRecommendation {
  kind: "column" | "beam" | "slab" | "footing";
  memberId: string;
  reason: string;
  current: string;
  recommended: string;
  applyPatch?: Record<string, number | string>;
}

export interface ViewFlags {
  showLabels: boolean;
  showDimensions: boolean;
  /** off = hidden; selected = from selected pillar; all = structural / nearest pairs */
  dimensionMode: "off" | "selected" | "all";
  showReinforcement: boolean;
  wireframe: boolean;
  exploded: boolean;
  sectionView: boolean;
  snapToGrid: boolean;
  gridSizeM: number;
}
