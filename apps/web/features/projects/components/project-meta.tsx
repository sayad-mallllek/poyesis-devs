import type { ProjectStatus } from "@repo/contracts";
import { CalendarClock, CalendarX2, Lock } from "lucide-react";
import { ToneBadge, type Tone } from "@/components/app/status-badges";
import { Progress } from "@/components/ui/progress";
import { daysUntil, formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const CLOSED: readonly ProjectStatus[] = ["COMPLETED", "CANCELLED"];

/** Days left until a deadline, with the tone it deserves. `null` when there is nothing to count down. */
export function deadlineInfo(targetEndDate: string | null, status?: ProjectStatus) {
  if (!targetEndDate || (status && CLOSED.includes(status))) return null;
  const days = daysUntil(targetEndDate);
  const tone: Tone = days < 0 ? "danger" : days <= 14 ? "warning" : "neutral";
  const label =
    days < 0
      ? `${-days} day${days === -1 ? "" : "s"} overdue`
      : days === 0
        ? "Due today"
        : `${days} day${days === 1 ? "" : "s"} left`;
  return { days, tone, label, overdue: days < 0 };
}

export function DeadlineBadge({
  targetEndDate,
  status,
  className,
}: {
  targetEndDate: string | null;
  status?: ProjectStatus;
  className?: string;
}) {
  const info = deadlineInfo(targetEndDate, status);
  if (!info) return null;
  const Icon = info.overdue ? CalendarX2 : CalendarClock;
  return (
    <ToneBadge tone={info.tone} className={className}>
      <Icon aria-hidden /> {info.label}
    </ToneBadge>
  );
}

/** Deadline date plus countdown, as shown on cards and rows. */
export function DeadlineText({ targetEndDate, status }: { targetEndDate: string | null; status: ProjectStatus }) {
  const info = deadlineInfo(targetEndDate, status);
  if (!targetEndDate) return <span className="text-muted-foreground">No deadline</span>;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5">
      <span className="text-muted-foreground">{formatDate(targetEndDate)}</span>
      {info && (
        <span
          className={cn(
            "font-medium",
            info.tone === "danger" && "text-destructive",
            info.tone === "warning" && "text-[color-mix(in_oklch,var(--warning),black_35%)] dark:text-warning",
          )}
        >
          · {info.label}
        </span>
      )}
    </span>
  );
}

export function ProjectProgress({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Progress value={value} className="h-1.5 bg-primary/15" aria-label={`Progress ${value}%`} />
      <span className="w-9 shrink-0 text-right text-xs font-medium tabular-nums text-muted-foreground">{value}%</span>
    </div>
  );
}

export function ProjectCode({ code, className }: { code: string; className?: string }) {
  return <span className={cn("font-mono text-xs tracking-tight text-muted-foreground", className)}>{code}</span>;
}

export function ConfidentialBadge() {
  return (
    <ToneBadge tone="neutral">
      <Lock aria-hidden /> Confidential
    </ToneBadge>
  );
}

export function ColorDot({ color, className }: { color: string; className?: string }) {
  return <span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", className)} style={{ backgroundColor: color }} />;
}
