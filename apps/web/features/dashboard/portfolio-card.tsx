import { PROJECT_HEALTHS, PROJECT_STATUSES, type DashboardOverview } from "@repo/contracts";
import { CircleAlert, CircleCheck, CircleX } from "lucide-react";
import Link from "next/link";
import { PROJECT_STATUS_TONE, TONE_DOT } from "@/components/app/status-badges";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { humanize, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

const HEALTH_ICON = {
  ON_TRACK: { icon: CircleCheck, className: "text-success" },
  AT_RISK: { icon: CircleAlert, className: "text-warning" },
  OFF_TRACK: { icon: CircleX, className: "text-destructive" },
} as const;

export function PortfolioCard({ projects }: { projects: DashboardOverview["projects"] }) {
  const max = Math.max(1, ...Object.values(projects.byStatus));
  return (
    <Card>
      <CardHeader>
        <CardTitle>Portfolio</CardTitle>
        <CardDescription>{plural(projects.total, "project")} you can see</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-3 gap-2">
          {PROJECT_HEALTHS.map((health) => {
            const { icon: Icon, className } = HEALTH_ICON[health];
            return (
              <Link
                key={health}
                href={`/projects?health=${health}`}
                className="rounded-lg border p-3 transition-colors hover:bg-accent"
              >
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className={cn("size-3.5", className)} />
                  {humanize(health)}
                </div>
                <div className="mt-1 text-xl font-semibold tabular-nums">{projects.byHealth[health]}</div>
              </Link>
            );
          })}
        </div>
        <ul className="space-y-2.5" aria-label="Projects by status">
          {PROJECT_STATUSES.map((status) => {
            const count = projects.byStatus[status];
            return (
              <li key={status} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3 text-sm">
                <span className="text-muted-foreground">{humanize(status)}</span>
                <span className="h-2 overflow-hidden rounded-full bg-muted">
                  <span
                    className={cn("block h-full rounded-full", TONE_DOT[PROJECT_STATUS_TONE[status]])}
                    style={{ width: `${(count / max) * 100}%` }}
                  />
                </span>
                <span className="text-right tabular-nums">{count}</span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
