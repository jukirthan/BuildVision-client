"use client";

import { Copy, Grid3X3, Plus, X } from "lucide-react";
import { useStructureStore } from "@/store/useStructureStore";
import type { FloorCreationMode } from "@/lib/floor-structure";

const OPTIONS: Array<{
  mode: FloorCreationMode;
  title: string;
  description: string;
  icon: typeof Copy;
}> = [
  {
    mode: "copy_layout",
    title: "Copy previous structural layout",
    description: "Copy pillars, beams, slabs and floor accessories with new IDs. Column stack IDs stay connected.",
    icon: Copy,
  },
  {
    mode: "pillars_only",
    title: "Copy only pillar positions",
    description: "Place independent default-size column segments at the previous floor’s positions.",
    icon: Grid3X3,
  },
  {
    mode: "empty",
    title: "Create an empty floor",
    description: "Start with no structural members or accessories on the new floor.",
    icon: Plus,
  },
];

export default function FloorCreationDialog() {
  const open = useStructureStore((state) => state.floorCreationOpen);
  const setOpen = useStructureStore((state) => state.setFloorCreationOpen);
  const addFloor = useStructureStore((state) => state.addFloor);
  const source = useStructureStore((state) => state.floors[state.floors.length - 1]);
  if (!open) return null;

  const choose = (mode: FloorCreationMode) => {
    addFloor({ mode, sourceFloorId: source?.id });
    setOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/35 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2563EB]">New storey</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">How should the new floor start?</h2>
            <p className="mt-1 text-xs text-slate-500">Members are always deep-copied and can be edited independently.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {OPTIONS.map(({ mode, title, description, icon: Icon }) => (
            <button
              key={mode}
              type="button"
              onClick={() => choose(mode)}
              className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 px-3 py-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
            >
              <span className="mt-0.5 rounded-xl bg-blue-100 p-2 text-blue-700"><Icon size={16} /></span>
              <span>
                <span className="block text-sm font-semibold text-slate-900">{title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
