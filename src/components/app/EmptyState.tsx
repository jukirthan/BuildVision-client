import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border-strong bg-canvas-subtle px-6 py-14 text-center">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white text-text-tertiary shadow-xs">
        <Icon size={20} />
      </span>
      <p className="font-display text-sm font-semibold text-text-primary">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-text-secondary">{description}</p>
      )}
      {action}
    </div>
  );
}
