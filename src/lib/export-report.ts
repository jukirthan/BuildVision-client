import { jsPDF } from "jspdf";
import type {
  Beam,
  BuildingConfig,
  FloorPlate,
  MaterialEstimate,
  Pillar,
  Slab,
} from "@/types/structure";
import { formatCurrency } from "@/lib/cost-estimator";
import { renderFloorPlanCanvas } from "@/lib/export-floorplan";

export type ExportPayload = {
  project: string;
  building: BuildingConfig;
  pillars: Pillar[];
  beams: Beam[];
  slabs: Slab[];
  estimate: MaterialEstimate;
  floorPlates?: FloorPlate[];
  activeFloor?: number;
};

// Kept loose so R3F's WebGLRenderer / Scene / Camera wire up without tight coupling.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SceneState = { gl: any; scene: any; camera: any };

let sceneState: SceneState | null = null;

export function registerExportScene(state: SceneState | null) {
  sceneState = state;
}

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

/** Capture the live 3D canvas as a PNG data URL. */
export function captureSceneImage(): string | null {
  if (!sceneState) return null;
  const { gl, scene, camera } = sceneState;
  gl.render(scene, camera);
  return gl.domElement.toDataURL("image/png");
}

export function exportJson(payload: ExportPayload) {
  const body = {
    ...payload,
    exportedAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(body, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, `${slug(payload.project)}-structure.json`);
}

export function exportImage(projectName: string) {
  const dataUrl = captureSceneImage();
  if (!dataUrl) {
    throw new Error("3D view is not ready yet. Wait for the canvas to load.");
  }
  downloadDataUrl(dataUrl, `${slug(projectName)}-view.png`);
}

export async function exportPdf(payload: ExportPayload) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 18;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("BuildVision Structure Report", margin, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(80);
  doc.text(`Project: ${payload.project}`, margin, y);
  y += 6;
  doc.text(`Exported: ${new Date().toLocaleString()}`, margin, y);
  y += 10;
  doc.setTextColor(0);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Building", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const buildingLines = [
    `Name: ${payload.building.name}`,
    `Footprint: ${payload.building.width} m × ${payload.building.length} m`,
    `Floors: ${payload.building.floors}`,
    `Floor height: ${payload.building.floorHeight} m`,
    `Pillars: ${payload.pillars.length} per floor`,
    `Beams: ${payload.beams.length} per floor`,
    `Slab area: ${payload.slabs[0]?.area ?? 0} m²`,
  ];
  for (const line of buildingLines) {
    doc.text(line, margin, y);
    y += 5;
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Cost estimate", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const costLines = [
    `Total: ${formatCurrency(payload.estimate.totalCost)}`,
    `Concrete: ${payload.estimate.concreteVolumeM3} m³ (${formatCurrency(payload.estimate.concreteCost)})`,
    `Steel: ${payload.estimate.steelWeightKg} kg (${formatCurrency(payload.estimate.steelCost)})`,
    `Brick: ${payload.estimate.brickVolumeM3 ?? 0} m³ (${formatCurrency(payload.estimate.brickCost ?? 0)})`,
    `Members: ${payload.estimate.pillarCount} pillars · ${payload.estimate.beamCount} beams · ${payload.estimate.slabCount} slabs`,
    `Envelope: ${payload.estimate.wallCount ?? 0} walls · ${payload.estimate.doorCount ?? 0} doors · ${payload.estimate.windowCount ?? 0} windows · ${payload.estimate.stairCount ?? 0} stairs`,
  ];
  for (const line of costLines) {
    doc.text(line, margin, y);
    y += 5;
  }

  const image = captureSceneImage();
  if (image) {
    y += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("3D view", margin, y);
    y += 4;
    const imgW = pageW - margin * 2;
    const imgH = imgW * 0.56;
    if (y + imgH > 280) {
      doc.addPage();
      y = 18;
    }
    doc.addImage(image, "PNG", margin, y, imgW, imgH);
    y += imgH + 8;
  }

  // 2D floor plan page
  if (payload.floorPlates?.length) {
    doc.addPage();
    y = 18;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("2D Floor Plan", margin, y);
    y += 8;
    try {
      const plan = renderFloorPlanCanvas({
        project: payload.project,
        building: payload.building,
        pillars: payload.pillars,
        beams: payload.beams,
        floorPlates: payload.floorPlates,
        activeFloor: payload.activeFloor ?? 1,
      });
      const planUrl = plan.toDataURL("image/png");
      const planW = pageW - margin * 2;
      const planH = Math.min(planW * (plan.height / plan.width), 240);
      doc.addImage(planUrl, "PNG", margin, y, planW, planH);
    } catch {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.text("Floor plan could not be rendered.", margin, y);
    }
  }

  if (y > 240) {
    doc.addPage();
    y = 18;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Pillar schedule", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  doc.setFillColor(240, 242, 245);
  doc.rect(margin, y - 3.5, pageW - margin * 2, 6, "F");
  doc.text("Name", margin + 1, y);
  doc.text("X (m)", margin + 28, y);
  doc.text("Y (m)", margin + 50, y);
  doc.text("W×D (m)", margin + 72, y);
  doc.text("H (m)", margin + 105, y);
  doc.text("Capacity (kN)", margin + 125, y);
  y += 6;

  for (const p of payload.pillars) {
    if (y > 285) {
      doc.addPage();
      y = 18;
    }
    doc.text(p.name, margin + 1, y);
    doc.text(p.x.toFixed(2), margin + 28, y);
    doc.text(p.y.toFixed(2), margin + 50, y);
    doc.text(`${p.width.toFixed(2)}×${p.depth.toFixed(2)}`, margin + 72, y);
    doc.text(p.height.toFixed(2), margin + 105, y);
    doc.text(p.loadCapacity.toFixed(1), margin + 125, y);
    y += 5;
  }

  doc.save(`${slug(payload.project)}-report.pdf`);
}
