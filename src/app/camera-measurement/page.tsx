"use client";

import { jsPDF } from "jspdf";
import {
  ChangeEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AlertTriangle,
  Camera as CameraIcon,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Info,
  RotateCcw,
  Ruler,
  SwitchCamera,
  Trash2,
  Undo2,
  Upload,
  Video,
} from "lucide-react";
import AppShell from "@/components/app/AppShell";
import PageHeader from "@/components/app/PageHeader";
import Button from "@/components/ui/Button";
import {
  ELEMENT_TYPES,
  guidanceFor,
  pixelDistance,
  type Measurement,
  type MeasurementPoint,
} from "@/lib/measurement";
import { addReport } from "@/lib/reports";

type Mode = "calibrate" | "measure";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function CameraMeasurementPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined);
  const [streaming, setStreaming] = useState(false);
  const [frameSrc, setFrameSrc] = useState<string | null>(null);
  const [imgReady, setImgReady] = useState(false);
  const [error, setError] = useState("");

  const [points, setPoints] = useState<MeasurementPoint[]>([]);
  const [mode, setMode] = useState<Mode>("calibrate");
  const [calibrationInput, setCalibrationInput] = useState("1");
  const [calibration, setCalibration] = useState<{ meters: number; pixels: number } | null>(
    null
  );
  const [elementType, setElementType] = useState<string>(ELEMENT_TYPES[0]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [manualMeters, setManualMeters] = useState("");
  const [notice, setNotice] = useState("");

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStreaming(false);
  }, []);

  useEffect(() => stopStream, [stopStream]);

  const startCamera = async (nextDeviceId?: string) => {
    setError("");
    try {
      stopStream();
      const constraints: MediaStreamConstraints = {
        video: nextDeviceId
          ? { deviceId: { exact: nextDeviceId } }
          : { facingMode: "environment" },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStreaming(true);
      setFrameSrc(null);
      setImgReady(false);

      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list.filter((d) => d.kind === "videoinput"));
    } catch {
      setError(
        "Could not access the camera. Check browser permissions, or upload a photo instead."
      );
    }
  };

  const switchCamera = () => {
    if (devices.length < 2) return;
    const idx = devices.findIndex((d) => d.deviceId === deviceId);
    const next = devices[(idx + 1) % devices.length];
    setDeviceId(next.deviceId);
    void startCamera(next.deviceId);
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const off = document.createElement("canvas");
    off.width = video.videoWidth;
    off.height = video.videoHeight;
    const ctx = off.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, off.width, off.height);
    setFrameSrc(off.toDataURL("image/jpeg", 0.92));
    stopStream();
  };

  const onUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setFrameSrc(reader.result as string);
    reader.readAsDataURL(file);
    stopStream();
  };

  const retake = () => {
    setFrameSrc(null);
    setImgReady(false);
    setPoints([]);
    setCalibration(null);
    setMeasurements([]);
  };

  // Load captured/uploaded frame into an Image for canvas drawing.
  useEffect(() => {
    if (!frameSrc) {
      baseImageRef.current = null;
      return;
    }
    const img = new Image();
    img.onload = () => {
      baseImageRef.current = img;
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
      }
      setImgReady(true);
    };
    img.src = frameSrc;
  }, [frameSrc]);

  const metersPerPixel = calibration ? calibration.meters / calibration.pixels : null;

  // Redraw canvas: base image + overlays.
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = baseImageRef.current;
    if (!canvas || !img || !imgReady) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const drawLine = (
      p1: MeasurementPoint,
      p2: MeasurementPoint,
      color: string,
      label?: string
    ) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, canvas.width / 500);
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
      [p1, p2].forEach((p) => {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(4, canvas.width / 250), 0, Math.PI * 2);
        ctx.fill();
      });
      if (label) {
        const mx = (p1.x + p2.x) / 2;
        const my = (p1.y + p2.y) / 2;
        const fontSize = Math.max(14, canvas.width / 55);
        ctx.font = `600 ${fontSize}px sans-serif`;
        const padding = 6;
        const textW = ctx.measureText(label).width;
        ctx.fillStyle = "rgba(11,12,15,0.82)";
        ctx.fillRect(mx - textW / 2 - padding, my - fontSize - padding, textW + padding * 2, fontSize + padding * 1.4);
        ctx.fillStyle = "#fff";
        ctx.fillText(label, mx - textW / 2, my - padding * 0.6 - fontSize * 0.15);
      }
    };

    // Calibration line (persisted visually while in calibrate mode / or always in green if set)
    measurements.forEach((m) => {
      const label = metersPerPixel ? `${m.type} · ${m.meters.toFixed(2)}m` : m.type;
      drawLine(m.p1, m.p2, "#3d5afe", label);
    });

    if (points.length === 1) {
      ctx.fillStyle = mode === "calibrate" ? "#d97706" : "#16a34a";
      ctx.beginPath();
      ctx.arc(points[0].x, points[0].y, Math.max(5, canvas.width / 220), 0, Math.PI * 2);
      ctx.fill();
    }
    if (points.length === 2) {
      drawLine(points[0], points[1], mode === "calibrate" ? "#d97706" : "#16a34a");
    }
  }, [measurements, points, mode, metersPerPixel, imgReady]);

  const onCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !imgReady) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const point: MeasurementPoint = {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };

    setNotice("");
    setPoints((prev) => {
      const next = [...prev, point];
      if (next.length < 2) return next;

      const pixels = pixelDistance(next[0], next[1]);

      if (mode === "calibrate") {
        const real = Number(calibrationInput);
        if (!real || real <= 0) {
          setNotice("Enter a valid reference length in meters first.");
          return [];
        }
        setCalibration({ meters: real, pixels });
        setNotice(`Calibrated: ${(pixels / real).toFixed(1)} px/m. Switch to Measure to start.`);
        return [];
      }

      if (!calibration) {
        setNotice("Calibrate the scale first using a known reference length.");
        return [];
      }
      const meters = pixels * (calibration.meters / calibration.pixels);
      setMeasurements((prevM) => [
        ...prevM,
        {
          id: `m-${Date.now()}`,
          type: elementType,
          label: elementType,
          p1: next[0],
          p2: next[1],
          pixels,
          meters,
        },
      ]);
      return [];
    });
  };

  const addManualMeasurement = () => {
    const meters = Number(manualMeters);
    if (!meters || meters <= 0) return;
    setMeasurements((prev) => [
      ...prev,
      {
        id: `m-${Date.now()}`,
        type: elementType,
        label: elementType,
        p1: { x: 0, y: 0 },
        p2: { x: 0, y: 0 },
        pixels: 0,
        meters,
      },
    ]);
    setManualMeters("");
  };

  const undoLast = () => setMeasurements((prev) => prev.slice(0, -1));
  const removeMeasurement = (id: string) =>
    setMeasurements((prev) => prev.filter((m) => m.id !== id));

  const warnings = measurements
    .map((m) => guidanceFor(m.type, m.meters))
    .filter((w): w is string => Boolean(w));

  const reportPayload = {
    capturedAt: new Date().toISOString(),
    calibration,
    measurements: measurements.map((m) => ({
      type: m.type,
      meters: Number(m.meters.toFixed(3)),
      pixels: Math.round(m.pixels),
    })),
    warnings,
    note: "Manual, camera-calibrated measurement. Automatic AI object detection is on the roadmap; verify critical dimensions on site.",
  };

  const exportJson = () => {
    downloadBlob(
      new Blob([JSON.stringify(reportPayload, null, 2)], { type: "application/json" }),
      "measurement-report.json"
    );
    addReport({ title: "Camera measurement", type: "measurement", format: "json", data: reportPayload });
  };

  const exportCsv = () => {
    const rows = [
      ["Type", "Meters", "Feet", "Pixels"],
      ...measurements.map((m) => [
        m.type,
        m.meters.toFixed(3),
        (m.meters * 3.28084).toFixed(3),
        Math.round(m.pixels).toString(),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv" }), "measurement-report.csv");
    addReport({ title: "Camera measurement", type: "measurement", format: "csv", data: reportPayload });
  };

  const exportPdf = () => {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const margin = 14;
    let y = 18;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("BuildVision Measurement Report", margin, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(90);
    doc.text(`Captured: ${new Date().toLocaleString()}`, margin, y);
    y += 5;
    if (calibration) {
      doc.text(
        `Calibration: ${calibration.meters}m reference over ${Math.round(calibration.pixels)}px`,
        margin,
        y
      );
      y += 7;
    }
    doc.setTextColor(0);

    if (frameSrc) {
      const pageW = doc.internal.pageSize.getWidth();
      const imgW = pageW - margin * 2;
      const imgH = imgW * 0.6;
      doc.addImage(frameSrc, "JPEG", margin, y, imgW, imgH);
      y += imgH + 8;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Measurements", margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    measurements.forEach((m) => {
      doc.text(`${m.type}: ${m.meters.toFixed(2)} m (${(m.meters * 3.28084).toFixed(2)} ft)`, margin, y);
      y += 5;
    });

    if (warnings.length) {
      y += 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("Warnings", margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      warnings.forEach((w) => {
        const lines = doc.splitTextToSize(`• ${w}`, 180);
        doc.text(lines, margin, y);
        y += lines.length * 5;
      });
    }

    y += 4;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(
      doc.splitTextToSize(
        "Note: manual, camera-calibrated estimate. Verify critical dimensions on site before construction.",
        180
      ),
      margin,
      y
    );

    doc.save("measurement-report.pdf");
    addReport({ title: "Camera measurement", type: "measurement", format: "pdf", data: reportPayload });
  };

  return (
    <AppShell title="Camera Measurement">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Camera Measurement" }]}
        eyebrow="Beta"
        title="Camera measurement"
        description="Capture a photo, calibrate against a known reference length, then click two points to measure structural elements."
      />

      <div className="mx-auto max-w-content px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-border bg-canvas-subtle px-4 py-3 text-sm text-text-secondary">
          <Info size={16} className="mt-0.5 shrink-0 text-accent" />
          <p>
            This tool gives calibrated, manual measurements from a photo — not
            automatic AI object detection (planned). Accuracy depends on
            camera angle and calibration precision; verify critical dimensions
            on site.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="card lg:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                {!frameSrc && !streaming && (
                  <Button size="sm" onClick={() => void startCamera(deviceId)}>
                    <Video size={14} /> Start camera
                  </Button>
                )}
                {streaming && (
                  <>
                    <Button size="sm" onClick={capture}>
                      <CameraIcon size={14} /> Capture
                    </Button>
                    {devices.length > 1 && (
                      <Button size="sm" variant="secondary" onClick={switchCamera}>
                        <SwitchCamera size={14} /> Switch
                      </Button>
                    )}
                  </>
                )}
                {frameSrc && (
                  <Button size="sm" variant="secondary" onClick={retake}>
                    <RotateCcw size={14} /> Retake
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={14} /> Upload photo
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={onUpload}
                />
              </div>
            </div>

            {error && (
              <p className="mx-4 mt-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <div className="relative flex min-h-[320px] items-center justify-center bg-ink p-2 sm:min-h-[420px]">
              {!frameSrc && (
                <video
                  ref={videoRef}
                  className={`max-h-[70vh] w-full rounded-lg object-contain ${streaming ? "" : "hidden"}`}
                  muted
                  playsInline
                />
              )}
              {!frameSrc && !streaming && (
                <div className="flex flex-col items-center gap-2 py-16 text-white/50">
                  <CameraIcon size={28} />
                  <p className="text-sm">Start the camera or upload a photo to begin.</p>
                </div>
              )}
              {frameSrc && (
                <canvas
                  ref={canvasRef}
                  onClick={onCanvasClick}
                  className="max-h-[70vh] w-full cursor-crosshair rounded-lg object-contain"
                  role="img"
                  aria-label="Captured photo with measurement overlay. Click two points to measure."
                />
              )}
            </div>

            {frameSrc && (
              <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3 text-xs text-text-secondary">
                <span className="kbd">
                  {mode === "calibrate" ? "Click 2 points to calibrate" : "Click 2 points to measure"}
                </span>
                {notice && <span className="text-accent">{notice}</span>}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-4">
            <div className="card p-4">
              <p className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
                <Ruler size={15} className="text-accent" /> Calibration
              </p>
              <label className="auth-field">
                <span>Reference length (m)</span>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={calibrationInput}
                  onChange={(e) => setCalibrationInput(e.target.value)}
                  className="auth-input"
                />
              </label>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant={mode === "calibrate" ? "primary" : "secondary"}
                  onClick={() => {
                    setMode("calibrate");
                    setPoints([]);
                  }}
                  className="flex-1"
                >
                  Calibrate
                </Button>
                <Button
                  size="sm"
                  variant={mode === "measure" ? "primary" : "secondary"}
                  onClick={() => {
                    setMode("measure");
                    setPoints([]);
                  }}
                  disabled={!calibration}
                  className="flex-1"
                >
                  Measure
                </Button>
              </div>
              {calibration && (
                <p className="mt-2 text-xs text-success">
                  Scale set: {(calibration.pixels / calibration.meters).toFixed(0)} px/m
                </p>
              )}
            </div>

            <div className="card p-4">
              <p className="mb-3 font-display text-sm font-semibold text-text-primary">
                Element type
              </p>
              <select
                value={elementType}
                onChange={(e) => setElementType(e.target.value)}
                className="auth-input"
              >
                {ELEMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <div className="mt-3 flex items-center gap-2">
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  placeholder="Manual entry (m)"
                  value={manualMeters}
                  onChange={(e) => setManualMeters(e.target.value)}
                  className="auth-input flex-1"
                />
                <Button size="sm" variant="secondary" onClick={addManualMeasurement}>
                  Add
                </Button>
              </div>
              <p className="mt-1.5 text-[11px] text-text-tertiary">
                No camera? Enter a value manually for keyboard-only use.
              </p>
            </div>
          </div>
        </div>

        {/* Measurements list */}
        <div className="mt-5 card">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <p className="font-display text-sm font-semibold text-text-primary">
              Measurements ({measurements.length})
            </p>
            {measurements.length > 0 && (
              <button
                type="button"
                onClick={undoLast}
                className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-accent"
              >
                <Undo2 size={13} /> Undo last
              </button>
            )}
          </div>
          {measurements.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-text-tertiary">
              No measurements yet — calibrate, then click two points on the photo.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {measurements.map((m) => {
                const warning = guidanceFor(m.type, m.meters);
                return (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">{m.type}</p>
                      <p className="text-xs text-text-tertiary">
                        {m.meters.toFixed(2)} m · {(m.meters * 3.28084).toFixed(2)} ft
                      </p>
                      {warning && (
                        <p className="mt-1 flex items-center gap-1.5 text-xs text-warning">
                          <AlertTriangle size={12} /> {warning}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMeasurement(m.id)}
                      className="shrink-0 text-text-tertiary hover:text-danger"
                      aria-label={`Remove ${m.type} measurement`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {measurements.length > 0 && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3.5">
              <Button variant="secondary" size="sm" onClick={exportJson}>
                <FileJson size={14} /> JSON
              </Button>
              <Button variant="secondary" size="sm" onClick={exportCsv}>
                <FileSpreadsheet size={14} /> CSV
              </Button>
              <Button size="sm" onClick={exportPdf}>
                <FileText size={14} /> <Download size={13} className="ml-0.5" /> PDF report
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
