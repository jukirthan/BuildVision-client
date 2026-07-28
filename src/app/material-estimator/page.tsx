"use client";

import { useMemo, useState } from "react";
import { Calculator, Download, Layers3 } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import PageHeader from "@/components/app/PageHeader";
import Button from "@/components/ui/Button";
import { estimateMaterials } from "@/lib/cost-estimator";
import {
  defaultBuilding,
  generatePillarGrid,
  recalculateStructure,
} from "@/lib/structural-engine";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { BuildingConfig } from "@/types/structure";

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const GRID_PRESETS = [
  { label: "Economy (3×2)", cols: 3, rows: 2 },
  { label: "Balanced (4×3)", cols: 4, rows: 3 },
  { label: "Dense (5×4)", cols: 5, rows: 4 },
];

export default function MaterialEstimatorPage() {
  const [form, setForm] = useState(() => {
    const b = defaultBuilding();
    return {
      width: b.width,
      length: b.length,
      floors: b.floors,
      floorHeight: b.floorHeight,
      grid: 1, // index into GRID_PRESETS
    };
  });

  const result = useMemo(() => {
    const building: BuildingConfig = {
      ...defaultBuilding(),
      width: form.width,
      length: form.length,
      floors: form.floors,
      floorHeight: form.floorHeight,
    };
    const preset = GRID_PRESETS[form.grid];
    const pillars = generatePillarGrid(building, preset.cols, preset.rows, 0.4, 0.4);
    const { beams, slabs } = recalculateStructure(building, pillars);
    const estimate = estimateMaterials(pillars, beams, slabs, [], building.floors, building);
    return { building, estimate };
  }, [form]);

  const { estimate } = result;

  const field = (
    label: string,
    key: "width" | "length" | "floors" | "floorHeight",
    unit: string,
    min: number,
    max: number,
    step = 1
  ) => (
    <label className="block">
      <span className="text-xs font-medium text-text-secondary">
        {label} <span className="text-text-tertiary">({unit})</span>
      </span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={form[key]}
        onChange={(e) =>
          setForm((f) => ({ ...f, [key]: Number(e.target.value) || 0 }))
        }
        className="auth-input mt-1"
      />
    </label>
  );

  return (
    <AppShell title="Material Estimator">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Material Estimator" }]}
        eyebrow="Estimation"
        title="Material & cost estimator"
        description="A quick standalone estimate using the same engine as the 3D planner — open the planner for a fully detailed model."
        actions={
          <Button
            variant="secondary"
            onClick={() =>
              downloadJson(
                { building: result.building, estimate },
                "material-estimate.json"
              )
            }
          >
            <Download size={15} /> Export JSON
          </Button>
        }
      />

      <div className="mx-auto max-w-content px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Inputs */}
          <div className="card p-5">
            <p className="mb-4 flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
              <Layers3 size={15} className="text-accent" /> Building inputs
            </p>
            <div className="space-y-4">
              {field("Width", "width", "m", 5, 100)}
              {field("Length", "length", "m", 5, 100)}
              {field("Floors", "floors", "storeys", 1, 40)}
              {field("Floor height", "floorHeight", "m", 2.4, 6, 0.1)}

              <label className="block">
                <span className="text-xs font-medium text-text-secondary">
                  Column grid
                </span>
                <select
                  value={form.grid}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, grid: Number(e.target.value) }))
                  }
                  className="auth-input mt-1"
                >
                  {GRID_PRESETS.map((p, i) => (
                    <option key={p.label} value={i}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Results */}
          <div className="card lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <p className="flex items-center gap-2 font-display text-sm font-semibold text-text-primary">
                <Calculator size={15} className="text-accent" /> Estimate
              </p>
              <p className="font-display text-xl font-semibold text-text-primary">
                {formatCurrency(estimate.totalCost)}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
              {[
                { label: "Concrete", value: `${formatNumber(estimate.concreteVolumeM3)} m³` },
                { label: "Steel", value: `${formatNumber(estimate.steelWeightKg)} kg` },
                { label: "Bricks", value: `${formatNumber(estimate.brickVolumeM3)} m³` },
                { label: "Formwork", value: `${formatNumber(estimate.formworkM2)} m²` },
              ].map((s) => (
                <div key={s.label} className="rounded-lg border border-border p-3">
                  <p className="text-xs text-text-tertiary">{s.label}</p>
                  <p className="mt-1 font-display text-lg font-semibold text-text-primary">
                    {s.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-text-tertiary">
                    <th className="px-5 py-2.5 font-medium">Item</th>
                    <th className="px-3 py-2.5 font-medium">Qty</th>
                    <th className="px-3 py-2.5 font-medium">Rate</th>
                    <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {estimate.boq
                    .filter((l) => l.rate > 0)
                    .map((l) => (
                      <tr key={l.id}>
                        <td className="px-5 py-2.5 text-text-primary">{l.description}</td>
                        <td className="px-3 py-2.5 text-text-secondary">
                          {formatNumber(l.quantity)} {l.unit}
                        </td>
                        <td className="px-3 py-2.5 text-text-secondary">{l.rate}</td>
                        <td className="px-5 py-2.5 text-right font-medium text-text-primary">
                          {formatCurrency(l.amount)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
