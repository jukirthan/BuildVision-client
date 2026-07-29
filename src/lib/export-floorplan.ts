import type {
  Beam,
  BuildingConfig,
  FloorPlate,
  Opening,
  Pillar,
  Stair,
  Wall,
} from "@/types/structure";

export type FloorPlanPayload = {
  project: string;
  building: BuildingConfig;
  pillars: Pillar[];
  beams: Beam[];
  floorPlates: FloorPlate[];
  activeFloor: number;
};

function slug(name: string) {
  return name.replace(/\s+/g, "-").toLowerCase() || "structure";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

type Layout = {
  scale: number;
  ox: number;
  oy: number;
  drawW: number;
  drawH: number;
  canvasW: number;
  canvasH: number;
  margin: number;
};

function computeLayout(building: BuildingConfig): Layout {
  const margin = 96;
  const titleH = 72;
  const legendH = 56;
  const maxDrawW = 1400;
  const maxDrawH = 1000;
  const scale = Math.min(
    maxDrawW / Math.max(building.width, 1),
    maxDrawH / Math.max(building.length, 1)
  );
  const drawW = building.width * scale;
  const drawH = building.length * scale;
  return {
    scale,
    ox: margin,
    oy: margin + titleH,
    drawW,
    drawH,
    canvasW: Math.ceil(drawW + margin * 2),
    canvasH: Math.ceil(drawH + margin * 2 + titleH + legendH),
    margin,
  };
}

function toCanvas(
  layout: Layout,
  x: number,
  y: number
): { cx: number; cy: number } {
  // Plan Y grows "north" on screen upward? Architectural plans often Y up.
  // Keep Y increasing downward in canvas for readability with dimension text below.
  return {
    cx: layout.ox + x * layout.scale,
    cy: layout.oy + y * layout.scale,
  };
}

function wallPoint(
  wall: Wall,
  t: number
): { x: number; y: number; nx: number; ny: number; len: number } {
  const dx = wall.endX - wall.startX;
  const dy = wall.endY - wall.startY;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return {
    x: wall.startX + dx * t,
    y: wall.startY + dy * t,
    nx: -uy,
    ny: ux,
    len,
  };
}

function drawFloorPlan(
  ctx: CanvasRenderingContext2D,
  payload: FloorPlanPayload
) {
  const { building, pillars, beams, floorPlates, activeFloor, project } =
    payload;
  const plate =
    floorPlates.find((p) => p.floor === activeFloor) ?? floorPlates[0];
  const layout = computeLayout(building);
  const { scale, ox, oy, drawW, drawH, canvasW, canvasH } = layout;

  // Background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Title block
  ctx.fillStyle = "#121820";
  ctx.font = "600 28px Space Grotesk, Arial, sans-serif";
  ctx.fillText("BuildVision — 2D Floor Plan", 32, 40);
  ctx.font = "500 16px Source Sans 3, Arial, sans-serif";
  ctx.fillStyle = "#5b6570";
  ctx.fillText(
    `${project}  ·  ${building.name}  ·  Floor ${activeFloor} of ${building.floors}`,
    32,
    64
  );
  ctx.fillText(
    `Footprint ${building.width.toFixed(2)} m × ${building.length.toFixed(2)} m  ·  Scale 1:${Math.round(
      1000 / scale
    )} (approx)`,
    32,
    86
  );

  // Light grid (1m)
  ctx.save();
  ctx.beginPath();
  ctx.rect(ox, oy, drawW, drawH);
  ctx.clip();
  ctx.strokeStyle = "#e8edf2";
  ctx.lineWidth = 1;
  for (let gx = 0; gx <= building.width + 0.001; gx += 1) {
    const { cx } = toCanvas(layout, gx, 0);
    ctx.beginPath();
    ctx.moveTo(cx, oy);
    ctx.lineTo(cx, oy + drawH);
    ctx.stroke();
  }
  for (let gy = 0; gy <= building.length + 0.001; gy += 1) {
    const { cy } = toCanvas(layout, 0, gy);
    ctx.beginPath();
    ctx.moveTo(ox, cy);
    ctx.lineTo(ox + drawW, cy);
    ctx.stroke();
  }
  ctx.restore();

  // Slab / floor plate fill
  ctx.fillStyle = "#f4f7fa";
  ctx.fillRect(ox, oy, drawW, drawH);
  ctx.strokeStyle = "#121820";
  ctx.lineWidth = 2.5;
  ctx.strokeRect(ox, oy, drawW, drawH);

  // Beams
  ctx.strokeStyle = "#8b9aab";
  ctx.lineWidth = Math.max(2, 0.25 * scale);
  ctx.lineCap = "round";
  for (const beam of beams) {
    const a = toCanvas(layout, beam.startX, beam.startY);
    const b = toCanvas(layout, beam.endX, beam.endY);
    ctx.beginPath();
    ctx.moveTo(a.cx, a.cy);
    ctx.lineTo(b.cx, b.cy);
    ctx.stroke();
  }

  // Walls
  const walls = plate?.walls ?? [];
  for (const wall of walls) {
    const a = toCanvas(layout, wall.startX, wall.startY);
    const b = toCanvas(layout, wall.endX, wall.endY);
    ctx.strokeStyle = "#6b4f3a";
    ctx.lineWidth = Math.max(4, wall.thickness * scale);
    ctx.lineCap = "butt";
    ctx.beginPath();
    ctx.moveTo(a.cx, a.cy);
    ctx.lineTo(b.cx, b.cy);
    ctx.stroke();
  }

  // Openings (doors / windows) — break wall visually
  const openings = plate?.openings ?? [];
  const wallMap = new Map(walls.map((w) => [w.id, w]));
  for (const opening of openings) {
    drawOpening(ctx, layout, opening, wallMap.get(opening.wallId));
  }

  // Stairs
  for (const stair of plate?.stairs ?? []) {
    drawStair(ctx, layout, stair);
  }

  // Pillars
  for (const pillar of pillars) {
    const halfW = (pillar.width * scale) / 2;
    const halfD = (pillar.depth * scale) / 2;
    const c = toCanvas(layout, pillar.x, pillar.y);
    ctx.fillStyle = "#c4cdd6";
    ctx.strokeStyle = "#121820";
    ctx.lineWidth = 1.5;
    ctx.fillRect(c.cx - halfW, c.cy - halfD, halfW * 2, halfD * 2);
    ctx.strokeRect(c.cx - halfW, c.cy - halfD, halfW * 2, halfD * 2);

    // Label
    ctx.fillStyle = "#121820";
    ctx.font = "600 11px Source Sans 3, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(pillar.name, c.cx, c.cy - halfD - 6);
    ctx.textAlign = "left";
  }

  // Overall dimensions
  ctx.strokeStyle = "#e35b1c";
  ctx.fillStyle = "#e35b1c";
  ctx.lineWidth = 1.25;
  // Width dim (bottom)
  const dimY = oy + drawH + 28;
  ctx.beginPath();
  ctx.moveTo(ox, dimY);
  ctx.lineTo(ox + drawW, dimY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ox, dimY - 6);
  ctx.lineTo(ox, dimY + 6);
  ctx.moveTo(ox + drawW, dimY - 6);
  ctx.lineTo(ox + drawW, dimY + 6);
  ctx.stroke();
  ctx.font = "600 13px Source Sans 3, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${building.width.toFixed(2)} m`, ox + drawW / 2, dimY + 18);

  // Length dim (right)
  const dimX = ox + drawW + 28;
  ctx.beginPath();
  ctx.moveTo(dimX, oy);
  ctx.lineTo(dimX, oy + drawH);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(dimX - 6, oy);
  ctx.lineTo(dimX + 6, oy);
  ctx.moveTo(dimX - 6, oy + drawH);
  ctx.lineTo(dimX + 6, oy + drawH);
  ctx.stroke();
  ctx.save();
  ctx.translate(dimX + 16, oy + drawH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${building.length.toFixed(2)} m`, 0, 0);
  ctx.restore();
  ctx.textAlign = "left";

  // Legend
  const ly = canvasH - 36;
  ctx.font = "500 12px Source Sans 3, Arial, sans-serif";
  const items: [string, string][] = [
    ["#6b4f3a", "Wall"],
    ["#c4cdd6", "Pillar"],
    ["#8b9aab", "Beam"],
    ["#2563eb", "Door"],
    ["#0ea5e9", "Window"],
    ["#a8b4c0", "Stair"],
  ];
  let lx = 32;
  for (const [color, label] of items) {
    ctx.fillStyle = color;
    ctx.fillRect(lx, ly - 8, 14, 14);
    ctx.strokeStyle = "#121820";
    ctx.strokeRect(lx, ly - 8, 14, 14);
    ctx.fillStyle = "#5b6570";
    ctx.fillText(label, lx + 20, ly + 4);
    lx += 90;
  }

  ctx.fillStyle = "#94a3b8";
  ctx.font = "400 11px Source Sans 3, Arial, sans-serif";
  ctx.fillText(
    `Exported ${new Date().toLocaleString()}  ·  North ≈ −Y on plan`,
    32,
    canvasH - 12
  );
}

function drawOpening(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  opening: Opening,
  wall?: Wall
) {
  if (!wall) return;
  // Approximate opening span along wall using meters
  const len = Math.hypot(wall.endX - wall.startX, wall.endY - wall.startY) || 1;
  const halfT = opening.width / 2 / len;
  const a = wallPoint(wall, Math.max(0, opening.t - halfT));
  const b = wallPoint(wall, Math.min(1, opening.t + halfT));
  const pa = toCanvas(layout, a.x, a.y);
  const pb = toCanvas(layout, b.x, b.y);

  // Cut (white over wall)
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(6, wall.thickness * layout.scale + 2);
  ctx.beginPath();
  ctx.moveTo(pa.cx, pa.cy);
  ctx.lineTo(pb.cx, pb.cy);
  ctx.stroke();

  if (opening.type === "door") {
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pa.cx, pa.cy);
    ctx.lineTo(pb.cx, pb.cy);
    ctx.stroke();
    // Swing arc hint
    const mid = toCanvas(layout, (a.x + b.x) / 2, (a.y + b.y) / 2);
    ctx.beginPath();
    ctx.arc(pa.cx, pa.cy, opening.width * layout.scale * 0.45, 0, Math.PI / 2);
    ctx.stroke();
    ctx.fillStyle = "#2563eb";
    ctx.font = "600 10px Source Sans 3, Arial, sans-serif";
    ctx.fillText("D", mid.cx - 4, mid.cy - 6);
  } else {
    ctx.strokeStyle = "#0ea5e9";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(pa.cx, pa.cy);
    ctx.lineTo(pb.cx, pb.cy);
    ctx.stroke();
    ctx.setLineDash([]);
    const mid = toCanvas(layout, (a.x + b.x) / 2, (a.y + b.y) / 2);
    ctx.fillStyle = "#0ea5e9";
    ctx.font = "600 10px Source Sans 3, Arial, sans-serif";
    ctx.fillText("W", mid.cx - 4, mid.cy - 6);
  }
}

function drawStair(
  ctx: CanvasRenderingContext2D,
  layout: Layout,
  stair: Stair
) {
  const c = toCanvas(layout, stair.x, stair.y);
  const w = stair.width * layout.scale;
  const d = stair.depth * layout.scale;
  const rot = ((stair.rotationDeg ?? 0) * Math.PI) / 180;
  ctx.save();
  ctx.translate(c.cx, c.cy);
  ctx.rotate(rot);
  ctx.fillStyle = "rgba(168,180,192,0.35)";
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 1.5;
  ctx.fillRect(-w / 2, -d / 2, w, d);
  ctx.strokeRect(-w / 2, -d / 2, w, d);
  const steps = 6;
  for (let i = 1; i < steps; i++) {
    const y = -d / 2 + (d * i) / steps;
    ctx.beginPath();
    ctx.moveTo(-w / 2, y);
    ctx.lineTo(w / 2, y);
    ctx.stroke();
  }
  ctx.fillStyle = "#475569";
  ctx.font = "600 10px Source Sans 3, Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("STAIR", 0, 4);
  ctx.textAlign = "left";
  ctx.restore();
}

/** Render active floor as an offscreen canvas. */
export function renderFloorPlanCanvas(payload: FloorPlanPayload): HTMLCanvasElement {
  const layout = computeLayout(payload.building);
  const canvas = document.createElement("canvas");
  canvas.width = layout.canvasW;
  canvas.height = layout.canvasH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create 2D drawing context.");
  drawFloorPlan(ctx, payload);
  return canvas;
}

/** Export current floor as PNG drawing. */
export function exportFloorPlanPng(payload: FloorPlanPayload) {
  const canvas = renderFloorPlanCanvas(payload);
  const dataUrl = canvas.toDataURL("image/png");
  downloadDataUrl(
    dataUrl,
    `${slug(payload.project)}-floor-${payload.activeFloor}-plan.png`
  );
}

/** Export current floor as SVG drawing (vector). */
export function exportFloorPlanSvg(payload: FloorPlanPayload) {
  // Rasterize via canvas then wrap is lossy for SVG — draw a simple SVG instead.
  const { building, pillars, beams, floorPlates, activeFloor, project } =
    payload;
  const plate =
    floorPlates.find((p) => p.floor === activeFloor) ?? floorPlates[0];
  const layout = computeLayout(building);
  const { scale, ox, oy, drawW, drawH, canvasW, canvasH } = layout;

  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

  const parts: string[] = [];
  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasW}" height="${canvasH}" viewBox="0 0 ${canvasW} ${canvasH}">`
  );
  parts.push(`<rect width="100%" height="100%" fill="#fff"/>`);
  parts.push(
    `<text x="32" y="40" font-family="Arial,sans-serif" font-size="28" font-weight="600" fill="#121820">BuildVision — 2D Floor Plan</text>`
  );
  parts.push(
    `<text x="32" y="64" font-family="Arial,sans-serif" font-size="16" fill="#5b6570">${esc(
      project
    )} · ${esc(building.name)} · Floor ${activeFloor}</text>`
  );
  parts.push(
    `<rect x="${ox}" y="${oy}" width="${drawW}" height="${drawH}" fill="#f4f7fa" stroke="#121820" stroke-width="2.5"/>`
  );

  for (const beam of beams) {
    const a = toCanvas(layout, beam.startX, beam.startY);
    const b = toCanvas(layout, beam.endX, beam.endY);
    parts.push(
      `<line x1="${a.cx}" y1="${a.cy}" x2="${b.cx}" y2="${b.cy}" stroke="#8b9aab" stroke-width="${Math.max(
        2,
        0.25 * scale
      )}" stroke-linecap="round"/>`
    );
  }

  for (const wall of plate?.walls ?? []) {
    const a = toCanvas(layout, wall.startX, wall.startY);
    const b = toCanvas(layout, wall.endX, wall.endY);
    parts.push(
      `<line x1="${a.cx}" y1="${a.cy}" x2="${b.cx}" y2="${b.cy}" stroke="#6b4f3a" stroke-width="${Math.max(
        4,
        wall.thickness * scale
      )}"/>`
    );
  }

  for (const pillar of pillars) {
    const c = toCanvas(layout, pillar.x, pillar.y);
    const w = pillar.width * scale;
    const d = pillar.depth * scale;
    parts.push(
      `<rect x="${c.cx - w / 2}" y="${c.cy - d / 2}" width="${w}" height="${d}" fill="#c4cdd6" stroke="#121820" stroke-width="1.5"/>`
    );
    parts.push(
      `<text x="${c.cx}" y="${c.cy - d / 2 - 6}" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="600" fill="#121820">${esc(
        pillar.name
      )}</text>`
    );
  }

  for (const stair of plate?.stairs ?? []) {
    const c = toCanvas(layout, stair.x, stair.y);
    const w = stair.width * scale;
    const d = stair.depth * scale;
    const rot = stair.rotationDeg ?? 0;
    parts.push(
      `<g transform="translate(${c.cx} ${c.cy}) rotate(${rot})">` +
        `<rect x="${-w / 2}" y="${-d / 2}" width="${w}" height="${d}" fill="rgba(168,180,192,0.35)" stroke="#64748b"/>` +
        `</g>`
    );
  }

  parts.push(`</svg>`);
  const blob = new Blob([parts.join("\n")], { type: "image/svg+xml" });
  downloadBlob(
    blob,
    `${slug(project)}-floor-${activeFloor}-plan.svg`
  );
}
