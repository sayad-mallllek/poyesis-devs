import type {
  ClientStatus,
  MilestoneStatus,
  NoteType,
  Priority,
  ProjectHealth,
  ProjectStatus,
  RiskStatus,
} from "@repo/contracts";
import { Badge } from "@/components/ui/badge";
import { humanize } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "primary";

const TONE_CLASSES: Record<Tone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-info/25 bg-info/10 text-info",
  success: "border-success/25 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/15 text-[color-mix(in_oklch,var(--warning),black_35%)] dark:text-warning",
  danger: "border-destructive/25 bg-destructive/10 text-destructive",
  primary: "border-primary/25 bg-primary/10 text-primary",
};

export const TONE_DOT: Record<Tone, string> = {
  neutral: "bg-muted-foreground/50",
  info: "bg-info",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
  primary: "bg-primary",
};

export function ToneBadge({
  tone,
  children,
  dot,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("gap-1.5 font-medium", TONE_CLASSES[tone], className)}>
      {dot && <span className={cn("size-1.5 rounded-full", TONE_DOT[tone])} />}
      {children}
    </Badge>
  );
}

export const PROJECT_STATUS_TONE: Record<ProjectStatus, Tone> = {
  PLANNING: "info",
  ACTIVE: "primary",
  ON_HOLD: "warning",
  COMPLETED: "success",
  CANCELLED: "neutral",
};

export const HEALTH_TONE: Record<ProjectHealth, Tone> = {
  ON_TRACK: "success",
  AT_RISK: "warning",
  OFF_TRACK: "danger",
};

export const PRIORITY_TONE: Record<Priority, Tone> = {
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  CRITICAL: "danger",
};

export const CLIENT_STATUS_TONE: Record<ClientStatus, Tone> = {
  LEAD: "info",
  ACTIVE: "success",
  INACTIVE: "neutral",
};

export const MILESTONE_TONE: Record<MilestoneStatus, Tone> = {
  PENDING: "neutral",
  IN_PROGRESS: "info",
  DONE: "success",
  MISSED: "danger",
};

export const RISK_STATUS_TONE: Record<RiskStatus, Tone> = {
  OPEN: "danger",
  MITIGATING: "warning",
  CLOSED: "neutral",
};

export const NOTE_TONE: Record<NoteType, Tone> = {
  REMARK: "info",
  NOTE: "neutral",
  WARNING: "danger",
  KUDOS: "success",
};

export const ProjectStatusBadge = ({ status }: { status: ProjectStatus }) => (
  <ToneBadge tone={PROJECT_STATUS_TONE[status]}>{humanize(status)}</ToneBadge>
);

export const HealthBadge = ({ health }: { health: ProjectHealth }) => (
  <ToneBadge tone={HEALTH_TONE[health]} dot>
    {humanize(health)}
  </ToneBadge>
);

export const PriorityBadge = ({ priority }: { priority: Priority }) => (
  <ToneBadge tone={PRIORITY_TONE[priority]}>{humanize(priority)}</ToneBadge>
);

export const ClientStatusBadge = ({ status }: { status: ClientStatus }) => (
  <ToneBadge tone={CLIENT_STATUS_TONE[status]}>{humanize(status)}</ToneBadge>
);
