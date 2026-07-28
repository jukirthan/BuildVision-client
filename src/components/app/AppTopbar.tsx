"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Settings,
  User as UserIcon,
  UserCog,
} from "lucide-react";
import { clearAuth, getUser } from "@/lib/api";
import { useRole } from "@/lib/use-role";

const NOTIFICATIONS = [
  {
    id: 1,
    title: "AI layout suggestion ready",
    detail: "3 column grid options for Tower A",
    time: "12m ago",
  },
  {
    id: 2,
    title: "Material estimate updated",
    detail: "Downtown Office Complex — concrete +4.2 m³",
    time: "1h ago",
  },
  {
    id: 3,
    title: "Measurement report exported",
    detail: "Site visit — Building 2 · PDF",
    time: "Yesterday",
  },
];

/** Admins care about accounts and adoption, not geometry. */
const ADMIN_NOTIFICATIONS = [
  {
    id: 1,
    title: "New account created",
    detail: "A teammate joined the workspace",
    time: "Today",
  },
  {
    id: 2,
    title: "Role change pending review",
    detail: "Check the user directory for recent edits",
    time: "1h ago",
  },
  {
    id: 3,
    title: "Weekly usage summary",
    detail: "Sign-ups and project activity are on the dashboard",
    time: "Yesterday",
  },
];

function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [onOutside]);
  return ref;
}

export default function AppTopbar({
  onOpenMobileNav,
  onOpenSearch,
  title,
}: {
  onOpenMobileNav: () => void;
  onOpenSearch: () => void;
  title?: string;
}) {
  const router = useRouter();
  const { role, ready, isAdmin } = useRole();
  const [userName, setUserName] = useState<string | null>(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);

  useEffect(() => {
    const u = getUser();
    setUserName(u?.name || null);
  }, []);

  const notifRef = useClickOutside(() => setNotifOpen(false));
  const userRef = useClickOutside(() => setUserOpen(false));
  const workspaceRef = useClickOutside(() => setWorkspaceOpen(false));

  const initials = (userName || "U")
    .split(" ")
    .map((s) => s.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const signOut = () => {
    clearAuth();
    router.push("/login");
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-white px-3 sm:px-4">
      <button
        type="button"
        onClick={onOpenMobileNav}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-surface lg:hidden"
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      {/* Workspace switcher */}
      <div className="relative" ref={workspaceRef}>
        <button
          type="button"
          onClick={() => setWorkspaceOpen((v) => !v)}
          className="hidden items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-text-primary hover:bg-surface sm:inline-flex"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-md bg-accent-soft text-[10px] font-bold text-accent">
            P
          </span>
          Personal
          <ChevronDown size={14} className="text-text-tertiary" />
        </button>
        {workspaceOpen && (
          <div className="absolute left-0 top-full z-40 mt-1 w-56 rounded-xl border border-border bg-white p-1.5 shadow-md">
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-text-primary hover:bg-surface"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-accent-soft text-[10px] font-bold text-accent">
                P
              </span>
              Personal workspace
            </button>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              disabled
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-text-tertiary"
            >
              + Create workspace (soon)
            </button>
          </div>
        )}
      </div>

      {title && (
        <>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <p className="hidden truncate text-sm font-medium text-text-secondary sm:block">
            {title}
          </p>
        </>
      )}

      {/* Search trigger */}
      <button
        type="button"
        onClick={onOpenSearch}
        className="ml-auto flex h-9 min-w-0 max-w-xs flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-text-tertiary transition hover:border-border-strong sm:max-w-sm"
      >
        <Search size={15} />
        <span className="truncate">Search…</span>
        <span className="kbd ml-auto hidden sm:inline-flex">⌘K</span>
      </button>

      {/* Notifications */}
      <div className="relative" ref={notifRef}>
        <button
          type="button"
          onClick={() => setNotifOpen((v) => !v)}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-text-secondary hover:bg-surface"
          aria-label="Notifications"
        >
          <Bell size={17} />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-accent" />
        </button>
        {notifOpen && (
          <div className="absolute right-0 top-full z-40 mt-1 w-80 overflow-hidden rounded-xl border border-border bg-white shadow-md">
            <div className="border-b border-border px-4 py-2.5">
              <p className="text-sm font-semibold text-text-primary">Notifications</p>
            </div>
            <ul className="max-h-80 overflow-y-auto">
              {(isAdmin ? ADMIN_NOTIFICATIONS : NOTIFICATIONS).map((n) => (
                <li key={n.id} className="border-b border-border px-4 py-3 last:border-0">
                  <p className="text-sm font-medium text-text-primary">{n.title}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">{n.detail}</p>
                  <p className="mt-1 text-[11px] text-text-tertiary">{n.time}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* User menu */}
      <div className="relative" ref={userRef}>
        <button
          type="button"
          onClick={() => setUserOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-lg py-1 pl-1 pr-1.5 hover:bg-surface"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-white">
            {initials}
          </span>
          <ChevronDown size={14} className="hidden text-text-tertiary sm:block" />
        </button>
        {userOpen && (
          <div className="absolute right-0 top-full z-40 mt-1 w-56 rounded-xl border border-border bg-white p-1.5 shadow-md">
            <div className="px-2.5 py-2">
              <p className="truncate text-sm font-medium text-text-primary">
                {userName || "Signed in"}
              </p>
              {ready && role && (
                <p className="mt-0.5 text-xs capitalize text-text-tertiary">
                  {role}
                </p>
              )}
            </div>
            <div className="my-1 h-px bg-border" />
            {isAdmin && (
              <Link
                href="/admin/users"
                className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-text-primary hover:bg-surface"
              >
                <UserCog size={15} /> User management
              </Link>
            )}
            <Link
              href="/profile"
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-text-primary hover:bg-surface"
            >
              <UserIcon size={15} /> Profile
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-text-primary hover:bg-surface"
            >
              <Settings size={15} /> Settings
            </Link>
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              onClick={signOut}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-danger hover:bg-danger-soft"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
