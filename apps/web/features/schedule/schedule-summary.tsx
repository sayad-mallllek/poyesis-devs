import type { ScheduleRow } from "@repo/contracts";
import { formatHours } from "@/lib/format";
import { cn } from "@/lib/utils";
import { UTILIZATION_TEXT, utilizationLevel } from "./utilization";

export function ScheduleSummary({ rows }: { rows: readonly ScheduleRow[] | undefined }) {
  if (!rows?.length) return <span />;
  const booked = rows.reduce((sum, r) => sum + r.totals.bookedHours, 0);
  const capacity = rows.reduce((sum, r) => sum + r.totals.capacityHours, 0);
  const utilization = capacity > 0 ? Math.round((booked / capacity) * 100) : 0;
  const over = rows.filter((r) => r.totals.utilization > 100).length;
  const idle = rows.filter((r) => r.totals.utilization < 50).length;

  return (
    <dl className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      <div className="flex gap-1.5">
        <dt className="text-muted-foreground">Utilization</dt>
        <dd className={cn("font-semibold tabular-nums", UTILIZATION_TEXT[utilizationLevel(utilization)])}>{utilization}%</dd>
      </div>
      <div className="flex gap-1.5">
        <dt className="text-muted-foreground">Booked</dt>
        <dd className="font-medium tabular-nums">
          {formatHours(Math.round(booked))} / {formatHours(Math.round(capacity))}
        </dd>
      </div>
      <div className="flex gap-1.5">
        <dt className="text-muted-foreground">Over-booked</dt>
        <dd className={cn("font-medium tabular-nums", over > 0 && "text-destructive")}>{over}</dd>
      </div>
      <div className="flex gap-1.5">
        <dt className="text-muted-foreground">Under 50%</dt>
        <dd className="font-medium tabular-nums">{idle}</dd>
      </div>
    </dl>
  );
}

export function ScheduleLegend() {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-sm bg-primary" /> Confirmed
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-sm border border-dashed border-primary bg-primary/15" /> Tentative
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-sm bg-muted bg-[repeating-linear-gradient(135deg,color-mix(in_oklch,var(--muted-foreground)_25%,transparent)_0_2px,transparent_2px_5px)]" />{" "}
        Time off
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-sm bg-destructive/15 shadow-[inset_0_-2px_0_var(--destructive)]" /> Over capacity
      </li>
      <li className="flex items-center gap-1.5">
        <span className="h-3 w-5 rounded-sm bg-muted" /> Non-working day
      </li>
    </ul>
  );
}
