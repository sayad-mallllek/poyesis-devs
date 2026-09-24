import type { DashboardOverview } from "@repo/contracts";
import Link from "next/link";
import { fullName, UserAvatar } from "@/components/app/user-avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatHours } from "@/lib/format";
import { cn } from "@/lib/utils";

type Person = DashboardOverview["utilization"]["overbooked"][number];

function PersonRow({ person, tone }: { person: Person; tone: "danger" | "muted" }) {
  const percent = person.capacityHours ? Math.round((person.bookedHours / person.capacityHours) * 100) : null;
  return (
    <li>
      <Link href={`/people/${person.user.id}`} className="flex items-center gap-3 py-2 hover:text-primary">
        <UserAvatar user={person.user} className="size-7" />
        <span className="min-w-0 flex-1 truncate text-sm">{fullName(person.user)}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatHours(person.bookedHours)} / {formatHours(person.capacityHours)}
        </span>
        <span className={cn("w-12 text-right text-sm font-medium tabular-nums", tone === "danger" ? "text-destructive" : "text-muted-foreground")}>
          {percent === null ? "—" : `${percent}%`}
        </span>
      </Link>
    </li>
  );
}

export function UtilizationCard({ utilization }: { utilization: DashboardOverview["utilization"] }) {
  const percent = Math.round(utilization.percent);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team utilization</CardTitle>
        <CardDescription>Week of {formatDate(utilization.weekStart)}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-semibold tracking-tight tabular-nums">{percent}%</span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {formatHours(utilization.bookedHours)} of {formatHours(utilization.capacityHours)}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${percent}% utilized`}>
            <div
              className={cn("h-full rounded-full", percent > 100 ? "bg-destructive" : "bg-primary")}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
        </div>
        {utilization.overbooked.length > 0 && (
          <section>
            <h3 className="text-sm font-medium">Over-booked</h3>
            <ul className="divide-y">
              {utilization.overbooked.map((p) => (
                <PersonRow key={p.user.id} person={p} tone="danger" />
              ))}
            </ul>
          </section>
        )}
        {utilization.underbooked.length > 0 && (
          <section>
            <h3 className="text-sm font-medium">Has capacity</h3>
            <ul className="divide-y">
              {utilization.underbooked.map((p) => (
                <PersonRow key={p.user.id} person={p} tone="muted" />
              ))}
            </ul>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
