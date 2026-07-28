"use client";

import AppShell from "@/components/app/AppShell";
import Skeleton from "@/components/app/Skeleton";
import AdminDashboard from "@/components/admin/AdminDashboard";
import EngineerDashboard from "@/components/dashboard/EngineerDashboard";
import { useRole } from "@/lib/use-role";

/**
 * One entry point, two very different jobs: administrators oversee accounts
 * and adoption, while everyone else works on structures.
 */
export default function DashboardPage() {
  const { role, ready } = useRole();

  if (!ready) {
    return (
      <AppShell title="Dashboard">
        <div className="mx-auto max-w-content px-4 py-8 sm:px-6 lg:px-8">
          <Skeleton className="h-40 rounded-xl" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-3">
            <Skeleton className="h-64 rounded-xl lg:col-span-2" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </AppShell>
    );
  }

  return role === "admin" ? <AdminDashboard /> : <EngineerDashboard />;
}
