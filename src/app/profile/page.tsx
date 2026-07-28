"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Mail, Settings, Shield } from "lucide-react";
import AppShell from "@/components/app/AppShell";
import PageHeader from "@/components/app/PageHeader";
import Button from "@/components/ui/Button";
import { getUser, type AuthUser } from "@/lib/api";

export default function ProfilePage() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  const initials = (user?.name || "U")
    .split(" ")
    .map((s) => s.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <AppShell title="Profile">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Profile" }]}
        eyebrow="Account"
        title="Profile"
      />

      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="card p-6">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-xl font-semibold text-white">
              {initials}
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-text-primary">
                {user?.name || "Signed in user"}
              </p>
              <p className="flex items-center gap-1.5 text-sm text-text-secondary">
                <Mail size={13} /> {user?.email || "—"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border pt-5">
            <div>
              <p className="text-xs text-text-tertiary">Role</p>
              <p className="mt-1 text-sm font-medium capitalize text-text-primary">
                {user?.role || "engineer"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary">Account ID</p>
              <p className="mt-1 text-sm font-medium text-text-primary">
                #{user?.id ?? "—"}
              </p>
            </div>
          </div>

          <div className="mt-6 flex gap-2 border-t border-border pt-5">
            <Button href="/settings" variant="secondary">
              <Settings size={15} /> Edit profile
            </Button>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-success-soft px-3 py-2 text-xs font-medium text-success">
              <Shield size={13} /> Account secured
            </span>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-text-tertiary">
          Need to change more?{" "}
          <Link href="/settings" className="text-accent hover:underline">
            Go to settings
          </Link>
        </p>
      </div>
    </AppShell>
  );
}
