"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, FileImage, FileText, Layers, X } from "lucide-react";
import {
  createPerspectiveSketchSvg,
  createTechnicalFloorPlanSvg,
  svgDataUrl,
} from "@/lib/architectural-svg";
import type { ArchitecturalOutputPayload } from "@/types/architectural-output";

type OutputTab = "plan" | "perspective";

function slug(value: string) {
  return value.replace(/\s+/g, "-").toLowerCase() || "structure";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  window.setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

async function downloadSvgAsPng(svg: string, filename: string) {
  const image = new window.Image();
  image.decoding = "async";
  image.src = svgDataUrl(svg);
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("The drawing could not be rasterized."));
  });
  const canvas = document.createElement("canvas");
  canvas.width = 1600;
  canvas.height = 1080;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create an image export context.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not create the PNG export.");
  downloadBlob(blob, filename);
}

export default function ArchitecturalOutputWindow({
  payload,
  onClose,
  onPdf,
}: {
  payload: ArchitecturalOutputPayload;
  onClose: () => void;
  onPdf: () => void;
}) {
  const [tab, setTab] = useState<OutputTab>("plan");
  const [exporting, setExporting] = useState<"png" | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const planSvg = useMemo(() => createTechnicalFloorPlanSvg(payload), [payload]);
  const perspectiveSvg = useMemo(() => createPerspectiveSketchSvg(payload), [payload]);
  const activeSvg = tab === "plan" ? planSvg : perspectiveSvg;
  const name = slug(payload.project);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  const downloadSvg = () => {
    downloadBlob(new Blob([activeSvg], { type: "image/svg+xml" }), `${name}-${tab === "plan" ? "technical-floor-plan" : "two-point-perspective"}.svg`);
  };

  const downloadPng = async () => {
    setExporting("png");
    try {
      await downloadSvgAsPng(activeSvg, `${name}-${tab === "plan" ? "technical-floor-plan" : "two-point-perspective"}.png`);
    } finally {
      setExporting(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0f172a]/65 p-2 backdrop-blur-sm sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="architectural-output-title"
        aria-busy={Boolean(exporting)}
        className="flex max-h-[96vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border border-[#d8dee7] bg-[#f8fafc] shadow-2xl"
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e2e8f0] bg-white px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#eff6ff] text-[#2563eb]"><Layers size={18} /></div>
            <div className="min-w-0">
              <h2 id="architectural-output-title" className="truncate text-sm font-bold text-[#121820] sm:text-base">Architectural output window</h2>
              <p className="truncate text-xs text-[#64748b]">{payload.building.name} · Floor {payload.activeFloor} · review before export</p>
            </div>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-[#64748b] hover:bg-[#f1f5f9] hover:text-[#121820]" aria-label="Close architectural output window"><X size={19} /></button>
        </header>

        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e2e8f0] bg-white px-4 py-2 sm:px-6">
          <div className="flex rounded-xl bg-[#f1f5f9] p-1" role="tablist" aria-label="Architectural outputs">
            <button type="button" role="tab" aria-selected={tab === "plan"} onClick={() => setTab("plan")} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${tab === "plan" ? "bg-white text-[#2563eb] shadow-sm" : "text-[#64748b] hover:text-[#121820]"}`}>2D technical plan</button>
            <button type="button" role="tab" aria-selected={tab === "perspective"} onClick={() => setTab("perspective")} className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${tab === "perspective" ? "bg-white text-[#2563eb] shadow-sm" : "text-[#64748b] hover:text-[#121820]"}`}>3D perspective sketch</button>
          </div>
          <span className="hidden text-[11px] text-[#94a3b8] sm:inline">SVG is vector; PNG is presentation-ready</span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto p-3 sm:p-6">
          <div className="overflow-hidden rounded-xl border border-[#d8dee7] bg-white shadow-sm">
            {/* The drawing is a generated data URL; next/image cannot optimize it. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={svgDataUrl(activeSvg)} alt={tab === "plan" ? "Detailed 2D architectural technical floor plan" : "Two-point perspective architectural exterior line drawing"} className="block h-auto w-full" />
          </div>
          {tab === "plan" ? (
            <div className="mt-3 grid gap-2 text-xs text-[#64748b] sm:grid-cols-3">
              <p className="rounded-lg border border-[#dbeafe] bg-[#eff6ff] px-3 py-2"><strong className="text-[#1e40af]">Plan:</strong> rooms, dimensions, wall openings, columns and stairs.</p>
              <p className="rounded-lg border border-[#fef3c7] bg-[#fffbeb] px-3 py-2"><strong className="text-[#92400e]">Electrical:</strong> light, switch, socket and distribution-board symbols.</p>
              <p className="rounded-lg border border-[#cffafe] bg-[#ecfeff] px-3 py-2"><strong className="text-[#0e7490]">MEP:</strong> concept supply, waste, soil and inspection-drain routes.</p>
            </div>
          ) : (
            <p className="mt-3 rounded-lg border border-[#e2e8f0] bg-white px-3 py-2 text-xs text-[#64748b]">Two-point perspective keeps verticals vertical and sends receding edges to left and right vanishing points. Use it for massing and facade coordination.</p>
          )}
        </div>

        <footer className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#e2e8f0] bg-white px-4 py-3 sm:px-6">
          <p className="max-w-xl text-[11px] leading-4 text-[#94a3b8]">Concept output only. Coordinate final architectural, electrical, plumbing and drainage drawings with licensed consultants.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={downloadSvg} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#cbd5e1] px-3 py-2 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc]"><Download size={14} /> SVG</button>
            <button type="button" onClick={downloadPng} disabled={Boolean(exporting)} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-[#cbd5e1] px-3 py-2 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc] disabled:opacity-50"><FileImage size={14} /> {exporting === "png" ? "Preparing…" : "PNG"}</button>
            <button type="button" onClick={onPdf} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#121820] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2563eb]"><FileText size={14} /> PDF report</button>
            <button type="button" onClick={onClose} className="inline-flex min-h-10 items-center rounded-xl px-3 py-2 text-xs font-semibold text-[#64748b] hover:bg-[#f1f5f9]">Done</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
