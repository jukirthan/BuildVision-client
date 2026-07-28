"use client";

import { useEffect, useState } from "react";
import { getRole, syncRoleCookie, type UserRole } from "@/lib/api";

/**
 * Reads the signed-in user's role on the client.
 *
 * `ready` is false for the first paint because the role lives in
 * localStorage, which is unavailable during server rendering. Callers that
 * change layout based on role should render a placeholder until then rather
 * than flashing the wrong navigation.
 */
export function useRole(): { role: UserRole | null; ready: boolean; isAdmin: boolean } {
  const [role, setRole] = useState<UserRole | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRole(getRole());
    syncRoleCookie();
    setReady(true);
  }, []);

  return { role, ready, isAdmin: role === "admin" };
}
