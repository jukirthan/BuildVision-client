"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Building2, ChevronDown, FolderKanban, Plus } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import PageHeader from "@/components/app/PageHeader";
import EmptyState from "@/components/app/EmptyState";
import Skeleton from "@/components/app/Skeleton";
import Button from "@/components/ui/Button";
import NewProjectDialog, {
  type NewProjectInput,
} from "@/components/projects/NewProjectDialog";
import {
  api,
  getToken,
  type BuildingDto,
  type ProjectDto,
} from "@/lib/api";
import { useRole } from "@/lib/use-role";

const DEMO_PROJECTS: ProjectDto[] = [
  {
    id: 0,
    name: "Downtown Office Complex",
    description:
      "Local demo — 3-story commercial structure with live recalculation.",
    location: "Colombo, Sri Lanka",
    status: "demo",
    buildings: [
      {
        id: 0,
        name: "Tower A",
        building_type: "commercial",
        total_floors: 3,
        width: 30,
        length: 20,
      },
    ],
  },
];

function plannerHref(project: ProjectDto, building?: BuildingDto) {
  const params = new URLSearchParams();
  if (project.id > 0) params.set("projectId", String(project.id));
  if (building?.id && building.id > 0) {
    params.set("buildingId", String(building.id));
  }
  params.set("name", building?.name || project.name);
  const q = params.toString();
  return q ? `/planner?${q}` : "/planner";
}

export default function ProjectsPage() {
  const router = useRouter();
  // Admins get a read-only oversight view: they audit projects across the
  // workspace rather than opening them in the planner.
  const { isAdmin } = useRole();
  const [projects, setProjects] = useState<ProjectDto[] | null>(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addingFor, setAddingFor] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [newBuildingName, setNewBuildingName] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    const health = await api.health();
    setApiOnline(health.success);
    if (!health.success) {
      setProjects((prev) => prev ?? DEMO_PROJECTS);
      return;
    }

    const list = await api.listProjects();
    if (list.success && list.data) {
      setProjects(list.data.length ? list.data : DEMO_PROJECTS);
    } else {
      setProjects(DEMO_PROJECTS);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const openCreateDialog = () => {
    setCreateError("");
    if (!getToken()) {
      setError("Sign in first to create a project and building.");
      return;
    }
    setDialogOpen(true);
  };

  const createProject = async (input: NewProjectInput) => {
    setCreateError("");
    setCreating(true);
    const res = await api.createProject({
      name: input.name.trim(),
      description: input.description.trim() || undefined,
      location: input.location.trim() || undefined,
      building_name: input.buildingName.trim() || undefined,
      total_floors: input.totalFloors,
      width: input.width,
      length: input.length,
    });
    setCreating(false);
    if (!res.success || !res.data) {
      setCreateError(res.message || "Could not create project. Is the API running?");
      return;
    }

    setProjects((prev) => [res.data!, ...(prev ?? []).filter((p) => p.id !== 0)]);
    setDialogOpen(false);
    // Go straight into the 3D planner for the new project/building.
    router.push(plannerHref(res.data, res.data.buildings?.[0]));
  };

  const addBuilding = async (projectId: number) => {
    setError("");
    if (!getToken()) {
      setError("Sign in first to add a building.");
      return;
    }
    const name =
      newBuildingName.trim() ||
      `Building ${(projects?.find((p) => p.id === projectId)?.buildings?.length ?? 0) + 1}`;
    setAddingFor(projectId);
    const res = await api.createBuilding(projectId, {
      name,
      building_type: "commercial",
      total_floors: 3,
      width: 30,
      length: 20,
    });
    setAddingFor(null);
    if (!res.success || !res.data) {
      setError(res.message || "Could not add building.");
      return;
    }
    setNewBuildingName("");
    setProjects((prev) =>
      (prev ?? []).map((p) =>
        p.id === projectId
          ? { ...p, buildings: [...(p.buildings ?? []), res.data!] }
          : p
      )
    );
  };

  const loadBuildings = async (projectId: number) => {
    if (projectId === 0) return;
    const res = await api.listBuildings(projectId);
    if (res.success && res.data) {
      setProjects((prev) =>
        (prev ?? []).map((p) => (p.id === projectId ? { ...p, buildings: res.data } : p))
      );
    }
  };

  const toggleProject = async (projectId: number) => {
    const next = expanded === projectId ? null : projectId;
    setExpanded(next);
    if (next !== null) await loadBuildings(next);
  };

  const loading = projects === null;

  return (
    <AppShell title="Projects">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Projects" }]}
        eyebrow="Workspace"
        title="Projects & buildings"
        description={
          isAdmin
            ? "Every project in the workspace, with the buildings each one contains."
            : "Every project you design can hold multiple buildings, each with its own 3D model and cost estimate."
        }
        actions={
          isAdmin ? undefined : (
            <Button onClick={openCreateDialog} disabled={loading}>
              <Plus size={15} /> New project
            </Button>
          )
        }
      />

      <div className="mx-auto max-w-content px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded-md px-2 py-1 font-medium ${
              apiOnline ? "bg-success-soft text-success" : "bg-surface text-text-tertiary"
            }`}
          >
            {apiOnline ? "API connected" : "Local demo mode"}
          </span>
        </div>

        {error && (
          <p className="mb-4 rounded-lg border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}

        {loading && (
          <ul className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="card p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && projects!.length === 0 && (
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description={
              isAdmin
                ? "Nobody in the workspace has created a project yet."
                : "Create your first project to start designing in the 3D planner."
            }
            action={
              isAdmin ? undefined : (
                <Button onClick={openCreateDialog} size="sm">
                  <Plus size={14} /> New project
                </Button>
              )
            }
          />
        )}

        <ul className="space-y-3">
          {!loading &&
            projects!.map((project) => {
              const buildings = project.buildings ?? [];
              const isOpen = expanded === project.id;
              return (
                <li key={`${project.id}-${project.name}`} className="card overflow-hidden">
                  <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <button
                      type="button"
                      onClick={() => void toggleProject(project.id)}
                      className="group flex min-w-0 flex-1 items-start gap-3 text-left"
                      aria-expanded={isOpen}
                    >
                      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                        <FolderKanban size={18} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-display text-base font-semibold text-text-primary group-hover:text-accent">
                          {project.name}
                        </p>
                        <p className="mt-0.5 text-sm text-text-secondary">
                          {project.description || "No description"}
                        </p>
                        <p className="mt-1 text-xs text-text-tertiary">
                          {buildings.length} building
                          {buildings.length === 1 ? "" : "s"} · {project.location || "No location"}
                        </p>
                      </div>
                      <ChevronDown
                        size={16}
                        className={`ml-auto mt-1 shrink-0 text-text-tertiary transition-transform ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {!isAdmin && (
                      <Button
                        href={plannerHref(project, buildings[0])}
                        variant="secondary"
                        size="sm"
                      >
                        Open planner →
                      </Button>
                    )}
                  </div>

                  {isOpen && (
                    <div className="space-y-3 border-t border-border bg-canvas-subtle p-4 sm:p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                        Buildings
                      </p>
                      {buildings.length === 0 ? (
                        <p className="text-sm text-text-secondary">
                          No buildings yet — add one below.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {buildings.map((b: BuildingDto) => (
                            <li
                              key={b.id}
                              className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white px-3 py-2.5"
                            >
                              <div className="flex min-w-0 items-center gap-2">
                                <Building2 size={16} className="shrink-0 text-accent" />
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-text-primary">
                                    {b.name}
                                  </p>
                                  <p className="text-xs text-text-tertiary">
                                    {b.total_floors ?? 1} floors · {b.building_type || "structure"}
                                  </p>
                                </div>
                              </div>
                              {!isAdmin && (
                                <Link
                                  href={plannerHref(project, b)}
                                  className="shrink-0 text-xs font-semibold text-accent hover:underline"
                                >
                                  Design →
                                </Link>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}

                      {project.id !== 0 && !isAdmin && (
                        <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                          <input
                            type="text"
                            value={newBuildingName}
                            onChange={(e) => setNewBuildingName(e.target.value)}
                            placeholder="Building name (e.g. Tower B)"
                            className="auth-input flex-1"
                          />
                          <Button
                            onClick={() => void addBuilding(project.id)}
                            disabled={addingFor === project.id}
                            variant="secondary"
                          >
                            <Plus size={14} />
                            {addingFor === project.id ? "Adding…" : "Add building"}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
        </ul>
      </div>

      <NewProjectDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onCreate={createProject}
        submitting={creating}
        error={createError}
      />
    </AppShell>
  );
}
