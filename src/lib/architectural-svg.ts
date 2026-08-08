import {
  deriveArchitecturalOutput,
  getOpeningWall,
  type ArchitecturalOutputPayload,
} from "@/types/architectural-output";

const esc = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const n = (value: number) => Number(value.toFixed(2));

function svgHeader(width: number, height: number, title: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${esc(title)}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
}

function planPoint(
  ox: number,
  oy: number,
  scale: number,
  x: number,
  y: number
) {
  return { x: n(ox + x * scale), y: n(oy + y * scale) };
}

function symbol(
  x: number,
  y: number,
  label: string,
  color: string,
  type: "circle" | "square" = "circle"
) {
  const shape =
    type === "circle"
      ? `<circle cx="${n(x)}" cy="${n(y)}" r="7" fill="#fff" stroke="${color}" stroke-width="2"/>`
      : `<rect x="${n(x - 6)}" y="${n(y - 6)}" width="12" height="12" fill="#fff" stroke="${color}" stroke-width="2"/>`;
  return `${shape}<text x="${n(x + 10)}" y="${n(y + 4)}" font-family="Arial,sans-serif" font-size="10" font-weight="600" fill="${color}">${esc(label)}</text>`;
}

function dimension(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  label: string,
  axis: "horizontal" | "vertical",
  offset: number
) {
  if (axis === "horizontal") {
    const y = y1 + offset;
    return `<g stroke="#e35b1c" fill="#e35b1c" stroke-width="1.4"><line x1="${n(x1)}" y1="${n(y)}" x2="${n(x2)}" y2="${n(y)}"/><line x1="${n(x1)}" y1="${n(y - 7)}" x2="${n(x1)}" y2="${n(y + 7)}"/><line x1="${n(x2)}" y1="${n(y - 7)}" x2="${n(x2)}" y2="${n(y + 7)}"/><text x="${n((x1 + x2) / 2)}" y="${n(y - 8)}" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="600">${esc(label)}</text></g>`;
  }
  const x = x1 + offset;
  const midY = (y1 + y2) / 2;
  return `<g stroke="#e35b1c" fill="#e35b1c" stroke-width="1.4"><line x1="${n(x)}" y1="${n(y1)}" x2="${n(x)}" y2="${n(y2)}"/><line x1="${n(x - 7)}" y1="${n(y1)}" x2="${n(x + 7)}" y2="${n(y1)}"/><line x1="${n(x - 7)}" y1="${n(y2)}" x2="${n(x + 7)}" y2="${n(y2)}"/><text x="${n(x + 17)}" y="${n(midY)}" transform="rotate(-90 ${n(x + 17)} ${n(midY)})" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="600">${esc(label)}</text></g>`;
}

function planLegend() {
  const entries = [
    ["#6b4f3a", "Wall"],
    ["#2563eb", "Door"],
    ["#0ea5e9", "Window"],
    ["#c4cdd6", "Column"],
    ["#f59e0b", "Electrical"],
    ["#0891b2", "Plumbing / drainage"],
  ];
  return entries
    .map(
      ([color, label], index) => {
        const x = 36 + index * 170;
        return `<rect x="${x}" y="${755}" width="14" height="14" fill="${color}" stroke="#121820"/><text x="${x + 21}" y="${768}" font-family="Arial,sans-serif" font-size="12" fill="#475569">${label}</text>`;
      }
    )
    .join("");
}

export function createTechnicalFloorPlanSvg(
  payload: ArchitecturalOutputPayload
) {
  const { building, project } = payload;
  const model = deriveArchitecturalOutput(payload);
  const scale = Math.min(760 / Math.max(building.width, 1), 540 / Math.max(building.length, 1));
  const ox = 115;
  const oy = 155;
  const drawW = building.width * scale;
  const drawH = building.length * scale;
  const width = 1200;
  const height = 820;
  const parts: string[] = [svgHeader(width, height, "Detailed architectural floor plan")];

  parts.push(`<rect width="100%" height="100%" fill="#fff"/>`);
  parts.push(`<text x="36" y="42" font-family="Arial,sans-serif" font-size="26" font-weight="700" fill="#121820">BuildVision — Detailed 2D Technical Plan</text>`);
  parts.push(`<text x="36" y="68" font-family="Arial,sans-serif" font-size="14" fill="#475569">${esc(project)} · ${esc(building.name)} · Floor ${payload.activeFloor} of ${building.floors}</text>`);
  parts.push(`<text x="36" y="91" font-family="Arial,sans-serif" font-size="12" fill="#64748b">Concept architectural coordination drawing · verify consultant drawings before construction</text>`);
  parts.push(`<rect x="${n(ox)}" y="${n(oy)}" width="${n(drawW)}" height="${n(drawH)}" fill="#f8fafc" stroke="#121820" stroke-width="2.5"/>`);

  for (let x = 0; x <= building.width + 0.001; x += 1) {
    const p = planPoint(ox, oy, scale, x, 0);
    parts.push(`<line x1="${p.x}" y1="${oy}" x2="${p.x}" y2="${n(oy + drawH)}" stroke="#e8edf2"/>`);
  }
  for (let y = 0; y <= building.length + 0.001; y += 1) {
    const p = planPoint(ox, oy, scale, 0, y);
    parts.push(`<line x1="${ox}" y1="${p.y}" x2="${n(ox + drawW)}" y2="${p.y}" stroke="#e8edf2"/>`);
  }

  for (const room of model.rooms) {
    const p = planPoint(ox, oy, scale, room.x, room.y);
    const fill = room.kind === "living" ? "#eff6ff" : room.kind === "kitchen" ? "#fffbeb" : room.kind === "bedroom" ? "#f5f3ff" : "#ecfeff";
    parts.push(`<rect x="${p.x}" y="${p.y}" width="${n(room.width * scale)}" height="${n(room.height * scale)}" fill="${fill}" stroke="#94a3b8" stroke-dasharray="7 5"/>`);
    parts.push(`<text x="${n(p.x + room.width * scale / 2)}" y="${n(p.y + room.height * scale / 2 - 2)}" text-anchor="middle" font-family="Arial,sans-serif" font-size="13" font-weight="700" fill="#334155">${esc(room.name)}</text>`);
    parts.push(`<text x="${n(p.x + room.width * scale / 2)}" y="${n(p.y + room.height * scale / 2 + 16)}" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" fill="#64748b">${room.area.toFixed(1)} m² · concept zone</text>`);
  }

  for (const route of model.plumbingRoutes) {
    const points = route.points.map((point) => {
      const p = planPoint(ox, oy, scale, point.x, point.y);
      return `${p.x},${p.y}`;
    }).join(" ");
    const color = route.kind === "supply" ? "#2563eb" : route.kind === "waste" ? "#7c3aed" : "#0891b2";
    parts.push(`<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="${route.kind === "drainage" ? "8 5" : "4 4"}"/>`);
    const first = planPoint(ox, oy, scale, route.points[0].x, route.points[0].y);
    parts.push(`<text x="${n(first.x + 5)}" y="${n(first.y - 6)}" font-family="Arial,sans-serif" font-size="10" font-weight="600" fill="${color}">${esc(route.label)}</text>`);
  }

  for (const beam of payload.beams) {
    const a = planPoint(ox, oy, scale, beam.startX, beam.startY);
    const b = planPoint(ox, oy, scale, beam.endX, beam.endY);
    parts.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#8b9aab" stroke-width="${Math.max(2, 0.25 * scale)}" stroke-linecap="round"/>`);
  }
  const walls = model.plate?.walls ?? [];
  for (const wall of walls) {
    const a = planPoint(ox, oy, scale, wall.startX, wall.startY);
    const b = planPoint(ox, oy, scale, wall.endX, wall.endY);
    parts.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#6b4f3a" stroke-width="${Math.max(4, wall.thickness * scale)}"/>`);
  }
  for (const opening of model.plate?.openings ?? []) {
    const wall = getOpeningWall(opening, walls);
    if (!wall) continue;
    const dx = wall.endX - wall.startX;
    const dy = wall.endY - wall.startY;
    const length = Math.hypot(dx, dy) || 1;
    const half = opening.width / length / 2;
    const start = Math.max(0, opening.t - half);
    const end = Math.min(1, opening.t + half);
    const a = planPoint(ox, oy, scale, wall.startX + dx * start, wall.startY + dy * start);
    const b = planPoint(ox, oy, scale, wall.startX + dx * end, wall.startY + dy * end);
    const mid = planPoint(ox, oy, scale, wall.startX + dx * opening.t, wall.startY + dy * opening.t);
    parts.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#fff" stroke-width="${Math.max(8, wall.thickness * scale + 3)}"/>`);
    const color = opening.type === "door" ? "#2563eb" : "#0ea5e9";
    parts.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color}" stroke-width="2" ${opening.type === "window" ? 'stroke-dasharray="6 4"' : ""}/>`);
    parts.push(`<text x="${n(mid.x + 4)}" y="${n(mid.y - 7)}" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="${color}">${opening.type === "door" ? "D" : "W"} ${opening.width.toFixed(2)}m</text>`);
  }
  for (const pillar of payload.pillars) {
    const p = planPoint(ox, oy, scale, pillar.x, pillar.y);
    const w = pillar.width * scale;
    const d = pillar.depth * scale;
    parts.push(`<rect x="${n(p.x - w / 2)}" y="${n(p.y - d / 2)}" width="${n(w)}" height="${n(d)}" fill="#c4cdd6" stroke="#121820"/>`);
    parts.push(`<text x="${p.x}" y="${n(p.y - d / 2 - 5)}" text-anchor="middle" font-family="Arial,sans-serif" font-size="9" font-weight="700" fill="#121820">${esc(pillar.name)}</text>`);
  }
  for (const stair of model.plate?.stairs ?? []) {
    const p = planPoint(ox, oy, scale, stair.x, stair.y);
    const w = stair.width * scale;
    const d = stair.depth * scale;
    parts.push(`<g transform="translate(${p.x} ${p.y}) rotate(${stair.rotationDeg ?? 0})"><rect x="${n(-w / 2)}" y="${n(-d / 2)}" width="${n(w)}" height="${n(d)}" fill="#e2e8f0" stroke="#64748b"/>${Array.from({ length: 5 }, (_, i) => `<line x1="${n(-w / 2)}" y1="${n(-d / 2 + ((i + 1) * d) / 6)}" x2="${n(w / 2)}" y2="${n(-d / 2 + ((i + 1) * d) / 6)}" stroke="#64748b"/>`).join("")}<text x="0" y="4" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#475569">STAIR</text></g>`);
  }
  for (const point of model.electrical) {
    const p = planPoint(ox, oy, scale, point.x, point.y);
    parts.push(symbol(p.x, p.y, point.label, point.kind === "panel" ? "#7c3aed" : "#f59e0b", point.kind === "light" ? "circle" : "square"));
  }
  for (const point of model.plumbing) {
    const p = planPoint(ox, oy, scale, point.x, point.y);
    parts.push(symbol(p.x, p.y, point.label, "#0891b2", "circle"));
  }
  for (const item of model.dimensions) {
    const a = planPoint(ox, oy, scale, item.x1, item.y1);
    const b = planPoint(ox, oy, scale, item.x2, item.y2);
    parts.push(dimension(a.x, a.y, b.x, b.y, item.label, item.axis, item.offset * scale));
  }

  parts.push(`<g transform="translate(1080 135)" stroke="#121820" fill="none" stroke-width="2"><circle cx="0" cy="0" r="18"/><path d="M0 13V-13M0-13l-6 9M0-13l6 9"/></g><text x="1080" y="169" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#121820">NORTH</text>`);
  parts.push(planLegend());
  parts.push(`<text x="36" y="795" font-family="Arial,sans-serif" font-size="11" fill="#64748b">N ↑ · Scale approx. 1:${Math.max(1, Math.round(1000 / scale))} · ${esc(model.notes[0])}</text>`);
  parts.push(`</svg>`);
  return parts.join("");
}

function pointAlong(a: { x: number; y: number }, b: { x: number; y: number }, distance: number) {
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { x: a.x + ((b.x - a.x) / length) * distance, y: a.y + ((b.y - a.y) / length) * distance };
}

export function createPerspectiveSketchSvg(
  payload: ArchitecturalOutputPayload
) {
  const { building, project } = payload;
  const plate = payload.floorPlates.find((item) => item.floor === payload.activeFloor) ?? payload.floorPlates[0];
  const openings = plate?.openings ?? [];
  const width = 1200;
  const height = 760;
  const near = { x: 500, y: 540 };
  const vpLeft = { x: 70, y: 255 };
  const vpRight = { x: 1130, y: 255 };
  const leftGround = pointAlong(near, vpLeft, 330 + building.length * 3);
  const rightGround = pointAlong(near, vpRight, 390 + building.width * 3);
  const farGround = { x: leftGround.x + rightGround.x - near.x, y: leftGround.y + rightGround.y - near.y };
  const heightPx = 120 + building.floors * building.floorHeight * 22;
  const nearTop = { x: near.x, y: near.y - heightPx };
  const leftTop = { x: leftGround.x, y: leftGround.y - heightPx };
  const rightTop = { x: rightGround.x, y: rightGround.y - heightPx };
  const farTop = { x: farGround.x, y: farGround.y - heightPx };
  const parts: string[] = [svgHeader(width, height, "Two-point perspective architectural concept sketch")];
  const line = (a: { x: number; y: number }, b: { x: number; y: number }, color = "#233044", weight = 2, dash = "") => `<line x1="${n(a.x)}" y1="${n(a.y)}" x2="${n(b.x)}" y2="${n(b.y)}" stroke="${color}" stroke-width="${weight}" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
  const poly = (points: Array<{ x: number; y: number }>, fill: string, stroke = "#233044") => `<polygon points="${points.map((p) => `${n(p.x)},${n(p.y)}`).join(" ")}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>`;

  parts.push(`<rect width="100%" height="100%" fill="#f8fafc"/>`);
  parts.push(`<text x="36" y="42" font-family="Arial,sans-serif" font-size="26" font-weight="700" fill="#121820">BuildVision — Architectural Exterior Perspective</text>`);
  parts.push(`<text x="36" y="68" font-family="Arial,sans-serif" font-size="14" fill="#475569">${esc(project)} · ${esc(building.name)} · Two-point perspective concept sketch</text>`);
  parts.push(`<text x="36" y="91" font-family="Arial,sans-serif" font-size="12" fill="#64748b">Linework for massing and facade coordination; not a photorealistic rendering or construction elevation</text>`);
  parts.push(`<line x1="60" y1="${vpLeft.y}" x2="1140" y2="${vpLeft.y}" stroke="#cbd5e1" stroke-dasharray="6 6"/>`);
  parts.push(`<text x="${vpLeft.x}" y="${vpLeft.y - 9}" font-family="Arial,sans-serif" font-size="10" fill="#94a3b8">VP-L</text><text x="${vpRight.x - 28}" y="${vpRight.y - 9}" font-family="Arial,sans-serif" font-size="10" fill="#94a3b8">VP-R</text>`);
  parts.push(poly([near, leftGround, farGround, rightGround], "#e2e8f0", "#94a3b8"));
  parts.push(poly([near, rightGround, rightTop, nearTop], "#eef2f7"));
  parts.push(poly([near, nearTop, leftTop, leftGround], "#f1f5f9"));
  parts.push(poly([nearTop, rightTop, farTop, leftTop], "#ffffff"));

  for (let floor = 1; floor < building.floors; floor += 1) {
    const ratio = floor / building.floors;
    const l = { x: leftGround.x + (leftTop.x - leftGround.x) * ratio, y: leftGround.y + (leftTop.y - leftGround.y) * ratio };
    const r = { x: rightGround.x + (rightTop.x - rightGround.x) * ratio, y: rightGround.y + (rightTop.y - rightGround.y) * ratio };
    const o = { x: near.x, y: near.y - heightPx * ratio };
    parts.push(line(o, l, "#64748b", 1.4, "5 4"));
    parts.push(line(o, r, "#64748b", 1.4, "5 4"));
  }
  const frontLeft = pointAlong(near, leftGround, 120);
  const frontRight = pointAlong(near, rightGround, 140);
  const frontLeftTop = { x: frontLeft.x, y: frontLeft.y - heightPx * 0.72 };
  const frontRightTop = { x: frontRight.x, y: frontRight.y - heightPx * 0.72 };
  parts.push(poly([frontLeft, frontRight, frontRightTop, frontLeftTop], "#ffffff", "#2563eb"));
  parts.push(line(frontLeft, frontLeftTop, "#2563eb", 2));
  parts.push(line(frontRight, frontRightTop, "#2563eb", 2));
  parts.push(line(frontLeftTop, frontRightTop, "#2563eb", 2));
  for (let index = 0; index < Math.max(2, Math.min(5, Math.ceil(building.width / 4))); index += 1) {
    const t = (index + 0.5) / Math.max(2, Math.min(5, Math.ceil(building.width / 4)));
    const base = { x: frontLeft.x + (frontRight.x - frontLeft.x) * t, y: frontLeft.y + (frontRight.y - frontLeft.y) * t };
    const top = { x: base.x, y: base.y - heightPx * 0.72 };
    const sill = { x: base.x, y: base.y - heightPx * 0.28 };
    parts.push(line({ x: base.x - 22, y: sill.y }, { x: base.x + 22, y: sill.y }, "#0ea5e9", 2));
    parts.push(line({ x: base.x - 22, y: top.y + heightPx * 0.28 }, { x: base.x + 22, y: top.y + heightPx * 0.28 }, "#0ea5e9", 2));
    parts.push(line({ x: base.x - 22, y: sill.y }, { x: base.x - 22, y: top.y + heightPx * 0.28 }, "#0ea5e9", 2));
    parts.push(line({ x: base.x + 22, y: sill.y }, { x: base.x + 22, y: top.y + heightPx * 0.28 }, "#0ea5e9", 2));
  }
  const doorBase = pointAlong(frontLeft, frontRight, Math.max(20, (frontRight.x - frontLeft.x) * 0.38));
  const doorTop = { x: doorBase.x, y: doorBase.y - heightPx * 0.48 };
  parts.push(`<path d="M ${n(doorBase.x - 28)} ${n(doorBase.y)} L ${n(doorBase.x - 28)} ${n(doorTop.y)} L ${n(doorBase.x + 28)} ${n(doorTop.y)} L ${n(doorBase.x + 28)} ${n(doorBase.y)}" fill="#eff6ff" stroke="#2563eb" stroke-width="2"/>`);
  parts.push(`<text x="${n(doorBase.x)}" y="${n(doorBase.y + 20)}" text-anchor="middle" font-family="Arial,sans-serif" font-size="11" font-weight="700" fill="#2563eb">ENTRY</text>`);

  for (let floor = 0; floor < building.floors; floor += 1) {
    const ratio = (floor + 0.5) / building.floors;
    const l = { x: leftGround.x + (leftTop.x - leftGround.x) * ratio, y: leftGround.y + (leftTop.y - leftGround.y) * ratio };
    const r = { x: rightGround.x + (rightTop.x - rightGround.x) * ratio, y: rightGround.y + (rightTop.y - rightGround.y) * ratio };
    const o = { x: near.x, y: near.y - heightPx * ratio };
    parts.push(line(o, l, "#0ea5e9", 1.5));
    parts.push(line(o, r, "#0ea5e9", 1.5));
  }
  parts.push(`<text x="36" y="710" font-family="Arial,sans-serif" font-size="12" fill="#475569">${openings.filter((item) => item.type === "door").length} doors · ${openings.filter((item) => item.type === "window").length} windows · ${building.floors} levels · ${building.floorHeight.toFixed(2)} m floor-to-floor</text>`);
  parts.push(`<text x="36" y="733" font-family="Arial,sans-serif" font-size="11" fill="#64748b">Perspective construction: receding edges converge toward VP-L and VP-R; verticals remain vertical.</text>`);
  parts.push(`<text x="1010" y="710" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="#2563eb">N ↑</text>`);
  parts.push(`</svg>`);
  return parts.join("");
}

export function svgDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
