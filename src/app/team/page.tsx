"use client";

import { FormEvent, useEffect, useState } from "react";
import { Mail, Plus, Users } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import PageHeader from "@/components/app/PageHeader";
import EmptyState from "@/components/app/EmptyState";
import Button from "@/components/ui/Button";
import { getUser } from "@/lib/api";

type Member = { name: string; email: string; role: string; you?: boolean };

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [invited, setInvited] = useState<string[]>([]);

  useEffect(() => {
    const u = getUser();
    setMembers([
      {
        name: u?.name || "You",
        email: u?.email || "you@buildvision.app",
        role: u?.role || "engineer",
        you: true,
      },
    ]);
  }, []);

  const onInvite = (e: FormEvent) => {
    e.preventDefault();
    const clean = email.trim();
    if (!clean) return;
    setInvited((prev) => [clean, ...prev]);
    setEmail("");
  };

  return (
    <AppShell title="Team Workspace">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Team Workspace" }]}
        eyebrow="Collaboration"
        title="Team workspace"
        description="Invite collaborators to your workspace. Real-time multi-user editing is on the roadmap — invitations are currently tracked locally."
      />

      <div className="mx-auto max-w-content px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="card lg:col-span-2">
            <div className="border-b border-border px-5 py-4">
              <p className="font-display text-sm font-semibold text-text-primary">Members</p>
            </div>
            <ul className="divide-y divide-border">
              {members.map((m) => (
                <li key={m.email} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                    {m.name.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {m.name} {m.you && <span className="text-text-tertiary">(you)</span>}
                    </p>
                    <p className="truncate text-xs text-text-tertiary">{m.email}</p>
                  </div>
                  <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-medium capitalize text-text-secondary">
                    {m.role}
                  </span>
                </li>
              ))}
              {invited.map((e) => (
                <li key={e} className="flex items-center gap-3 px-5 py-3.5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface text-text-tertiary">
                    <Mail size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">{e}</p>
                    <p className="text-xs text-warning">Invitation pending</p>
                  </div>
                </li>
              ))}
            </ul>
            {members.length === 1 && invited.length === 0 && (
              <div className="p-5">
                <EmptyState
                  icon={Users}
                  title="You're the only member"
                  description="Invite teammates so they can view and edit projects together."
                />
              </div>
            )}
          </div>

          <div className="card p-5">
            <p className="mb-3 font-display text-sm font-semibold text-text-primary">
              Invite a teammate
            </p>
            <form onSubmit={onInvite} className="space-y-3">
              <input
                type="email"
                required
                placeholder="teammate@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
              />
              <Button type="submit" className="w-full">
                <Plus size={15} /> Send invite
              </Button>
            </form>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
