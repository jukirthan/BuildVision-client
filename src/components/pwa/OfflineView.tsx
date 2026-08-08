"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, FolderKanban, RefreshCw, WifiOff } from "lucide-react";

export default function OfflineView() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-ink px-4 py-12 text-white sm:px-6">
      <div className="w-full max-w-xl">
        <Link
          href="/"
          prefetch={false}
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-white/65 transition hover:text-white"
        >
          <ArrowLeft size={15} /> Back to BuildVision
        </Link>

        <section className="rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur sm:p-9">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/20">
            <WifiOff size={25} />
          </div>
          <p className="mt-7 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-300">
            Connection paused
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            You’re offline
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/65 sm:text-base">
            BuildVision can still open public pages you have visited, but the Flask API is unavailable right now. Nothing was saved or submitted while disconnected.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <Link
              href="/features"
              prefetch={false}
              className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 transition hover:border-blue-300/50 hover:bg-white/10"
            >
              <BookOpen size={17} className="text-blue-300" />
              <p className="mt-3 text-sm font-semibold">Browse cached features</p>
              <p className="mt-1 text-xs leading-relaxed text-white/50">Available if this page was opened before.</p>
            </Link>
            <Link
              href="/projects"
              prefetch={false}
              className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 transition hover:border-blue-300/50 hover:bg-white/10"
            >
              <FolderKanban size={17} className="text-blue-300" />
              <p className="mt-3 text-sm font-semibold">Try your workspace</p>
              <p className="mt-1 text-xs leading-relaxed text-white/50">Project data, login, saves, sync, and analysis need the API.</p>
            </Link>
          </div>

          <div className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-300/[0.08] p-4 text-xs leading-relaxed text-amber-100/80">
            The 3D planner may open its local interface, but structural saves, FEA/analysis, account actions, and server-backed recommendations stay disabled until the connection returns.
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-7 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-ink transition hover:bg-blue-50"
          >
            <RefreshCw size={15} /> Try Again
          </button>
        </section>
      </div>
    </main>
  );
}
