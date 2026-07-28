"use client";

import Link from "next/link";
import {
  type MouseEvent,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
  variant?: "primary" | "ghost";
  type?: "button" | "submit";
  disabled?: boolean;
};

export default function MagneticButton({
  children,
  href,
  onClick,
  className,
  variant = "primary",
  type = "button",
  disabled,
}: Props) {
  const ref = useRef<HTMLAnchorElement | HTMLButtonElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onMove = useCallback((e: MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    setOffset({ x: x * 0.18, y: y * 0.18 });
  }, []);

  const onLeave = useCallback(() => setOffset({ x: 0, y: 0 }), []);

  const classes = cn(
    "group relative inline-flex min-h-12 items-center justify-center gap-2 overflow-hidden rounded-xl px-6 text-base font-medium transition-shadow duration-300 will-change-transform",
    variant === "primary"
      ? "bg-accent text-white shadow-lift hover:shadow-[0_24px_60px_-18px_rgba(37,99,235,0.6)]"
      : "border border-white/20 bg-white/5 text-white backdrop-blur hover:border-white/35 hover:bg-white/10",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
    "disabled:pointer-events-none disabled:opacity-50",
    className
  );

  const style = {
    transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
    transition: "transform 0.2s cubic-bezier(0.22, 1, 0.36, 1)",
  };

  const shine = (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
    />
  );

  if (href) {
    return (
      <Link
        ref={ref as React.RefObject<HTMLAnchorElement>}
        href={href}
        className={classes}
        style={style}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        {shine}
        <span className="relative z-[1]">{children}</span>
      </Link>
    );
  }

  return (
    <button
      ref={ref as React.RefObject<HTMLButtonElement>}
      type={type}
      disabled={disabled}
      className={classes}
      style={style}
      onClick={onClick}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {shine}
      <span className="relative z-[1]">{children}</span>
    </button>
  );
}
