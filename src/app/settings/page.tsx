"use client";

import { FormEvent, useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import PageHeader from "@/components/app/PageHeader";
import Button from "@/components/ui/Button";
import { api, getUser, setUser } from "@/lib/api";

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const u = getUser();
    if (u) {
      setName(u.name || "");
      setEmail(u.email || "");
    }
  }, []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    const payload: { name?: string; email?: string; password?: string } = {
      name,
      email,
    };
    if (password) payload.password = password;

    const res = await api.updateProfile(payload);
    setSaving(false);
    if (!res.success || !res.data) {
      setError(res.message || "Could not save changes.");
      return;
    }
    setUser(res.data);
    setPassword("");
    setSaved(true);
  };

  return (
    <AppShell title="Settings">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Settings" }]}
        eyebrow="Account"
        title="Settings"
        description="Manage your profile, workspace preferences, and security."
      />

      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="card p-6">
          <p className="font-display text-sm font-semibold text-text-primary">
            Profile
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Update the name and email associated with your account.
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <label className="auth-field">
              <span>Full name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="auth-input"
                required
              />
            </label>
            <label className="auth-field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
                required
              />
            </label>
            <label className="auth-field">
              <span>New password (optional)</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                className="auth-input"
              />
            </label>

            {error && (
              <p className="rounded-lg bg-danger-soft px-3 py-2.5 text-sm text-danger">
                {error}
              </p>
            )}
            {saved && (
              <p className="flex items-center gap-2 rounded-lg bg-success-soft px-3 py-2.5 text-sm text-success">
                <CheckCircle2 size={15} /> Changes saved.
              </p>
            )}

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </Button>
            </div>
          </form>
        </div>

        <div className="card mt-5 p-6">
          <p className="font-display text-sm font-semibold text-text-primary">
            Accessibility
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Reduced motion is respected automatically from your OS setting.
            High-contrast focus outlines are always enabled.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
