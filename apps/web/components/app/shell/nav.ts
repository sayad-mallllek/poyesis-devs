import type { Action, Subject } from "@repo/contracts";
import {
  Building2,
  CalendarRange,
  FolderKanban,
  LayoutDashboard,
  Plug,
  ScrollText,
  Settings2,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  /** Hidden unless the principal may perform this action on the subject. */
  requires?: { action: Action; subject: Subject };
}

export const PRIMARY_NAV: NavItem[] = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Projects", href: "/projects", icon: FolderKanban, requires: { action: "read", subject: "Project" } },
  { title: "Schedule", href: "/schedule", icon: CalendarRange, requires: { action: "read", subject: "Allocation" } },
  { title: "People", href: "/people", icon: Users, requires: { action: "read", subject: "User" } },
  { title: "Clients", href: "/clients", icon: Building2, requires: { action: "read", subject: "Client" } },
  { title: "Assistant", href: "/assistant", icon: Sparkles },
];

export const SETTINGS_NAV: NavItem[] = [
  { title: "Company", href: "/settings/company", icon: Settings2, requires: { action: "update", subject: "Company" } },
  { title: "Integrations", href: "/settings/integrations", icon: Plug, requires: { action: "read", subject: "Integration" } },
  { title: "Audit log", href: "/settings/audit", icon: ScrollText, requires: { action: "read", subject: "AuditLog" } },
];

export const isActive = (pathname: string, href: string) =>
  href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
