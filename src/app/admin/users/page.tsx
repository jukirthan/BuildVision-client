"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Pencil,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import AppShell from "@/components/app/AppShell";
import EmptyState from "@/components/app/EmptyState";
import Skeleton from "@/components/app/Skeleton";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import RoleBadge from "@/components/admin/RoleBadge";
import {
  api,
  getUser,
  USER_ROLES,
  type ManagedUser,
  type UserRole,
} from "@/lib/api";

type Filter = "all" | UserRole;

const FILTERS: Filter[] = ["all", ...USER_ROLES];

const inputClass =
  "w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-text-primary outline-none transition-colors placeholder:text-text-tertiary focus:border-accent focus:ring-2 focus:ring-accent/20";

function joinedLabel(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<ManagedUser[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [notice, setNotice] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);
  const [selfId, setSelfId] = useState<number | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [deleting, setDeleting] = useState<ManagedUser | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await api.listUsers();
    if (res.success && res.data) {
      setUsers(res.data);
    } else {
      setUsers([]);
      setNotice({ tone: "error", text: res.message || "Could not load users." });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setSelfId(getUser()?.id ?? null);
    load();
  }, [load]);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  // Filtering happens client-side: the directory is small and it keeps
  // typing instant without a request per keystroke.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (users ?? []).filter((u) => {
      const roleOk = filter === "all" || (u.role || "").toLowerCase() === filter;
      const textOk =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q);
      return roleOk && textOk;
    });
  }, [users, search, filter]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: users?.length ?? 0 };
    for (const u of users ?? []) {
      const key = (u.role || "engineer").toLowerCase();
      map[key] = (map[key] ?? 0) + 1;
    }
    return map;
  }, [users]);

  async function changeRole(user: ManagedUser, role: string) {
    const previous = user.role;
    // Optimistic: the select should feel instant, and we roll back on failure.
    setUsers((list) =>
      (list ?? []).map((u) => (u.id === user.id ? { ...u, role } : u))
    );
    const res = await api.updateUser(user.id, { role });
    if (res.success) {
      setNotice({ tone: "ok", text: `${user.name} is now ${role}.` });
    } else {
      setUsers((list) =>
        (list ?? []).map((u) =>
          u.id === user.id ? { ...u, role: previous } : u
        )
      );
      setNotice({ tone: "error", text: res.message || "Could not change role." });
    }
  }

  async function handleCreate(form: {
    name: string;
    email: string;
    password: string;
    role: string;
  }) {
    setBusy(true);
    const res = await api.createUser(form);
    setBusy(false);
    if (res.success) {
      setCreateOpen(false);
      setNotice({ tone: "ok", text: `${form.name} was added.` });
      load();
    } else {
      setNotice({ tone: "error", text: res.message || "Could not create user." });
    }
  }

  async function handleEdit(
    id: number,
    payload: { name: string; email: string; role: string; password?: string }
  ) {
    setBusy(true);
    const res = await api.updateUser(id, payload);
    setBusy(false);
    if (res.success) {
      setEditing(null);
      setNotice({ tone: "ok", text: "Changes saved." });
      load();
    } else {
      setNotice({ tone: "error", text: res.message || "Could not save changes." });
    }
  }

  async function handleDelete(user: ManagedUser) {
    setBusy(true);
    const res = await api.deleteUser(user.id);
    setBusy(false);
    if (res.success) {
      setDeleting(null);
      setNotice({ tone: "ok", text: `${user.name} was removed.` });
      load();
    } else {
      setNotice({ tone: "error", text: res.message || "Could not delete user." });
    }
  }

  return (
    <AppShell title="Users">
      <div className="mx-auto max-w-content px-4 py-6 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary">
              User management
            </h1>
            <p className="mt-1 text-sm text-text-secondary">
              Add people, set what they can access, and remove accounts that are
              no longer needed.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <UserPlus size={15} /> Add user
          </Button>
        </div>

        {notice && (
          <div
            role="status"
            className={`mt-5 flex items-start gap-2.5 rounded-lg border px-4 py-3 ${
              notice.tone === "ok"
                ? "border-success/25 bg-success-soft"
                : "border-danger/25 bg-danger-soft"
            }`}
          >
            {notice.tone === "ok" ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
            ) : (
              <AlertCircle size={16} className="mt-0.5 shrink-0 text-danger" />
            )}
            <p className="flex-1 text-sm text-text-primary">{notice.text}</p>
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="shrink-0 rounded p-0.5 text-text-tertiary hover:text-text-primary"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Controls */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or email"
              aria-label="Search users"
              className={`${inputClass} pl-9`}
            />
          </div>
          <div
            className="flex flex-wrap gap-1.5"
            role="group"
            aria-label="Filter by role"
          >
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
                  filter === f
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-white text-text-secondary hover:border-border-strong"
                }`}
              >
                {f === "all" ? "All" : f}
                {counts[f] != null && (
                  <span className="ml-1.5 tabular-nums opacity-70">
                    {counts[f]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="card mt-5 overflow-hidden">
          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-11" />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={Users}
              title={
                (users?.length ?? 0) === 0 ? "No users yet" : "No matching users"
              }
              description={
                (users?.length ?? 0) === 0
                  ? "Add the first teammate to get started."
                  : "Try a different search term or role filter."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[46rem] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-text-tertiary">
                    <th className="px-5 py-3 font-medium">User</th>
                    <th className="px-5 py-3 font-medium">Role</th>
                    <th className="px-5 py-3 text-right font-medium">Projects</th>
                    <th className="px-5 py-3 font-medium">Joined</th>
                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {visible.map((u) => {
                    const isSelf = u.id === selfId;
                    return (
                      <tr key={u.id} className="hover:bg-surface/60">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold uppercase text-accent">
                              {u.name?.slice(0, 2) || "?"}
                            </span>
                            <div className="min-w-0">
                              <p className="flex items-center gap-2 font-medium text-text-primary">
                                <span className="truncate">{u.name}</span>
                                {isSelf && (
                                  <span className="shrink-0 rounded bg-surface-sunken px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary">
                                    You
                                  </span>
                                )}
                              </p>
                              <p className="truncate text-xs text-text-tertiary">
                                {u.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <label className="sr-only" htmlFor={`role-${u.id}`}>
                            Role for {u.name}
                          </label>
                          <select
                            id={`role-${u.id}`}
                            value={(u.role || "engineer").toLowerCase()}
                            onChange={(e) => changeRole(u, e.target.value)}
                            className="rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs font-medium capitalize text-text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                          >
                            {USER_ROLES.map((r) => (
                              <option key={r} value={r} className="capitalize">
                                {r}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-text-secondary">
                          {u.project_count ?? 0}
                        </td>
                        <td className="px-5 py-3 text-text-secondary">
                          {joinedLabel(u.created_at)}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setEditing(u)}
                              title={`Edit ${u.name}`}
                              className="rounded-lg p-2 text-text-tertiary transition-colors hover:bg-surface hover:text-text-primary"
                            >
                              <Pencil size={15} />
                              <span className="sr-only">Edit {u.name}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleting(u)}
                              disabled={isSelf}
                              title={
                                isSelf
                                  ? "You cannot delete your own account"
                                  : `Delete ${u.name}`
                              }
                              className="rounded-lg p-2 text-text-tertiary transition-colors hover:bg-danger-soft hover:text-danger disabled:pointer-events-none disabled:opacity-40"
                            >
                              <Trash2 size={15} />
                              <span className="sr-only">Delete {u.name}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {!loading && visible.length > 0 && (
          <p className="mt-3 text-xs text-text-tertiary">
            Showing {visible.length} of {users?.length ?? 0} users
          </p>
        )}
      </div>

      <CreateUserDialog
        open={createOpen}
        busy={busy}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
      />
      <EditUserDialog
        user={editing}
        busy={busy}
        onClose={() => setEditing(null)}
        onSubmit={handleEdit}
      />
      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        title="Delete user"
        description={
          deleting
            ? `${deleting.name} will lose access immediately. Their projects are deleted with the account.`
            : undefined
        }
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={busy}
              onClick={() => deleting && handleDelete(deleting)}
            >
              {busy ? "Deleting…" : "Delete user"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          This cannot be undone. Consider changing their role to{" "}
          <span className="font-medium text-text-primary">viewer</span> instead if
          you only need to revoke editing access.
        </p>
      </Dialog>
    </AppShell>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-text-secondary">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-text-tertiary">{hint}</span>}
    </label>
  );
}

function CreateUserDialog({
  open,
  busy,
  onClose,
  onSubmit,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onSubmit: (form: {
    name: string;
    email: string;
    password: string;
    role: string;
  }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<string>("engineer");

  useEffect(() => {
    if (open) {
      setName("");
      setEmail("");
      setPassword("");
      setRole("engineer");
    }
  }, [open]);

  const valid = name.trim() && email.trim() && password.length >= 6;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add user"
      description="Create an account and choose what it can access."
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!valid || busy}
            onClick={() =>
              onSubmit({ name: name.trim(), email: email.trim(), password, role })
            }
          >
            {busy ? "Creating…" : "Create user"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Full name">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Priya Fernando"
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="priya@studio.com"
          />
        </Field>
        <Field label="Temporary password" hint="At least 6 characters.">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
        </Field>
        <Field
          label="Role"
          hint="Admins manage users and usage. Engineers and architects use the design tools."
        >
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={`${inputClass} capitalize`}
          >
            {USER_ROLES.map((r) => (
              <option key={r} value={r} className="capitalize">
                {r}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </Dialog>
  );
}

function EditUserDialog({
  user,
  busy,
  onClose,
  onSubmit,
}: {
  user: ManagedUser | null;
  busy: boolean;
  onClose: () => void;
  onSubmit: (
    id: number,
    payload: { name: string; email: string; role: string; password?: string }
  ) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("engineer");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setRole((user.role || "engineer").toLowerCase());
      setPassword("");
    }
  }, [user]);

  const valid = name.trim() && email.trim() && (!password || password.length >= 6);

  return (
    <Dialog
      open={Boolean(user)}
      onClose={onClose}
      title="Edit user"
      description={user ? `Update ${user.name}'s account details.` : undefined}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!valid || busy}
            onClick={() =>
              user &&
              onSubmit(user.id, {
                name: name.trim(),
                email: email.trim(),
                role,
                ...(password ? { password } : {}),
              })
            }
          >
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Full name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Role">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={`${inputClass} capitalize`}
          >
            {USER_ROLES.map((r) => (
              <option key={r} value={r} className="capitalize">
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Field
          label="Reset password"
          hint="Leave blank to keep the current password."
        >
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="New password"
          />
        </Field>
        <div className="flex items-center justify-between rounded-lg border border-border bg-surface/60 px-3.5 py-2.5">
          <span className="text-xs text-text-tertiary">Current role</span>
          <RoleBadge role={user?.role} />
        </div>
      </div>
    </Dialog>
  );
}
