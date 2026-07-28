"use client";

import { Sparkles, X } from "lucide-react";
import { useIsCompact } from "@/hooks/useMediaQuery";
import { formatCurrency, RATES } from "@/lib/cost-estimator";
import { cn } from "@/lib/utils";
import { useStructureStore } from "@/store/useStructureStore";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[#5b6570]">{label}</dt>
      <dd className="font-mono text-[#121820]">{value}</dd>
    </div>
  );
}

function PanelBody({ onClose }: { onClose?: () => void }) {
  const estimate = useStructureStore((s) => s.estimate);
  const beams = useStructureStore((s) => s.beams);
  const slabs = useStructureStore((s) => s.slabs);
  const pillars = useStructureStore((s) => s.pillars);
  const suggestions = useStructureStore((s) => s.suggestions);
  const advisor = useStructureStore((s) => s.advisor);
  const recommendations = useStructureStore((s) => s.recommendations);
  const applySuggestion = useStructureStore((s) => s.applySuggestion);
  const applyEngineeringRecommendation = useStructureStore(
    (s) => s.applyEngineeringRecommendation
  );
  const building = useStructureStore((s) => s.building);
  const setRightOpen = useStructureStore((s) => s.setRightOpen);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-[#e8edf2] px-4 py-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2563eb]">
            Live estimate
          </p>
          <h2 className="mt-1 font-display text-xl tracking-tight text-[#121820]">
            Cost & materials
          </h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-[#5b6570] hover:bg-[#f4f6f8] hover:text-[#2563eb]"
            aria-label="Close cost panel"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <div className="touch-scroll flex-1 space-y-5 overflow-y-auto px-4 py-4 pb-safe">
        <div className="rounded-2xl bg-[#121820] px-4 py-5 text-white">
          <p className="text-[11px] uppercase tracking-[0.12em] text-white/55">
            Grand total ({building.floors} floors)
          </p>
          <p className="mt-1 font-display text-3xl tracking-tight">
            {formatCurrency(estimate.totalCost)}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-white/50">Concrete</p>
              <p className="mt-0.5 font-medium">
                {formatCurrency(estimate.concreteCost)}
              </p>
            </div>
            <div>
              <p className="text-white/50">Steel</p>
              <p className="mt-0.5 font-medium">
                {formatCurrency(estimate.steelCost)}
              </p>
            </div>
            <div>
              <p className="text-white/50">Labour</p>
              <p className="mt-0.5 font-medium">
                {formatCurrency(estimate.labourCost ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-white/50">Formwork</p>
              <p className="mt-0.5 font-medium">
                {formatCurrency(estimate.formworkCost ?? 0)}
              </p>
            </div>
          </div>
        </div>

        <dl className="space-y-2 rounded-xl border border-[#e8edf2] p-3 text-sm">
          <Row label="Concrete volume" value={`${estimate.concreteVolumeM3} m³`} />
          <Row label="Steel weight" value={`${estimate.steelWeightKg} kg`} />
          <Row label="Stirrup length" value={`${estimate.stirrupLengthM ?? 0} m`} />
          <Row label="Tie length" value={`${estimate.tieLengthM ?? 0} m`} />
          <Row label="Beam length" value={`${estimate.beamLengthM ?? 0} m`} />
          <Row label="Column height" value={`${estimate.columnHeightM ?? 0} m`} />
          <Row label="Slab area" value={`${estimate.slabAreaM2 ?? 0} m²`} />
          <Row label="Formwork" value={`${estimate.formworkM2 ?? 0} m²`} />
          <Row label="Excavation" value={`${estimate.excavationVolumeM3 ?? 0} m³`} />
          <Row label="Brick count" value={String(estimate.brickCount ?? 0)} />
          <Row label="Foundation" value={formatCurrency(estimate.foundationCost ?? 0)} />
          <Row label="Columns" value={formatCurrency(estimate.columnsCost ?? 0)} />
          <Row label="Beams" value={formatCurrency(estimate.beamsCost ?? 0)} />
          <Row label="Slabs" value={formatCurrency(estimate.slabsCost ?? 0)} />
          <Row label="Walls" value={formatCurrency(estimate.wallsCost ?? 0)} />
          <Row label="Roof" value={formatCurrency(estimate.roofCost ?? 0)} />
        </dl>

        {(estimate.boq?.length ?? 0) > 0 && (
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#5b6570]">
              Bill of quantities
            </h3>
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-[#e8edf2] p-2 text-[11px]">
              {estimate.boq.map((line) => (
                <div
                  key={line.id}
                  className="flex items-start justify-between gap-2 border-b border-[#f1f5f9] py-1.5 last:border-0"
                >
                  <div>
                    <p className="font-medium text-[#121820]">{line.description}</p>
                    <p className="text-[#94a3b8]">
                      {line.category} · {line.quantity} {line.unit}
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[#121820]">
                    {line.amount > 0 ? formatCurrency(line.amount) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="text-xs text-[#5b6570]">
          {pillars.length} pillars · {beams.length} beams · {slabs.length} slab
          plate · live multi-floor model.
        </p>
        <p className="font-mono text-[10px] text-[#94a3b8]">
          Rates: ${RATES.concretePerM3}/m³ · ${RATES.steelPerKg}/kg · $
          {RATES.brickPerM3}/m³ brick
        </p>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[#2563EB]" />
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#5b6570]">
              AI structural recommendations
            </h3>
          </div>
          {recommendations.length === 0 && advisor.length === 0 ? (
            <p className="rounded-xl border border-[#e8edf2] bg-[#fafbfc] p-3 text-[11px] text-[#5b6570]">
              No issues detected. Spacing and member sizes look within demo
              limits.
            </p>
          ) : (
            <ul className="space-y-2">
              {recommendations.map((rec, i) => (
                <li
                  key={`${rec.kind}-${rec.memberId}-${i}`}
                  className="rounded-xl border border-amber-200/80 bg-amber-50/80 p-3"
                >
                  <p className="text-xs font-semibold text-amber-900">
                    {rec.reason}
                  </p>
                  <p className="mt-1 text-[11px] text-amber-800/80">
                    Now: {rec.current}
                  </p>
                  <p className="text-[11px] text-amber-800/80">
                    Suggested: {rec.recommended}
                  </p>
                  {rec.applyPatch && (
                    <button
                      type="button"
                      onClick={() => applyEngineeringRecommendation(rec)}
                      className="mt-2 rounded-lg bg-[#2563EB] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#1D4ED8]"
                    >
                      Apply fix
                    </button>
                  )}
                </li>
              ))}
              {advisor
                .filter((a) => a.severity !== "info")
                .slice(0, 8)
                .map((a) => (
                  <li
                    key={a.id}
                    className={cn(
                      "rounded-xl border p-3",
                      a.severity === "critical"
                        ? "border-red-200 bg-red-50"
                        : a.severity === "warning"
                          ? "border-amber-200 bg-amber-50"
                          : "border-[#e8edf2] bg-[#fafbfc]"
                    )}
                  >
                    <p className="text-xs font-semibold text-[#121820]">
                      {a.title}
                    </p>
                    <p className="mt-1 text-[11px] text-[#5b6570]">{a.body}</p>
                    {a.suggestedAction && (
                      <p className="mt-1 text-[10px] font-medium text-[#2563EB]">
                        → {a.suggestedAction}
                      </p>
                    )}
                  </li>
                ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[#2563eb]" />
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[#5b6570]">
              AI layout suggestions
            </h3>
          </div>
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                applySuggestion(s);
                setRightOpen(false);
              }}
              className="group w-full rounded-xl border border-[#e8edf2] bg-[#fafbfc] p-3 text-left hover:border-[#2563EB]/50 hover:bg-[#EFF6FF]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#121820] group-hover:text-[#2563EB]">
                    {s.label}
                  </p>
                  <p className="mt-1 text-[11px] text-[#5b6570]">{s.description}</p>
                </div>
                <span className="shrink-0 rounded-md bg-[#EFF6FF] px-2 py-1 font-mono text-[10px] font-medium text-[#2563EB]">
                  {formatCurrency(s.estimatedCost)}
                </span>
              </div>
              <p className="mt-2 text-[10px] text-[#94a3b8]">
                {s.gridCols}×{s.gridRows} · {s.tradeoff}
              </p>
            </button>
          ))}
        </section>
      </div>
    </div>
  );
}

export default function RightCostPanel() {
  const compact = useIsCompact();
  const rightOpen = useStructureStore((s) => s.rightOpen);
  const setRightOpen = useStructureStore((s) => s.setRightOpen);

  if (compact) {
    if (!rightOpen) return null;
    return (
      <>
        <button
          type="button"
          className="fixed inset-0 z-40 bg-[#121820]/40 backdrop-blur-[2px]"
          aria-label="Close cost overlay"
          onClick={() => setRightOpen(false)}
        />
        <aside className="fixed inset-y-0 right-0 z-50 flex w-[min(100vw-2.5rem,22rem)] max-w-full flex-col border-l border-[#d8dee7] bg-white shadow-2xl pt-safe">
          <PanelBody onClose={() => setRightOpen(false)} />
        </aside>
      </>
    );
  }

  return (
    <aside
      className={cn(
        "relative z-20 hidden h-full shrink-0 flex-col border-l border-[#d8dee7] bg-white/95 backdrop-blur transition-all duration-200 lg:flex",
        rightOpen ? "w-[280px] xl:w-[320px]" : "w-12"
      )}
    >
      {!rightOpen ? (
        <button
          type="button"
          onClick={() => setRightOpen(true)}
          className="flex h-full w-full items-start justify-center pt-16"
          aria-label="Open cost panel"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#94a3b8] [writing-mode:vertical-rl]">
            Cost
          </span>
        </button>
      ) : (
        <PanelBody onClose={() => setRightOpen(false)} />
      )}
    </aside>
  );
}
