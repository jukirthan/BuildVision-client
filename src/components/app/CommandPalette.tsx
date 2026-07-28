"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { navItemsForRole } from "@/components/app/nav";
import { useRole } from "@/lib/use-role";

export default function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { role } = useRole();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const results = useMemo(() => {
    const items = navItemsForRole(role);
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );
  }, [query, role]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter") {
        const item = results[index];
        if (item) {
          router.push(item.href);
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, results, index, router, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center px-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-label="Command palette"
        className="relative w-full max-w-md overflow-hidden rounded-xl border border-border bg-white shadow-lg"
      >
        <div className="flex items-center gap-2.5 border-b border-border px-3.5 py-3">
          <Search size={16} className="text-text-tertiary" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
            placeholder="Jump to…"
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-tertiary"
          />
          <span className="kbd">Esc</span>
        </div>
        <ul className="max-h-72 overflow-y-auto py-1.5">
          {results.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-text-tertiary">
              No matches
            </li>
          )}
          {results.map((item, i) => (
            <li key={item.href}>
              <button
                type="button"
                onClick={() => {
                  router.push(item.href);
                  onClose();
                }}
                onMouseEnter={() => setIndex(i)}
                className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm ${
                  i === index ? "bg-surface" : ""
                }`}
              >
                <item.icon size={16} className="shrink-0 text-text-tertiary" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-text-primary">
                    {item.label}
                  </span>
                  <span className="block truncate text-xs text-text-tertiary">
                    {item.description}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
