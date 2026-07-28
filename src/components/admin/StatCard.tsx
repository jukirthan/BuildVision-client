"use client";

import type { LucideIcon } from "lucide-react";
import Skeleton from "@/components/app/Skeleton";
import { cn } from "@/lib/utils";

type Tone = "accent" | "cyan" | "ai" | "success" | "warning" | "neutral";

const TONES: Record<Tone, { icon: string; ring: string }> = {
  accent: { icon: "text-accent", ring: "bg-accent/10" },
  cyan: { icon: "text-cyan", ring: "bg-cyan/10" },
  ai: { icon: "text-ai", ring: "bg-ai/10" },
  success: { icon: "text-success", ring: "bg-success/10" },
  warning: { icon: "text-warning", ring: "bg-warning/10" },
  neutral: { icon: "text-text-tertiary", ring: "bg-surface" },
};

export default function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "accent",
  loading,
  className,
}: {
  label: string;
  value: string | number | null;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
  loading?: boolean;
  className?: string;
}) {
  const t = TONES[tone];
  return (
    <div className={cn("card p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-text-tertiary">{label}</p>
        <span
          className={cn(
            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
            t.ring
          )}
        >
          <Icon size={14} className={t.icon} />
        </span>
      </div>
      {loading ? (
        <Skeleton className="mt-2.5 h-7 w-16" />
      ) : (
        <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-text-primary">
          {value ?? "—"}
        </p>
      )}
      {hint && !loading && (
        <p className="mt-0.5 text-xs text-text-tertiary">{hint}</p>
      )}
    </div>
  );
}
