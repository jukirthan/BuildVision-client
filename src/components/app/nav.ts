import {
  Box,
  Calculator,
  Camera,
  FolderKanban,
  LayoutDashboard,
  MessageSquareText,
  Settings,
  Sparkles,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "@/lib/api";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
  /** Only visible to administrators. */
  adminOnly?: boolean;
  /**
   * Hidden from administrators. Admins oversee accounts and adoption —
   * they never model geometry, so the design tools are noise for them.
   */
  hideForAdmin?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Overview of projects and activity",
  },
  {
    href: "/admin/users",
    label: "Users",
    icon: UserCog,
    description: "Accounts, roles and access",
    adminOnly: true,
  },
  {
    href: "/projects",
    label: "Projects",
    icon: FolderKanban,
    description: "Manage projects and buildings",
  },
  {
    href: "/planner",
    label: "3D Planner",
    icon: Box,
    description: "Structural design workspace",
    hideForAdmin: true,
  },
  {
    href: "/camera-measurement",
    label: "Camera Measurement",
    icon: Camera,
    description: "Estimate dimensions from a photo",
    hideForAdmin: true,
  },
  {
    href: "/material-estimator",
    label: "Material Estimator",
    icon: Calculator,
    description: "Concrete, steel & cost estimates",
    hideForAdmin: true,
  },
  {
    href: "/ai-assistant",
    label: "AI Assistant",
    icon: Sparkles,
    description: "Ask about your structural design",
    hideForAdmin: true,
  },
  {
    href: "/reports",
    label: "Reports",
    icon: MessageSquareText,
    description: "Exported measurement & cost reports",
  },
  {
    href: "/team",
    label: "Team Workspace",
    icon: Users,
    description: "Collaborators on this workspace",
  },
  {
    href: "/settings",
    label: "Settings",
    icon: Settings,
    description: "Workspace & account preferences",
  },
];

export function navItemsForRole(role: UserRole | null | undefined): NavItem[] {
  const admin = role === "admin";
  return NAV_ITEMS.filter((item) => {
    if (item.adminOnly) return admin;
    if (item.hideForAdmin) return !admin;
    return true;
  });
}

/** Routes an administrator has no reason to open. */
export const ENGINEER_ONLY_ROUTES = NAV_ITEMS.filter(
  (item) => item.hideForAdmin
).map((item) => item.href);

/** Routes reserved for administrators. */
export const ADMIN_ONLY_ROUTES = ["/admin"];
