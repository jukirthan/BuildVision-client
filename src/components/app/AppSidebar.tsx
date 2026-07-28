"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItemsForRole } from "@/components/app/nav";
import { useRole } from "@/lib/use-role";

export default function AppSidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const pathname = usePathname();
  const { role, ready, isAdmin } = useRole();
  const items = navItemsForRole(role);

  const content = (
    <div className="flex h-full flex-col bg-ink text-white/90">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-white/[0.06] px-4">
        <Image
          src="/buildvision.webp"
          alt="BuildVision"
          width={26}
          height={26}
          className="h-[26px] w-[26px] shrink-0 rounded-md object-contain"
        />
        {!collapsed && (
          <span className="flex min-w-0 items-center gap-2">
            <span className="truncate font-display text-sm font-semibold text-white">
              BuildVision
            </span>
            {ready && isAdmin && (
              <span className="shrink-0 rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                Admin
              </span>
            )}
          </span>
        )}
        <button
          type="button"
          onClick={onCloseMobile}
          className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-white/60 hover:bg-white/10 lg:hidden"
          aria-label="Close navigation"
        >
          <X size={16} />
        </button>
      </div>

      <nav
        className="touch-scroll flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3"
        aria-label="Primary"
      >
        {!ready &&
          Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className="mx-0.5 my-1 h-8 animate-pulse rounded-lg bg-white/[0.04]"
            />
          ))}
        {ready &&
          items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/[0.09] text-white"
                    : "text-white/60 hover:bg-white/[0.06] hover:text-white"
                )}
              >
                <item.icon
                  size={17}
                  className={cn(
                    "shrink-0",
                    active
                      ? "text-accent"
                      : "text-white/45 group-hover:text-white/80"
                  )}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
      </nav>

      <div className="hidden shrink-0 border-t border-white/[0.06] p-2.5 lg:block">
        <button
          type="button"
          onClick={onToggleCollapsed}
          className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-white/50 hover:bg-white/[0.06] hover:text-white"
        >
          {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "hidden shrink-0 border-r border-ink-border transition-[width] duration-150 lg:block",
          collapsed ? "w-sidebar-sm" : "w-sidebar"
        )}
      >
        {content}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={onCloseMobile}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 w-[16rem] max-w-[80vw] shadow-2xl">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
