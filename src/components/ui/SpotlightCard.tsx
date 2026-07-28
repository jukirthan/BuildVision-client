"use client";

import { useRef, type ReactNode, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

/** Mouse-follow spotlight on frosted cards */
export default function SpotlightCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      className={cn(
        "premium-card spotlight-border group",
        "before:pointer-events-none",
        className
      )}
      style={
        {
          backgroundImage:
            "radial-gradient(480px circle at var(--mx, 50%) var(--my, 50%), rgba(37,99,235,0.14), transparent 42%)",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
