import { NextRequest, NextResponse } from "next/server";

/**
 * Routes that require an authenticated session. Everything else
 * (marketing site, auth pages) stays public.
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/planner",
  "/projects",
  "/camera-measurement",
  "/material-estimator",
  "/ai-assistant",
  "/reports",
  "/team",
  "/settings",
  "/profile",
  "/admin",
];

/** Administrator-only areas. */
const ADMIN_PREFIXES = ["/admin"];

/**
 * Design tooling that an administrator has no use for. Kept in sync with
 * `hideForAdmin` in components/app/nav.ts — duplicated here because the
 * nav module pulls in icon components that don't belong in edge middleware.
 */
const ENGINEER_PREFIXES = [
  "/planner",
  "/camera-measurement",
  "/material-estimator",
  "/ai-assistant",
];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!matches(pathname, PROTECTED_PREFIXES)) return NextResponse.next();

  const token = req.cookies.get("bv_token")?.value;
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    loginUrl.searchParams.set("reason", "auth");
    return NextResponse.redirect(loginUrl);
  }

  // Role steering. This is navigation hygiene, not security — the API
  // enforces permissions on every request regardless of what we allow here.
  const role = req.cookies.get("bv_role")?.value?.toLowerCase();
  const isAdmin = role === "admin";

  if (isAdmin && matches(pathname, ENGINEER_PREFIXES)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Only redirect away from /admin once we actually know the role; a missing
  // cookie means a pre-existing session that hasn't synced yet.
  if (!isAdmin && role && matches(pathname, ADMIN_PREFIXES)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/planner/:path*",
    "/projects/:path*",
    "/camera-measurement/:path*",
    "/material-estimator/:path*",
    "/ai-assistant/:path*",
    "/reports/:path*",
    "/team/:path*",
    "/settings/:path*",
    "/profile/:path*",
    "/admin/:path*",
  ],
};
