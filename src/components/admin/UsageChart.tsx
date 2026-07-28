"use client";

import type { TrendPoint } from "@/lib/api";
import { cn } from "@/lib/utils";

const TONES = {
  accent: "bg-accent",
  cyan: "bg-cyan",
  ai: "bg-ai",
} as const;

function shortDate(iso: string) {
  const d = new Date(`${iso}T00:00:00Z`);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Compact daily-count bar chart. Deliberately dependency-free — a 14-bar
 * series doesn't justify pulling a charting library into the bundle.
 */
export default function UsageChart({
  data,
  title,
  total,
  tone = "accent",
  emptyLabel = "No activity in this period",
}: {
  data: TrendPoint[];
  title: string;
  total?: string;
  tone?: keyof typeof TONES;
  emptyLabel?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const sum = data.reduce((acc, d) => acc + d.count, 0);

  return (
    <div className="card p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-display text-sm font-semibold text-text-primary">
          {title}
        </p>
        <p className="text-xs text-text-tertiary">
          {total ?? `${sum} total`}
        </p>
      </div>

      <div
        className="mt-5 flex h-28 items-end gap-[3px]"
        role="img"
        aria-label={`${title}: ${sum} over the last ${data.length} days`}
      >
        {data.map((d) => {
          const pct = (d.count / max) * 100;
          return (
            <div
              key={d.date}
              className="group relative flex h-full flex-1 items-end"
              title={`${shortDate(d.date)} — ${d.count}`}
            >
              <div
                className={cn(
                  "w-full rounded-sm transition-opacity duration-150",
                  d.count > 0 ? TONES[tone] : "bg-border",
                  d.count > 0 && "opacity-80 group-hover:opacity-100"
                )}
                style={{ height: `${Math.max(pct, 3)}%` }}
              />
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-text-tertiary">
        {data.length > 0 ? (
          <>
            <span>{shortDate(data[0].date)}</span>
            {sum === 0 && <span>{emptyLabel}</span>}
            <span>{shortDate(data[data.length - 1].date)}</span>
          </>
        ) : (
          <span>{emptyLabel}</span>
        )}
      </div>
    </div>
  );
}
