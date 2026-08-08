// Always use the same-origin Next.js proxy. This avoids browser CORS failures
// between a Vercel frontend and a Railway backend.
const API_BASE = "";

export type ApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export type AuthUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export type AuthPayload = {
  access_token?: string;
  token?: string;
  refresh_token?: string;
  user: AuthUser;
};

export type AiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiProvider = "openai" | "gemini";

const TOKEN_COOKIE = "bv_token";
const ROLE_COOKIE = "bv_role";

export type UserRole =
  | "admin"
  | "engineer"
  | "architect"
  | "contractor"
  | "viewer";

/** Mirrors VALID_ROLES in the backend user controller. */
export const USER_ROLES: UserRole[] = [
  "admin",
  "engineer",
  "architect",
  "contractor",
  "viewer",
];

/**
 * Auth token is mirrored into a (non-HttpOnly) cookie so that Next.js
 * middleware — which runs on the edge and has no access to localStorage —
 * can gate protected routes server-side before the page even renders.
 */
function setTokenCookie(token: string | null) {
  if (typeof document === "undefined") return;
  if (token) {
    const maxAge = 60 * 60 * 24 * 7; // 7 days
    document.cookie = `${TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } else {
    document.cookie = `${TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }
}

/**
 * The role is mirrored into a cookie for the same reason as the token:
 * middleware needs it to keep admins out of the design tools (and everyone
 * else out of /admin) before a page renders. It is a UX guard only — the
 * API independently enforces the real permission checks.
 */
function setRoleCookie(role: string | null) {
  if (typeof document === "undefined") return;
  if (role) {
    const maxAge = 60 * 60 * 24 * 7;
    document.cookie = `${ROLE_COOKIE}=${encodeURIComponent(role)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } else {
    document.cookie = `${ROLE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("bv_token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("bv_token", token);
  else localStorage.removeItem("bv_token");
  setTokenCookie(token);
}

export function setUser(user: unknown) {
  if (typeof window === "undefined") return;
  if (user) {
    localStorage.setItem("bv_user", JSON.stringify(user));
    const role = (user as AuthUser | null)?.role;
    setRoleCookie(role ? String(role).toLowerCase() : null);
  } else {
    localStorage.removeItem("bv_user");
    setRoleCookie(null);
  }
}

export function getUser<T = AuthUser>() {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("bv_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearAuth() {
  setToken(null);
  setUser(null);
  setRoleCookie(null);
}

/** Normalised role for the signed-in user, or null when signed out. */
export function getRole(): UserRole | null {
  const role = getUser()?.role;
  if (!role) return null;
  const lower = String(role).toLowerCase();
  return (USER_ROLES as string[]).includes(lower) ? (lower as UserRole) : "engineer";
}

export function isAdmin(): boolean {
  return getRole() === "admin";
}

/**
 * Re-writes the role cookie from stored user data. Sessions created before
 * the cookie existed would otherwise be invisible to middleware.
 */
export function syncRoleCookie() {
  const role = getRole();
  if (role) setRoleCookie(role);
}

/** Persist token + user from a login/register response. */
export function applyAuth(data: AuthPayload | undefined | null): boolean {
  if (!data) return false;
  const token = data.token || data.access_token;
  if (!token) return false;
  setToken(token);
  if (data.user) setUser(data.user);
  return true;
}

async function parseBody(res: Response): Promise<Record<string, unknown>> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {
      success: false,
      message:
        res.status === 404
          ? "API route not found. Check the configured backend URL."
          : `Unexpected response (${res.status}). Is the API available?`,
    };
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
    const json = await parseBody(res);

    if (!res.ok) {
      return {
        success: false,
        message:
          (typeof json.message === "string" && json.message) ||
          `Request failed (${res.status})`,
      };
    }

    if (typeof json.success !== "boolean") {
      return {
        success: true,
        message: typeof json.message === "string" ? json.message : undefined,
        data: (json.data ?? json) as T,
      };
    }

    return {
      success: Boolean(json.success),
      message: typeof json.message === "string" ? json.message : undefined,
      data: json.data as T | undefined,
    };
  } catch (error) {
    const detail = error instanceof Error ? ` (${error.message})` : "";
    return {
      success: false,
      message:
        `Cannot reach the BuildVision API. Check the configured backend URL and service status.${detail}`,
    };
  }
}

/** Try primary path, then fallback (auth aliases). */
async function requestWithFallback<T>(
  paths: string[],
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  let last: ApiResult<T> = {
    success: false,
    message: "Request failed",
  };
  for (const path of paths) {
    last = await request<T>(path, options);
    if (last.success) return last;
    // Retry only on missing route / unreachable-style failures
    const msg = (last.message || "").toLowerCase();
    if (
      msg.includes("not found") ||
      msg.includes("unexpected response") ||
      msg.includes("cannot reach")
    ) {
      continue;
    }
    return last;
  }
  return last;
}

export const api = {
  health: () => request<{ status: string }>("/api/health"),

  aiChat: (messages: AiChatMessage[], provider: AiProvider = "openai") =>
    request<{ text: string }>("/api/ai/chat", {
      method: "POST",
      body: JSON.stringify({ messages, provider }),
    }),

  login: (email: string, password: string) =>
    requestWithFallback<AuthPayload>(
      ["/api/auth/login", "/api/users/login"],
      {
        method: "POST",
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
        }),
      }
    ),

  register: (name: string, email: string, password: string) =>
    requestWithFallback<AuthPayload>(
      ["/api/auth/register", "/api/users/register"],
      {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      }
    ),

  profile: () =>
    request<AuthUser>("/api/users/profile"),

  updateProfile: (payload: { name?: string; email?: string; password?: string }) =>
    request<AuthUser>("/api/users/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  listProjects: () => request<ProjectDto[]>("/api/projects/"),

  createProject: (payload: {
    name: string;
    description?: string;
    location?: string;
    building_name?: string;
    building_type?: string;
    total_floors?: number;
    width?: number;
    length?: number;
  }) =>
    request<ProjectDto>("/api/projects/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getProject: (id: number) => request<ProjectDto>(`/api/projects/${id}`),

  listBuildings: (projectId: number) =>
    request<BuildingDto[]>(`/api/buildings/project/${projectId}`),

  createBuilding: (
    projectId: number,
    payload: {
      name: string;
      building_type?: string;
      total_floors?: number;
      width?: number;
      length?: number;
      height?: number;
    }
  ) =>
    request<BuildingDto>(`/api/buildings/project/${projectId}`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getBuildingDesign: <T>(buildingId: number) =>
    request<DesignDocument<T>>(`/api/v1/buildings/${buildingId}/design`),

  saveBuildingDesign: <T>(buildingId: number, snapshot: T, version: number) =>
    request<DesignDocument<T>>(`/api/v1/buildings/${buildingId}/design`, {
      method: "PUT",
      body: JSON.stringify({ snapshot, version }),
    }),

  // ── Admin ─────────────────────────────────────────────────────────
  adminOverview: () => request<AdminOverview>("/api/admin/overview"),

  listUsers: (params?: { search?: string; role?: string }) => {
    const qs = new URLSearchParams();
    if (params?.search) qs.set("search", params.search);
    if (params?.role && params.role !== "all") qs.set("role", params.role);
    const suffix = qs.toString() ? `?${qs}` : "";
    return request<ManagedUser[]>(`/api/users/${suffix}`);
  },

  createUser: (payload: {
    name: string;
    email: string;
    password: string;
    role?: string;
  }) =>
    request<ManagedUser>("/api/users/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateUser: (
    id: number,
    payload: { name?: string; email?: string; role?: string; password?: string }
  ) =>
    request<ManagedUser>(`/api/users/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    }),

  deleteUser: (id: number) =>
    request<null>(`/api/users/${id}`, { method: "DELETE" }),
};

export interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at?: string | null;
  updated_at?: string | null;
  project_count?: number;
  building_count?: number;
}

export interface TrendPoint {
  date: string;
  count: number;
}

export interface AdminOverview {
  users: {
    total: number;
    by_role: Record<string, number>;
    new_7d: number;
    new_30d: number;
    active_creators: number;
  };
  content: {
    projects: number;
    buildings: number;
    floors: number;
    pillars: number;
    beams: number;
    slabs: number;
  };
  averages: {
    projects_per_user: number;
    buildings_per_project: number;
  };
  activity: {
    projects_7d: number;
    projects_30d: number;
    signups_by_day: TrendPoint[];
    projects_by_day: TrendPoint[];
  };
  top_users: ManagedUser[];
  recent_users: ManagedUser[];
  recent_projects: Array<
    ProjectDto & { owner_name?: string | null; owner_email?: string | null }
  >;
}

export interface BuildingDto {
  id: number;
  name: string;
  building_type?: string;
  total_floors?: number;
  width?: number;
  length?: number;
  height?: number;
  project_id?: number;
  design_version?: number;
}

export interface DesignDocument<T> {
  snapshot: T | null;
  version: number;
}

export interface ProjectDto {
  id: number;
  name: string;
  description?: string;
  location?: string;
  status?: string;
  user_id?: number;
  created_at?: string;
  buildings?: BuildingDto[];
}
