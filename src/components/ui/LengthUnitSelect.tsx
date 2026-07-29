"use client";

import { cn } from "@/lib/utils";
import { useLengthUnit } from "@/lib/use-length-unit";
import {
  LENGTH_UNITS,
  LENGTH_UNIT_LABELS,
  LENGTH_UNIT_SHORT,
  type LengthUnit,
} from "@/lib/units";

type Props = {
  className?: string;
  /** compact = short labels (m/cm/ft/in); full = "Meters (m)" */
  density?: "compact" | "full";
  /** Optional local override instead of the shared preference. */
  value?: LengthUnit;
  onChange?: (unit: LengthUnit) => void;
  id?: string;
  "aria-label"?: string;
};

/**
 * Segmented control / select for length display units.
 * Writes to the shared preference unless controlled via value/onChange.
 */
export default function LengthUnitSelect({
  className,
  density = "compact",
  value,
  onChange,
  id,
  "aria-label": ariaLabel = "Length unit",
}: Props) {
  const { unit: shared, setUnit } = useLengthUnit();
  const unit = value ?? shared;
  const change = onChange ?? setUnit;

  if (density === "full") {
    return (
      <select
        id={id}
        aria-label={ariaLabel}
        value={unit}
        onChange={(e) => change(e.target.value as LengthUnit)}
        className={cn("auth-input", className)}
      >
        {LENGTH_UNITS.map((u) => (
          <option key={u} value={u}>
            {LENGTH_UNIT_LABELS[u]}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex rounded-lg border border-border bg-canvas-subtle p-0.5",
        className
      )}
    >
      {LENGTH_UNITS.map((u) => {
        const active = unit === u;
        return (
          <button
            key={u}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => change(u)}
            className={cn(
              "min-w-[2.25rem] rounded-md px-2 py-1 text-xs font-semibold transition-colors",
              active
                ? "bg-white text-text-primary shadow-sm"
                : "text-text-tertiary hover:text-text-secondary"
            )}
          >
            {LENGTH_UNIT_SHORT[u]}
          </button>
        );
      })}
    </div>
  );
}
