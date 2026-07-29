"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  Boxes,
  FolderKanban,
  Layers3,
  RefreshCw,
  ShieldCheck,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import AppShell from "@/components/app/AppShell";
import { ArchImage } from "@/components/app/ArchMedia";
import Skeleton from "@/components/app/Skeleton";
import Button from "@/components/ui/Button";
import RoleBadge from "@/components/admin/RoleBadge";
import StatCard from "@/components/admin/StatCard";
import UsageChart from "@/components/admin/UsageChart";
import { api, getUser, type AdminOverview } from "@/lib/api";
import { formatNumber } from "@/lib/utils";

function relativeDate(iso?: string | null) {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month ago" : `${months} months ago`;
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminName, setAdminName] = useState<string | null>(null);

  const load = useCallback(async (opts?: { soft?: boolean }) => {
    if (!opts?.soft) setLoading(true);
    const res = await api.adminOverview();
    if (res.success && res.data) {
      setData(res.data);
      setError(null);
    } else {
      setError(res.message || "Could not load usage analytics.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setAdminName(getUser()?.name?.split(" ")[0] || null);
    load();
  }, [load]);

  const users = data?.users;
  const content = data?.content;
  const activity = data?.activity;

  const roleRows = Object.entries(users?.by_role ?? {}).sort(
    (a, b) => b[1] - a[1]
  );
  const roleTotal = roleRows.reduce((sum, [, n]) => sum + n, 0) || 1;

  const contentRows = [
    { label: "Projects", value: content?.projects, icon: FolderKanban },
    { label: "Buildings", value: content?.buildings, icon: Boxes },
    { label: "Floors", value: content?.floors, icon: Layers3 },
    { label: "Pillars", value: content?.pillars, icon: Activity },
    { label: "Beams", value: content?.beams, icon: Activity },
    { label: "Slabs", value: content?.slabs, icon: Activity },
  ];

  return (
    <AppShell title="Admin overview">
      {/* Header */}
      <section className="relative isolate overflow-hidden border-b border-border">
        <ArchImage
          asset="skyline"
          className="absolute inset-0"
          overlay="sunset"
          sizes="(max-width: 768px) 100vw, 1200px"
          objectPosition="center 30%"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#020617]/85 via-[#020617]/55 to-[#020617]/20" />
        <div className="relative mx-auto flex max-w-content flex-col gap-6 px-4 py-9 sm:px-6 sm:py-12 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="max-w-xl">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
              <ShieldCheck size={13} /> Administration
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              {adminName ? `Welcome, ${adminName}` : "Workspace administration"}
            </h1>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/65">
              Manage accounts and access, and track how the platform is being
              used across every team.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Button href="/admin/users" size="sm">
                <UserCog size={15} /> Manage users
              </Button>
              <Button
                onClick={() => load({ soft: true })}
                variant="ghost"
                size="sm"
                className="!border !border-white/20 !bg-white/10 !text-white hover:!bg-white/20"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                Refresh
              </Button>
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-3 sm:gap-5">
            {[
              { label: "Users", value: users?.total },
              { label: "Projects", value: content?.projects },
              { label: "New / 7d", value: users?.new_7d },
            ].map((item) => (
              <div key={item.label}>
                <dd className="font-display text-2xl font-semibold tabular-nums text-white sm:text-3xl">
                  {loading ? "—" : (item.value ?? 0)}
                </dd>
                <dt className="mt-0.5 text-[11px] uppercase tracking-wide text-white/50">
                  {item.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="mx-auto max-w-content px-4 py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-danger/25 bg-danger-soft px-4 py-3">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-danger" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-text-primary">{error}</p>
              <p className="mt-0.5 text-xs text-text-secondary">
                Usage analytics require an administrator account and a running
                API.
              </p>
            </div>
            <Button onClick={() => void load()} variant="secondary" size="sm">
              Retry
            </Button>
          </div>
        )}

        {/* Key metrics */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total users"
            value={users?.total ?? 0}
            hint={`${users?.new_30d ?? 0} joined in the last 30 days`}
            icon={Users}
            tone="accent"
            loading={loading}
          />
          <StatCard
            label="New this week"
            value={users?.new_7d ?? 0}
            hint="Sign-ups in the last 7 days"
            icon={UserPlus}
            tone="success"
            loading={loading}
          />
          <StatCard
            label="Active creators"
            value={users?.active_creators ?? 0}
            hint={
              users?.total
                ? `${Math.round(((users.active_creators || 0) / users.total) * 100)}% of all users`
                : "Users with at least one project"
            }
            icon={Activity}
            tone="cyan"
            loading={loading}
          />
          <StatCard
            label="Projects created"
            value={content?.projects ?? 0}
            hint={`${activity?.projects_7d ?? 0} in the last 7 days`}
            icon={FolderKanban}
            tone="ai"
            loading={loading}
          />
        </div>

        {/* Adoption trends */}
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          {loading ? (
            <>
              <Skeleton className="h-52 rounded-xl" />
              <Skeleton className="h-52 rounded-xl" />
            </>
          ) : (
            <>
              <UsageChart
                title="Sign-ups · last 14 days"
                data={activity?.signups_by_day ?? []}
                tone="accent"
                emptyLabel="No new sign-ups"
              />
              <UsageChart
                title="Projects created · last 14 days"
                data={activity?.projects_by_day ?? []}
                tone="cyan"
                emptyLabel="No new projects"
              />
            </>
          )}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          {/* Role distribution */}
          <div className="card p-5">
            <p className="font-display text-sm font-semibold text-text-primary">
              Access by role
            </p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              How permissions are distributed
            </p>
            <div className="mt-4 space-y-3.5">
              {loading &&
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-9" />
                ))}
              {!loading && roleRows.length === 0 && (
                <p className="py-4 text-sm text-text-secondary">No users yet.</p>
              )}
              {!loading &&
                roleRows.map(([role, count]) => (
                  <div key={role}>
                    <div className="flex items-center justify-between gap-2">
                      <RoleBadge role={role} />
                      <span className="text-xs tabular-nums text-text-secondary">
                        {count} · {Math.round((count / roleTotal) * 100)}%
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-sunken">
                      <div
                        className="h-full rounded-full bg-accent"
                        style={{ width: `${(count / roleTotal) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
            <Link
              href="/admin/users"
              className="mt-5 inline-block text-xs font-medium text-accent hover:underline"
            >
              Manage roles →
            </Link>
          </div>

          {/* Platform content */}
          <div className="card p-5 lg:col-span-2">
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <p className="font-display text-sm font-semibold text-text-primary">
                  Modelled on the platform
                </p>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  Total structural objects created by all users
                </p>
              </div>
              {!loading && (
                <p className="text-xs text-text-tertiary">
                  avg {formatNumber(data?.averages.buildings_per_project ?? 0, 2)}{" "}
                  buildings / project
                </p>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {contentRows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-lg border border-border bg-surface/60 px-3.5 py-3"
                >
                  <p className="text-[11px] font-medium uppercase tracking-wide text-text-tertiary">
                    {row.label}
                  </p>
                  {loading ? (
                    <Skeleton className="mt-1.5 h-6 w-12" />
                  ) : (
                    <p className="mt-0.5 font-display text-xl font-semibold tabular-nums text-text-primary">
                      {row.value ?? 0}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Most active users */}
        <div className="mt-5 grid gap-5 lg:grid-cols-3">
          <div className="card overflow-hidden lg:col-span-2">
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <p className="font-display text-sm font-semibold text-text-primary">
                Most active users
              </p>
              <Link
                href="/admin/users"
                className="text-xs font-medium text-accent hover:underline"
              >
                View all
              </Link>
            </div>
            {loading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10" />
                ))}
              </div>
            ) : (data?.top_users?.length ?? 0) === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-text-secondary">
                No users yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[34rem] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-text-tertiary">
                      <th className="px-5 py-2.5 font-medium">User</th>
                      <th className="px-5 py-2.5 font-medium">Role</th>
                      <th className="px-5 py-2.5 text-right font-medium">
                        Projects
                      </th>
                      <th className="px-5 py-2.5 text-right font-medium">
                        Buildings
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {data?.top_users.map((u) => (
                      <tr key={u.id} className="hover:bg-surface/60">
                        <td className="px-5 py-3">
                          <p className="font-medium text-text-primary">{u.name}</p>
                          <p className="truncate text-xs text-text-tertiary">
                            {u.email}
                          </p>
                        </td>
                        <td className="px-5 py-3">
                          <RoleBadge role={u.role} />
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-text-secondary">
                          {u.project_count ?? 0}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-text-secondary">
                          {u.building_count ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent sign-ups */}
          <div className="card overflow-hidden">
            <div className="border-b border-border px-5 py-4">
              <p className="font-display text-sm font-semibold text-text-primary">
                Recent sign-ups
              </p>
            </div>
            <ul className="divide-y divide-border">
              {loading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="px-5 py-3">
                    <Skeleton className="h-8" />
                  </li>
                ))}
              {!loading && (data?.recent_users?.length ?? 0) === 0 && (
                <li className="px-5 py-10 text-center text-sm text-text-secondary">
                  Nothing yet.
                </li>
              )}
              {!loading &&
                data?.recent_users.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold uppercase text-accent">
                      {u.name?.slice(0, 2) || "?"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-text-primary">
                        {u.name}
                      </p>
                      <p className="truncate text-xs text-text-tertiary">
                        {relativeDate(u.created_at)}
                      </p>
                    </div>
                    <RoleBadge role={u.role} />
                  </li>
                ))}
            </ul>
          </div>
        </div>

        {/* Recent projects across the workspace */}
        <div className="mt-5 card overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <p className="font-display text-sm font-semibold text-text-primary">
                Latest projects
              </p>
              <p className="mt-0.5 text-xs text-text-tertiary">
                Newest work across every account
              </p>
            </div>
            <Link
              href="/projects"
              className="shrink-0 text-xs font-medium text-accent hover:underline"
            >
              All projects
            </Link>
          </div>
          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (data?.recent_projects?.length ?? 0) === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-text-secondary">
              No projects have been created yet.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {data?.recent_projects.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {p.name}
                    </p>
                    <p className="truncate text-xs text-text-tertiary">
                      {p.owner_name || "Unknown owner"} ·{" "}
                      {p.location || "No location"}
                    </p>
                  </div>
                  <span className="text-xs capitalize text-text-secondary">
                    {p.status || "planning"}
                  </span>
                  <span className="w-24 shrink-0 text-right text-xs text-text-tertiary">
                    {relativeDate(p.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
}
