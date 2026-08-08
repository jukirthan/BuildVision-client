import type {
  Beam,
  BuildingConfig,
  FloorPlate,
  Opening,
  Pillar,
  Slab,
} from "@/types/structure";

export type ArchitecturalOutputPayload = {
  project: string;
  building: BuildingConfig;
  pillars: Pillar[];
  beams: Beam[];
  floorPlates: FloorPlate[];
  activeFloor: number;
  slabs?: Slab[];
};

export type PlanRoom = {
  id: string;
  name: string;
  code: string;
  kind: "living" | "bedroom" | "kitchen" | "service";
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
};

export type PlanDimension = {
  id: string;
  label: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  offset: number;
  axis: "horizontal" | "vertical";
};

export type ElectricalPoint = {
  id: string;
  x: number;
  y: number;
  kind: "light" | "socket" | "switch" | "panel";
  label: string;
};

export type PlumbingPoint = {
  id: string;
  x: number;
  y: number;
  kind: "sink" | "wc" | "floor-drain" | "riser" | "inspection";
  label: string;
};

export type PlumbingRoute = {
  id: string;
  kind: "supply" | "waste" | "drainage";
  points: Array<{ x: number; y: number }>;
  label: string;
};

export type ArchitecturalOutputModel = {
  plate: FloorPlate | undefined;
  rooms: PlanRoom[];
  dimensions: PlanDimension[];
  electrical: ElectricalPoint[];
  plumbing: PlumbingPoint[];
  plumbingRoutes: PlumbingRoute[];
  notes: string[];
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function room(
  id: string,
  name: string,
  code: string,
  kind: PlanRoom["kind"],
  x: number,
  y: number,
  width: number,
  height: number
): PlanRoom {
  return {
    id,
    name,
    code,
    kind,
    x,
    y,
    width,
    height,
    area: Math.max(0, width * height),
  };
}

/**
 * Builds presentation annotations from the modeled envelope. The current
 * editor stores structural walls and openings, not a separate room/MEP BIM
 * graph, so these are deliberately marked as concept zoning in the output.
 */
export function deriveArchitecturalOutput(
  payload: ArchitecturalOutputPayload
): ArchitecturalOutputModel {
  const { building } = payload;
  const plate =
    payload.floorPlates.find((item) => item.floor === payload.activeFloor) ??
    payload.floorPlates[0];
  const inset = clamp(Math.min(building.width, building.length) * 0.04, 0.3, 0.6);
  const innerWidth = Math.max(building.width - inset * 2, 1.8);
  const innerLength = Math.max(building.length - inset * 2, 1.8);
  const splitX = inset + innerWidth * 0.58;
  const splitY = inset + innerLength * 0.58;
  const gap = clamp(Math.min(building.width, building.length) * 0.012, 0.08, 0.18);
  const leftWidth = Math.max(splitX - inset - gap, 0.8);
  const rightWidth = Math.max(building.width - splitX - inset - gap, 0.8);
  const topHeight = Math.max(splitY - inset - gap, 0.8);
  const bottomHeight = Math.max(building.length - splitY - inset - gap, 0.8);

  const rooms: PlanRoom[] = [
    room("living", "Living / Dining", "L/D", "living", inset, inset, leftWidth, topHeight),
    room("kitchen", "Kitchen", "K", "kitchen", splitX + gap, inset, rightWidth, topHeight),
    room("bedroom", "Bedroom", "BED", "bedroom", inset, splitY + gap, leftWidth, bottomHeight),
    room("service", "Bath / Services", "S", "service", splitX + gap, splitY + gap, rightWidth, bottomHeight),
  ];

  const dimensions: PlanDimension[] = [
    { id: "overall-width", label: `${building.width.toFixed(2)} m`, x1: 0, y1: 0, x2: building.width, y2: 0, offset: 1.25, axis: "horizontal" },
    { id: "overall-length", label: `${building.length.toFixed(2)} m`, x1: building.width, y1: 0, x2: building.width, y2: building.length, offset: 1.25, axis: "vertical" },
    { id: "living-width", label: `${leftWidth.toFixed(2)} m`, x1: inset, y1: inset, x2: splitX - gap, y2: inset, offset: -0.55, axis: "horizontal" },
    { id: "service-depth", label: `${bottomHeight.toFixed(2)} m`, x1: splitX + gap, y1: splitY + gap, x2: splitX + gap, y2: building.length - inset, offset: 0.55, axis: "vertical" },
  ];

  const electrical: ElectricalPoint[] = [];
  rooms.forEach((space, index) => {
    electrical.push({
      id: `${space.id}-light`,
      x: space.x + space.width / 2,
      y: space.y + space.height / 2,
      kind: "light",
      label: `L${index + 1}`,
    });
    electrical.push({
      id: `${space.id}-switch`,
      x: space.x + 0.28,
      y: space.y + 0.28,
      kind: "switch",
      label: `S${index + 1}`,
    });
    electrical.push({
      id: `${space.id}-socket`,
      x: space.x + space.width - 0.28,
      y: space.y + space.height - 0.28,
      kind: "socket",
      label: `P${index + 1}`,
    });
  });
  electrical.push({
    id: "main-panel",
    x: clamp(splitX + 0.35, 0.35, building.width - 0.35),
    y: clamp(inset + 0.35, 0.35, building.length - 0.35),
    kind: "panel",
    label: "DB",
  });

  const kitchen = rooms[1];
  const service = rooms[3];
  const plumbing: PlumbingPoint[] = [
    { id: "kitchen-sink", x: kitchen.x + kitchen.width * 0.22, y: kitchen.y + kitchen.height * 0.27, kind: "sink", label: "SK" },
    { id: "service-wc", x: service.x + service.width * 0.32, y: service.y + service.height * 0.36, kind: "wc", label: "WC" },
    { id: "service-drain", x: service.x + service.width * 0.72, y: service.y + service.height * 0.72, kind: "floor-drain", label: "FD" },
    { id: "soil-riser", x: service.x + service.width * 0.82, y: service.y + 0.16, kind: "riser", label: "SVP" },
    { id: "inspection", x: building.width + 0.65, y: building.length * 0.72, kind: "inspection", label: "IC" },
  ];
  const plumbingRoutes: PlumbingRoute[] = [
    {
      id: "cold-water",
      kind: "supply",
      points: [
        { x: building.width + 0.65, y: building.length * 0.72 },
        { x: service.x + service.width * 0.82, y: service.y + 0.16 },
        { x: kitchen.x + kitchen.width * 0.22, y: kitchen.y + kitchen.height * 0.27 },
      ],
      label: "CW",
    },
    {
      id: "soil-drain",
      kind: "drainage",
      points: [
        { x: service.x + service.width * 0.32, y: service.y + service.height * 0.36 },
        { x: service.x + service.width * 0.82, y: service.y + 0.16 },
        { x: building.width + 0.65, y: building.length * 0.72 },
      ],
      label: "100Ø S/W",
    },
    {
      id: "waste-branch",
      kind: "waste",
      points: [
        { x: service.x + service.width * 0.72, y: service.y + service.height * 0.72 },
        { x: service.x + service.width * 0.82, y: service.y + 0.16 },
      ],
      label: "75Ø W",
    },
  ];

  return {
    plate,
    rooms,
    dimensions,
    electrical,
    plumbing,
    plumbingRoutes,
    notes: [
      "Room names and MEP symbols are concept-level annotations generated from the modeled envelope.",
      "Verify final architectural, electrical, plumbing and drainage layouts with a licensed consultant before construction.",
    ],
  };
}

export function getOpeningWall(
  opening: Opening,
  walls: NonNullable<FloorPlate>["walls"]
) {
  return walls.find((wall) => wall.id === opening.wallId);
}
