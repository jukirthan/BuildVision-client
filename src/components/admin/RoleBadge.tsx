"use client";

import { cn } from "@/lib/utils";

const STYLES: Record<string, string> = {
  admin: "bg-ai-soft text-ai border-ai/20",
  engineer: "bg-accent-soft text-accent border-accent-border",
  architect: "bg-cyan-soft text-cyan border-cyan/25",
  contractor: "bg-warning-soft text-warning border-warning/25",
  viewer: "bg-surface text-text-tertiary border-border",
};

export default function RoleBadge({
  role,
  className,
}: {
  role?: string | null;
  className?: string;
}) {
  const key = (role || "engineer").toLowerCase();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize",
        STYLES[key] ?? STYLES.viewer,
        className
      )}
    >
      {key}
    </span>
  );
}
