"use client";

import type { ProjectAnalytics } from "@repo/contracts";
import { addDays, differenceInCalendarDays, startOfISOWeek } from "date-fns";
import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/components/app/states";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatDate, formatHours, parseDate, toIsoDate } from "@/lib/format";

const config = {
  booked: { label: "Booked", color: "var(--chart-1)" },
  scheduled: { label: "Scheduled", color: "var(--chart-1)" },
  plan: { label: "Even pace to estimate", color: "var(--muted-foreground)" },
} satisfies ChartConfig;

interface Row {
  week: string;
  booked: number | null;
  scheduled: number | null;
  plan: number | null;
}

/**
 * Weekly cumulative hours. Weeks up to today are "booked" (solid area); later weeks,
 * when the API returns them, are "scheduled" (dashed). The series is padded to the
 * target end date so the even-pace line always spans the whole project window.
 */
function buildRows(effort: ProjectAnalytics["effort"], schedule: ProjectAnalytics["schedule"]): Row[] {
  const today = toIsoDate(new Date());
  const currentWeek = toIsoDate(startOfISOWeek(new Date()));
  const weeks = effort.weekly.map((w) => ({ week: w.weekStart, cumulative: w.cumulative as number | null }));
  const end = schedule.targetEndDate;
  if (end && weeks.length) {
    for (let week = toIsoDate(addDays(parseDate(weeks.at(-1)!.week), 7)); week <= end; week = toIsoDate(addDays(parseDate(week), 7))) {
      weeks.push({ week, cumulative: null });
    }
  }
  const start = schedule.startDate ? parseDate(schedule.startDate) : null;
  const span = start && end ? Math.max(differenceInCalendarDays(parseDate(end), start), 1) : null;
  const lastPast = weeks.filter((w) => w.week <= today && w.cumulative !== null).at(-1)?.week;

  return weeks.map(({ week, cumulative }) => {
    const elapsed = start && span ? differenceInCalendarDays(addDays(parseDate(week), 6), start) : null;
    return {
      week,
      booked: week <= currentWeek ? cumulative : null,
      // Overlaps the last booked point so the dashed line continues from the area.
      scheduled: lastPast && week >= lastPast ? cumulative : null,
      plan:
        effort.estimatedHours && elapsed !== null && span
          ? Math.round(effort.estimatedHours * Math.min(Math.max(elapsed / span, 0), 1))
          : null,
    };
  });
}

/** Keys mirror the marks: a filled swatch for the area, line keys (dashed for scheduled) for the lines. */
function Legend({ showScheduled, showPlan }: { showScheduled: boolean; showPlan: boolean }) {
  return (
    <ul className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground" aria-label="Legend">
      <li className="flex items-center gap-1.5">
        <span aria-hidden className="h-2.5 w-3.5 rounded-[2px] border-t-2 border-(--chart-1) bg-(--chart-1)/15" />
        Booked to date
      </li>
      {showScheduled && (
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="w-4 border-t-2 border-dashed border-(--chart-1)" />
          Scheduled
        </li>
      )}
      {showPlan && (
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="w-4 border-t-[1.5px] border-muted-foreground/70" />
          Even pace to estimate
        </li>
      )}
    </ul>
  );
}

export function BurnupChart({ analytics }: { analytics: ProjectAnalytics }) {
  const { effort, schedule } = analytics;
  const rows = useMemo(() => buildRows(effort, schedule), [effort, schedule]);
  const currentWeek = toIsoDate(startOfISOWeek(new Date()));
  const hasFuture = rows.some((r) => r.scheduled !== null && r.week > currentWeek);
  const showToday = rows.some((r) => r.week === currentWeek);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Burn-up</CardTitle>
        <CardDescription>
          Cumulative booked hours
          {effort.estimatedHours ? ` against the ${formatHours(effort.estimatedHours)} estimate` : ""}, by week.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState title="No bookings yet" description="Book people on this project in the schedule to see effort accumulate." />
        ) : (
          <ChartContainer config={config} className="aspect-auto h-72 w-full">
            <ComposedChart data={rows} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="week"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={28}
                tickFormatter={(w: string) => formatDate(w, "d MMM")}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                tickFormatter={(h: number) => h.toLocaleString()}
                domain={[0, (max: number) => Math.ceil(Math.max(max, effort.estimatedHours ?? 0) * 1.08)]}
              />
              <ChartTooltip
                cursor={{ strokeWidth: 1 }}
                content={
                  <ChartTooltipContent
                    indicator="line"
                    labelFormatter={(_, payload) => {
                      const week = (payload?.[0]?.payload as Row | undefined)?.week;
                      return week ? `Week of ${formatDate(week)}` : null;
                    }}
                    valueFormatter={(v) => formatHours(Number(v))}
                  />
                }
              />
              {effort.estimatedHours && (
                <ReferenceLine
                  y={effort.estimatedHours}
                  stroke="var(--muted-foreground)"
                  strokeOpacity={0.6}
                  label={{
                    value: `Estimate ${formatHours(effort.estimatedHours)}`,
                    position: "insideTopLeft",
                    fill: "var(--muted-foreground)",
                    fontSize: 11,
                  }}
                />
              )}
              {showToday && (
                <ReferenceLine
                  x={currentWeek}
                  stroke="var(--foreground)"
                  strokeOpacity={0.35}
                  label={{ value: "Today", position: "top", fill: "var(--muted-foreground)", fontSize: 11 }}
                />
              )}
              <Line isAnimationActive={false} dataKey="plan" type="linear" stroke="var(--color-plan)" strokeWidth={1.5} strokeOpacity={0.7} dot={false} activeDot={false} />
              <Area
                isAnimationActive={false}
                dataKey="booked"
                type="monotone"
                stroke="var(--color-booked)"
                strokeWidth={2}
                fill="var(--color-booked)"
                fillOpacity={0.1}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
              />
              {hasFuture && (
                <Line
                  isAnimationActive={false}
                  dataKey="scheduled"
                  type="monotone"
                  stroke="var(--color-scheduled)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
                />
              )}
            </ComposedChart>
          </ChartContainer>
        )}
        {rows.length > 0 && <Legend showScheduled={hasFuture} showPlan={rows.some((r) => r.plan !== null)} />}
      </CardContent>
    </Card>
  );
}
