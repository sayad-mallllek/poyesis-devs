import type { DashboardOverview } from "@repo/contracts";
import { CalendarClock, Flag } from "lucide-react";
import Link from "next/link";
import { HealthBadge } from "@/components/app/status-badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const dueLabel = (days: number) =>
  days < 0 ? `${-days}d overdue` : days === 0 ? "Due today" : days === 1 ? "Tomorrow" : `In ${days}d`;

export function DeadlinesCard({
  deadlines,
  overdueMilestones,
}: Pick<DashboardOverview, "overdueMilestones"> & { deadlines: DashboardOverview["upcomingDeadlines"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deadlines</CardTitle>
        <CardDescription>Projects due within 45 days and overdue milestones</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {deadlines.length === 0 ? (
          <p className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <CalendarClock className="size-4" /> No project deadlines in the next 45 days.
          </p>
        ) : (
          <ul className="divide-y">
            {deadlines.map((p) => (
              <li key={p.id}>
                <Link href={`/projects/${p.id}`} className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1.5 py-3 hover:text-primary">
                  <span className="flex min-w-0 items-center gap-2 font-medium">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="truncate">{p.name}</span>
                  </span>
                  <span className={cn("text-sm tabular-nums", p.daysRemaining < 0 ? "font-medium text-destructive" : "text-muted-foreground")}>
                    {dueLabel(p.daysRemaining)}
                  </span>
                  <span className="flex items-center gap-3">
                    <Progress value={p.progress} className="h-1.5 max-w-40" aria-label={`${p.progress}% complete`} />
                    <span className="text-xs text-muted-foreground tabular-nums">{p.progress}%</span>
                  </span>
                  <HealthBadge health={p.health} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {overdueMilestones.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-medium">Overdue milestones</h3>
            <ul className="space-y-2">
              {overdueMilestones.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-sm">
                  <Flag className="size-3.5 shrink-0 text-destructive" />
                  <Link href={`/projects/${m.project.id}/milestones`} className="min-w-0 flex-1 truncate hover:text-primary">
                    {m.name} <span className="text-muted-foreground">· {m.project.name}</span>
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(m.dueDate)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
