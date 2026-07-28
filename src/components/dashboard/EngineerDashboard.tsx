"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Box,
  Calculator,
  Camera,
  CloudSun,
  FolderKanban,
  Layers3,
  Plus,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import AppShell from "@/components/app/AppShell";
import { ArchImage } from "@/components/app/ArchMedia";
import Skeleton from "@/components/app/Skeleton";
import Button from "@/components/ui/Button";
import { api, getUser, type ProjectDto } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

const ACTIVITY = [
  { id: 1, text: "Uploaded blueprint for Tower A", time: "2h ago" },
  { id: 2, text: "Applied AI layout: Balanced grid", time: "5h ago" },
  { id: 3, text: "Exported cost report (PDF)", time: "Yesterday" },
  { id: 4, text: "Added Building 2 to Downtown Office Complex", time: "2 days ago" },
];

const SUGGESTIONS = [
  {
    label: "Balanced grid",
    tradeoff: "Best cost-to-span balance for most apartments.",
  },
  {
    label: "Economy layout",
    tradeoff: "Fewer pillars; beams carry more load.",
  },
  {
    label: "Dense support",
    tradeoff: "Higher material use, simpler short-span beams.",
  },
];

const QUICK_ACTIONS = [
  { href: "/projects", label: "New project", icon: Plus, asset: "sunset" as const },
  { href: "/planner", label: "Open 3D planner", icon: Box, asset: "hero" as const },
  {
    href: "/camera-measurement",
    label: "Measure with camera",
    icon: Camera,
    asset: "detail" as const,
  },
  {
    href: "/material-estimator",
    label: "Estimate materials",
    icon: Calculator,
    asset: "skyline" as const,
  },
];

export default function EngineerDashboard() {
  const [userName, setUserName] = useState<string | null>(null);
  const [projects, setProjects] = useState<ProjectDto[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = getUser();
    setUserName(u?.name?.split(" ")[0] || null);

    (async () => {
      const res = await api.listProjects();
      setProjects(res.success && res.data ? res.data : []);
      setLoading(false);
    })();
  }, []);

  const totalBuildings =
    projects?.reduce((sum, p) => sum + (p.buildings?.length ?? 0), 0) ?? 0;

  const stats = [
    {
      label: "Active projects",
      value: loading ? null : String(projects?.length ?? 0),
      icon: FolderKanban,
    },
    {
      label: "Buildings",
      value: loading ? null : String(totalBuildings),
      icon: Layers3,
    },
    {
      label: "Est. portfolio cost",
      value: loading ? null : formatCurrency(totalBuildings * 184000 || 0),
      icon: TrendingUp,
    },
    {
      label: "Team members",
      value: loading ? null : "1",
      icon: Sparkles,
    },
  ];

  return (
    <AppShell title="Dashboard">
      {/* Cinematic welcome — full-bleed architecture photo */}
      <section className="relative isolate overflow-hidden border-b border-border">
        <ArchImage
          asset="sunset"
          className="absolute inset-0"
          overlay="sunset"
          priority
          sizes="100vw"
          objectPosition="68% 42%"
          imageClassName="dash-hero-img"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0c12]/78 via-[#0a0c12]/35 to-transparent" />
        <div className="relative mx-auto flex max-w-content flex-col gap-6 px-4 py-10 sm:px-6 sm:py-14 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-16">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
              BuildVision · Overview
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {userName ? `Welcome back, ${userName}` : "Welcome back"}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/65">
              Design structures in 3D, estimate materials, and keep every
              project moving — from brief to report.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Button href="/projects" size="sm">
                <Plus size={15} /> New project
              </Button>
              <Button href="/planner" variant="ghost" size="sm" className="!border-white/20 !bg-white/10 !text-white hover:!bg-white/20">
                Open planner <ArrowRight size={14} />
              </Button>
            </div>
          </div>
          <div className="hidden overflow-hidden rounded-2xl border border-white/20 shadow-2xl sm:block sm:h-28 sm:w-44 lg:h-32 lg:w-52">
            <ArchImage
              asset="sunset"
              className="h-full w-full"
              sizes="220px"
              objectPosition="80% 45%"
              imageClassName="scale-110"
            />
          </div>
        </div>
      </section>

      <div className="relative mx-auto max-w-content px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="card border-white/60 bg-white/85 p-4 shadow-sm backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-text-tertiary">{s.label}</p>
                <s.icon size={15} className="text-text-tertiary" />
              </div>
              {s.value === null ? (
                <Skeleton className="mt-2 h-7 w-20" />
              ) : (
                <p className="mt-1 font-display text-2xl font-semibold text-text-primary">
                  {s.value}
                </p>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {/* Recent projects */}
          <div className="card overflow-hidden border-white/60 bg-white/90 backdrop-blur-sm lg:col-span-2">
            <div className="relative h-28 overflow-hidden sm:h-36">
              <ArchImage
                asset="sunset"
                className="absolute inset-0"
                overlay="sunset"
                sizes="(max-width: 1024px) 100vw, 66vw"
                objectPosition="75% 50%"
              />
              <div className="absolute inset-0 flex items-end justify-between px-5 py-4">
                <div>
                  <p className="font-display text-sm font-semibold text-white">
                    Recent projects
                  </p>
                  <p className="text-[11px] text-white/60">
                    Pick up where you left off
                  </p>
                </div>
                <Link
                  href="/projects"
                  className="text-xs font-medium text-white/80 hover:text-white hover:underline"
                >
                  View all
                </Link>
              </div>
            </div>
            <ul className="divide-y divide-border">
              {loading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-3 px-5 py-3.5">
                    <Skeleton className="h-9 w-9 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </li>
                ))}
              {!loading && (projects?.length ?? 0) === 0 && (
                <li className="px-5 py-8 text-center text-sm text-text-secondary">
                  No projects yet.{" "}
                  <Link href="/projects" className="text-accent hover:underline">
                    Create your first project
                  </Link>
                  .
                </li>
              )}
              {!loading &&
                projects?.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex items-center gap-3 px-5 py-3.5">
                    <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg">
                      <ArchImage
                        asset={
                          (["sunset", "skyline", "modern", "detail"] as const)[
                            p.id % 4
                          ]
                        }
                        className="absolute inset-0"
                        sizes="36px"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {p.name}
                      </p>
                      <p className="truncate text-xs text-text-tertiary">
                        {p.buildings?.length ?? 0} building
                        {(p.buildings?.length ?? 0) === 1 ? "" : "s"} ·{" "}
                        {p.location || "No location"}
                      </p>
                    </div>
                    <Link
                      href={`/planner?projectId=${p.id}&name=${encodeURIComponent(p.name)}`}
                      className="shrink-0 text-xs font-medium text-accent hover:underline"
                    >
                      Open →
                    </Link>
                  </li>
                ))}
            </ul>
          </div>

          {/* Quick actions */}
          <div className="card overflow-hidden border-white/60 bg-white/90 backdrop-blur-sm">
            <div className="border-b border-border px-5 py-4">
              <p className="font-display text-sm font-semibold text-text-primary">
                Quick actions
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2.5 p-4">
              {QUICK_ACTIONS.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="group relative flex min-h-[5.5rem] flex-col justify-end overflow-hidden rounded-xl border border-border p-3"
                >
                  <ArchImage
                    asset={a.asset}
                    className="absolute inset-0"
                    overlay="ink"
                    sizes="200px"
                    imageClassName="group-hover:scale-110"
                  />
                  <a.icon size={16} className="relative z-[1] text-white/90" />
                  <span className="relative z-[1] mt-2 text-xs font-semibold leading-tight text-white">
                    {a.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <div className="card border-white/60 bg-white/90 backdrop-blur-sm">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <Sparkles size={15} className="text-accent" />
              <p className="font-display text-sm font-semibold text-text-primary">
                AI suggestions
              </p>
            </div>
            <ul className="divide-y divide-border">
              {SUGGESTIONS.map((s) => (
                <li key={s.label} className="px-5 py-3.5">
                  <p className="text-sm font-medium text-text-primary">{s.label}</p>
                  <p className="mt-0.5 text-xs text-text-secondary">{s.tradeoff}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="card border-white/60 bg-white/90 backdrop-blur-sm">
            <div className="border-b border-border px-5 py-4">
              <p className="font-display text-sm font-semibold text-text-primary">
                Recent activity
              </p>
            </div>
            <ul className="divide-y divide-border">
              {ACTIVITY.map((a) => (
                <li key={a.id} className="flex items-start gap-2.5 px-5 py-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                  <div>
                    <p className="text-sm text-text-primary">{a.text}</p>
                    <p className="text-xs text-text-tertiary">{a.time}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="card overflow-hidden border-white/60 bg-white/90 backdrop-blur-sm">
            <div className="relative h-24">
              <ArchImage
                asset="sunset"
                className="absolute inset-0"
                overlay="sunset"
                sizes="400px"
                objectPosition="60% 70%"
              />
              <div className="absolute inset-0 flex items-end gap-2 px-5 py-4">
                <CloudSun size={15} className="text-white/80" />
                <p className="font-display text-sm font-semibold text-white">
                  Site conditions
                </p>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-2xl font-semibold text-text-primary">
                    28°C
                  </p>
                  <p className="text-xs text-text-tertiary">Colombo · Clear skies</p>
                </div>
                <CloudSun size={32} className="text-warning" />
              </div>
              <div className="mt-5 space-y-3">
                <p className="text-xs font-medium text-text-tertiary">
                  Construction progress
                </p>
                {[
                  { label: "Foundation", pct: 100 },
                  { label: "Structure", pct: 62 },
                  { label: "Finishes", pct: 18 },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between text-xs text-text-secondary">
                      <span>{row.label}</span>
                      <span>{row.pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 card overflow-hidden border-white/60 bg-white/90 backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <p className="font-display text-sm font-semibold text-text-primary">
              Project timeline
            </p>
          </div>
          <div className="overflow-x-auto p-5">
            <ol className="flex min-w-[640px] items-start gap-0">
              {[
                { label: "Brief", done: true },
                { label: "Blueprint upload", done: true },
                { label: "3D design", done: true },
                { label: "Measurement", done: false },
                { label: "Material estimate", done: false },
                { label: "Report export", done: false },
              ].map((step, i, arr) => (
                <li key={step.label} className="flex flex-1 items-center gap-0">
                  <div className="flex flex-col items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                        step.done
                          ? "bg-accent text-white"
                          : "bg-surface text-text-tertiary"
                      }`}
                    >
                      {i + 1}
                    </span>
                    <span className="whitespace-nowrap text-xs text-text-secondary">
                      {step.label}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <div
                      className={`mx-1.5 h-px flex-1 ${
                        step.done ? "bg-accent" : "bg-border"
                      }`}
                    />
                  )}
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button href="/planner" variant="ghost" size="sm">
            Continue in planner <ArrowRight size={14} />
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
