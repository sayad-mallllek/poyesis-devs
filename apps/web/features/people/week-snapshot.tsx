"use client";

import type { Allocation, ScheduleDay } from "@repo/contracts";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, startOfWeek } from "date-fns";
import { useMemo } from "react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TIME_OFF_LABEL, UTILIZATION_TEXT, utilizationLevel } from "@/features/schedule/utilization";
import { scheduleQuery } from "@/lib/api/scheduling";
import { formatHours, parseDate, toIsoDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Bookings that consume hours on a day, mirroring the API's rules (time off already zeroes the day). */
const bookingsOn = (day: ScheduleDay, allocations: readonly Allocation[]) =>
  day.timeOff
    ? []
    : allocations.filter(
        (a) => a.startDate <= day.date && a.endDate >= day.date && (a.includeWeekends || day.isWorkingDay),
      );

/** This week's booked vs available hours for one person, stacked by project. */
export function WeekSnapshot({ userId }: { userId: string }) {
  const range = useMemo(() => {
    const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
    return { from: toIsoDate(monday), to: toIsoDate(addDays(monday, 6)), today: toIsoDate(new Date()) };
  }, []);
  const { data, isPending } = useQuery(scheduleQuery({ from: range.from, to: range.to, userIds: [userId] }));
  const row = data?.rows[0];
  const days = row?.days.filter((d) => d.isWorkingDay || d.bookedHours > 0) ?? [];
  const scale = Math.max(1, ...days.map((d) => Math.max(d.bookedHours, d.capacityHours)));

  return (
    <Card>
      <CardHeader>
        <CardTitle>This week</CardTitle>
        <CardDescription>
          {row ? (
            <>
              <span className="font-medium text-foreground tabular-nums">{formatHours(row.totals.bookedHours)}</span>{" "}
              booked of {formatHours(row.totals.capacityHours)} ·{" "}
            </>
          ) : null}
          {format(parseDate(range.from), "d MMM")} – {format(parseDate(range.to), "d MMM")}
        </CardDescription>
        {row && (
          <CardAction
            className={cn("text-2xl font-semibold tabular-nums", UTILIZATION_TEXT[utilizationLevel(row.totals.utilization)])}
          >
            {row.totals.utilization}%
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-28 w-full" />
        ) : !row ? (
          <p className="text-sm text-muted-foreground">No schedule for this person.</p>
        ) : (
          <div className="flex h-28 items-end gap-2 sm:gap-3">
            {days.map((day) => {
              const bookings = bookingsOn(day, row.allocations);
              const over = day.bookedHours > day.capacityHours;
              return (
                <Tooltip key={day.date}>
                  <TooltipTrigger asChild>
                    <div className="flex h-full min-w-0 flex-1 flex-col items-center gap-1.5" tabIndex={0}>
                      <span className={cn("text-[11px] tabular-nums", over ? "font-semibold text-destructive" : "text-muted-foreground")}>
                        {day.timeOff ? "Off" : formatHours(day.bookedHours)}
                      </span>
                      <div
                        className={cn(
                          "relative flex w-full flex-1 flex-col-reverse overflow-hidden rounded-md bg-muted",
                          day.timeOff &&
                            "bg-[repeating-linear-gradient(135deg,color-mix(in_oklch,var(--muted-foreground)_20%,transparent)_0_2px,transparent_2px_7px)]",
                        )}
                      >
                        {bookings.map((a) => (
                          <div
                            key={a.id}
                            className={cn("w-full border-t border-card first:border-t-0", a.tentative && "opacity-50")}
                            style={{ height: `${(a.hoursPerDay / scale) * 100}%`, backgroundColor: a.project.color }}
                          />
                        ))}
                        {day.capacityHours > 0 && (
                          <div
                            aria-hidden
                            className="absolute inset-x-0 border-t-2 border-dashed border-foreground/30"
                            style={{ bottom: `${(day.capacityHours / scale) * 100}%` }}
                          />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[11px] text-muted-foreground",
                          day.date === range.today && "font-semibold text-primary",
                        )}
                      >
                        {format(parseDate(day.date), "EEE")}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="font-medium">{format(parseDate(day.date), "EEEE d MMM")}</div>
                    {day.timeOff ? (
                      TIME_OFF_LABEL[day.timeOff]
                    ) : (
                      <>
                        {bookings.map((a) => (
                          <div key={a.id}>
                            {a.project.name}: {formatHours(a.hoursPerDay)}
                            {a.tentative && " (tentative)"}
                          </div>
                        ))}
                        <div className="opacity-70">
                          {formatHours(day.bookedHours)} of {formatHours(day.capacityHours)}
                        </div>
                      </>
                    )}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
