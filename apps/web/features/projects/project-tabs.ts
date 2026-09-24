import type { Action, ProjectDetail, Subject } from "@repo/contracts";
import {
  Bug,
  Flag,
  FolderGit2,
  LayoutDashboard,
  Megaphone,
  Paperclip,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface ProjectTab {
  /** Route segment under `/projects/[projectId]`; "" is the overview (index route). */
  segment: string;
  label: string;
  icon: LucideIcon;
  /** Optional count badge, computed from the already-loaded project detail. */
  count?: (project: ProjectDetail) => number | undefined;
  /** Hidden unless the principal may perform this action; the resource is scoped to the project. */
  requires?: { action: Action; subject: Subject };
}

/**
 * The project page's tab bar. To add a tab: create
 * `app/(app)/projects/[projectId]/(tabs)/<segment>/page.tsx` and append an entry here.
 */
export const PROJECT_TABS: ProjectTab[] = [
  { segment: "", label: "Overview", icon: LayoutDashboard },
  { segment: "milestones", label: "Milestones", icon: Flag, count: (p) => p.milestones.length },
  { segment: "risks", label: "Risks", icon: ShieldAlert, count: (p) => p.counts.openRisks },
  { segment: "team", label: "Team", icon: Users, count: (p) => p.members.length },
  { segment: "files", label: "Files", icon: Paperclip, count: (p) => p.counts.attachments },
  { segment: "updates", label: "Updates", icon: Megaphone },
  { segment: "github", label: "GitHub", icon: FolderGit2, count: (p) => p.counts.repositories },
  { segment: "errors", label: "Errors", icon: Bug, count: (p) => p.counts.sentryProjects },
];

export const projectTabHref = (projectId: string, tab: Pick<ProjectTab, "segment">) =>
  tab.segment ? `/projects/${projectId}/${tab.segment}` : `/projects/${projectId}`;

