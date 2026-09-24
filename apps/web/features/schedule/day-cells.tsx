import type { ScheduleDay } from "@repo/contracts";
import { memo } from "react";
import { cn } from "@/lib/utils";
import type { TimelineDay } from "./timeline";

/** Per-day capacity heat: tint grows with load, turns red when over-booked. */
function heat(day: ScheduleDay | undefined): string | undefined {
  if (!day || day.bookedHours === 0) return undefined;
  if (day.bookedHours > day.capacityHours) return "color-mix(in oklch, var(--destructive) 16%, transparent)";
  const ratio = day.bookedHours / day.capacityHours;
  return `color-mix(in oklch, var(--primary) ${Math.round(3 + ratio * 9)}%, transparent)`;
}

const trim = (hours: number) => (Number.isInteger(hours) ? String(hours) : hours.toFixed(1));

export const DayCells = memo(function DayCells({
  days,
  load,
  column,
  showLoad,
}: {
  days: readonly TimelineDay[];
  load: readonly ScheduleDay[];
  column: number;
  showLoad: boolean;
}) {
  return (
    <div aria-hidden className="absolute inset-0 flex">
      {days.map((day, i) => {
        const dayLoad = load[i];
        const over = !!dayLoad && dayLoad.bookedHours > dayLoad.capacityHours;
        return (
          <div
            key={day.date}
            className={cn(
              "relative h-full shrink-0 border-r border-border/60 transition-colors group-hover/row:bg-accent/30",
              !day.isWorkingDay && "bg-muted/70 group-hover/row:bg-muted",
              day.isToday && "bg-primary/[0.06]",
              over && "shadow-[inset_0_-2px_0_var(--destructive)]",
            )}
            style={{ width: column, backgroundColor: heat(dayLoad) }}
          >
            {day.isToday && <span className="absolute inset-y-0 left-0 w-0.5 bg-primary/60" />}
            {showLoad && dayLoad && dayLoad.bookedHours > 0 && !dayLoad.timeOff && (
              <span
                className={cn(
                  "absolute inset-x-0 bottom-0.5 text-center text-[10px] leading-none tabular-nums",
                  over ? "font-semibold text-destructive" : "text-muted-foreground/80",
                )}
              >
                {trim(dayLoad.bookedHours)}/{trim(dayLoad.capacityHours)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
});
