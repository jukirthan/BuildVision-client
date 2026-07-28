"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Box,
  Building2,
  Calculator,
  Camera,
  ChevronDown,
  FileText,
  HardHat,
  Landmark,
  LayoutDashboard,
  Menu,
  Newspaper,
  Ruler,
  School,
  Sparkles,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { getToken } from "@/lib/api";

type MenuItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  tone?: "accent" | "ai" | "cyan";
};

type NavEntry =
  | { label: string; href: string }
  | { label: string; items: MenuItem[]; footer?: { href: string; label: string } };

const NAV: NavEntry[] = [
  {
    label: "Product",
    items: [
      {
        href: "/features#planner",
        label: "3D Planner",
        description: "Model pillars, beams, walls and slabs in the browser",
        icon: Box,
        tone: "accent",
      },
      {
        href: "/features#ai",
        label: "AI Assistant",
        description: "Layout suggestions and structural guidance",
        icon: Sparkles,
        tone: "ai",
      },
      {
        href: "/features#camera",
        label: "Camera Measurement",
        description: "Estimate real dimensions from a site photo",
        icon: Camera,
        tone: "cyan",
      },
      {
        href: "/features#materials",
        label: "Material Estimator",
        description: "Live concrete, steel and cost quantities",
        icon: Calculator,
        tone: "accent",
      },
      {
        href: "/features#reports",
        label: "Reports",
        description: "BOQ and measurement exports for site teams",
        icon: FileText,
        tone: "cyan",
      },
    ],
    footer: { href: "/features", label: "Explore all features" },
  },
  {
    label: "Solutions",
    items: [
      {
        href: "/#solutions",
        label: "Architecture Studios",
        description: "Concept massing to validated structure",
        icon: Building2,
        tone: "accent",
      },
      {
        href: "/#solutions",
        label: "Civil Engineering",
        description: "Structural checks and load estimation",
        icon: Ruler,
        tone: "cyan",
      },
      {
        href: "/#solutions",
        label: "Builders & Contractors",
        description: "Quantities, costs and site verification",
        icon: HardHat,
        tone: "accent",
      },
      {
        href: "/#solutions",
        label: "Real Estate & Government",
        description: "Feasibility studies and public projects",
        icon: Landmark,
        tone: "ai",
      },
      {
        href: "/#solutions",
        label: "Education",
        description: "Teach structural design interactively",
        icon: School,
        tone: "cyan",
      },
    ],
    footer: { href: "/#solutions", label: "See every industry" },
  },
  { label: "Pricing", href: "/pricing" },
  {
    label: "Resources",
    items: [
      {
        href: "/docs",
        label: "Documentation",
        description: "Guides for every tool in the platform",
        icon: FileText,
        tone: "accent",
      },
      {
        href: "/blog",
        label: "Blog",
        description: "Product updates and engineering notes",
        icon: Newspaper,
        tone: "cyan",
      },
      {
        href: "/about",
        label: "Company",
        description: "Who we are and what we believe",
        icon: Users,
        tone: "ai",
      },
      {
        href: "/contact",
        label: "Contact",
        description: "Talk to us about your projects",
        icon: ArrowRight,
        tone: "accent",
      },
    ],
  },
];

const TONE = {
  accent: "bg-accent-soft text-accent",
  ai: "bg-ai-soft text-ai",
  cyan: "bg-cyan-soft text-cyan",
};

export default function PublicHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false); // mobile
  const [menu, setMenu] = useState<string | null>(null); // mega menu
  const [authed, setAuthed] = useState(false);
  const pathname = usePathname();
  const reduce = useReducedMotion();
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
    setMenu(null);
  }, [pathname]);

  useEffect(() => {
    setAuthed(Boolean(getToken()));
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // The home hero is dark; the header floats transparent over it until the
  // page scrolls or a panel needs a solid backdrop.
  const overDark =
    pathname === "/" && !scrolled && !open && menu === null;

  const enter = (label: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setMenu(label);
  };
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setMenu(null), 140);
  };

  const activeEntry = NAV.find(
    (n) => "items" in n && n.label === menu
  ) as Extract<NavEntry, { items: MenuItem[] }> | undefined;

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 pt-safe transition-colors duration-300",
        overDark
          ? "border-b border-transparent bg-transparent"
          : "border-b border-border bg-white/80 shadow-xs backdrop-blur-xl"
      )}
      onMouseLeave={scheduleClose}
    >
      <div className="mx-auto flex h-16 max-w-wide items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2.5 font-display text-base font-semibold transition-colors",
            overDark ? "text-white" : "text-text-primary"
          )}
        >
          <Image
            src="/buildvision.webp"
            alt="BuildVision"
            width={28}
            height={28}
            className="h-7 w-7 rounded-md object-contain"
            priority
          />
          BuildVision
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center md:flex" aria-label="Primary">
          {NAV.map((entry) =>
            "href" in entry ? (
              <Link
                key={entry.label}
                href={entry.href}
                data-active={pathname === entry.href}
                onMouseEnter={() => enter("")}
                className={cn(
                  "link-underline rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  overDark
                    ? "text-white/75 hover:text-white"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {entry.label}
              </Link>
            ) : (
              <button
                key={entry.label}
                type="button"
                aria-expanded={menu === entry.label}
                aria-haspopup="true"
                onMouseEnter={() => enter(entry.label)}
                onClick={() =>
                  setMenu((m) => (m === entry.label ? null : entry.label))
                }
                className={cn(
                  "link-underline inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  overDark
                    ? "text-white/75 hover:text-white"
                    : "text-text-secondary hover:text-text-primary"
                )}
              >
                {entry.label}
                <ChevronDown
                  size={13}
                  className={cn(
                    "transition-transform duration-200",
                    menu === entry.label && "rotate-180"
                  )}
                />
              </button>
            )
          )}
        </nav>

        <div className="flex items-center gap-2">
          {authed ? (
            <Button href="/dashboard" variant="primary" size="sm">
              <LayoutDashboard size={14} /> Dashboard
            </Button>
          ) : (
            <>
              <Button
                href="/login"
                variant="ghost"
                size="sm"
                className={cn(
                  "hidden sm:inline-flex",
                  overDark && "!text-white/85 hover:!bg-white/10 hover:!text-white"
                )}
              >
                Sign in
              </Button>
              <Button href="/signup" variant="primary" size="sm">
                Sign up
              </Button>
            </>
          )}
          <button
            type="button"
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-lg border md:hidden",
              overDark
                ? "border-white/25 text-white"
                : "border-border-strong text-text-primary"
            )}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mega menu panel */}
      <AnimatePresence>
        {activeEntry && (
          <motion.div
            key={activeEntry.label}
            initial={reduce ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-x-0 top-full hidden border-b border-border bg-white/95 shadow-lg backdrop-blur-xl md:block"
            onMouseEnter={() => enter(activeEntry.label)}
            onMouseLeave={scheduleClose}
          >
            <div className="mx-auto grid max-w-wide gap-1 px-4 py-5 sm:px-6 lg:grid-cols-3 lg:px-8">
              {activeEntry.items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMenu(null)}
                  className="group flex items-start gap-3.5 rounded-xl p-3.5 transition-colors hover:bg-surface/70"
                >
                  <span
                    className={cn(
                      "mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      TONE[item.tone ?? "accent"]
                    )}
                  >
                    <item.icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1 text-sm font-semibold text-text-primary">
                      {item.label}
                      <ArrowRight
                        size={12}
                        className="-translate-x-1 opacity-0 transition-all duration-200 group-hover:translate-x-0 group-hover:opacity-100"
                      />
                    </span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-text-tertiary">
                      {item.description}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
            {activeEntry.footer && (
              <div className="border-t border-border bg-canvas/60">
                <div className="mx-auto max-w-wide px-4 py-3 sm:px-6 lg:px-8">
                  <Link
                    href={activeEntry.footer.href}
                    onClick={() => setMenu(null)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"
                  >
                    {activeEntry.footer.label} <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      {open && (
        <div
          className="max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-white px-4 py-4 md:hidden"
          id="mobile-nav"
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {NAV.map((entry) =>
              "href" in entry ? (
                <Link
                  key={entry.label}
                  href={entry.href}
                  className="rounded-md px-3 py-2.5 text-sm font-medium text-text-primary hover:bg-surface"
                >
                  {entry.label}
                </Link>
              ) : (
                <div key={entry.label} className="py-1">
                  <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary">
                    {entry.label}
                  </p>
                  {entry.items.map((item) => (
                    <Link
                      key={item.label}
                      href={item.href}
                      className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface"
                    >
                      <item.icon size={15} className="text-text-tertiary" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              )
            )}
            <div className="mt-2 border-t border-border pt-3">
              {authed ? (
                <Button href="/dashboard" className="w-full">
                  Open dashboard
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button href="/login" variant="secondary" className="flex-1">
                    Sign in
                  </Button>
                  <Button href="/signup" className="flex-1">
                    Sign up
                  </Button>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
