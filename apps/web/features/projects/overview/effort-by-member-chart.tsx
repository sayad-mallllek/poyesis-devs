"use client";

import type { ProjectAnalytics } from "@repo/contracts";
import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";
import { EmptyState } from "@/components/app/states";
import { fullName } from "@/components/app/user-avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatHours } from "@/lib/format";

const config = { hours: { label: "Booked", color: "var(--chart-1)" } } satisfies ChartConfig;
const ROW_HEIGHT = 34;
/** Past this, the tail folds into "Others" so the chart keeps one readable bar per person. */
const MAX_ROWS = 8;

export function EffortByMemberChart({ effort }: { effort: ProjectAnalytics["effort"] }) {
  const people = effort.byMember.map((m) => ({ name: fullName(m.user), hours: Math.round(m.hours) }));
  const rows =
    people.length > MAX_ROWS
      ? [
          ...people.slice(0, MAX_ROWS - 1),
          { name: `${people.length - MAX_ROWS + 1} others`, hours: people.slice(MAX_ROWS - 1).reduce((s, p) => s + p.hours, 0) },
        ]
      : people;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Effort by member</CardTitle>
        <CardDescription>Hours booked over the whole project, including future weeks.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState title="No bookings yet" />
        ) : (
          <ChartContainer config={config} className="aspect-auto w-full" style={{ height: rows.length * ROW_HEIGHT + 8 }}>
            <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }} barCategoryGap={8}>
              <XAxis type="number" dataKey="hours" hide />
              <YAxis
                type="category"
                dataKey="name"
                tickLine={false}
                axisLine={false}
                width={112}
                tick={{ fontSize: 12 }}
                tickFormatter={(n: string) => (n.length > 16 ? `${n.slice(0, 15)}…` : n)}
              />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel={false} valueFormatter={(v) => formatHours(Number(v))} />}
              />
              <Bar isAnimationActive={false} dataKey="hours" fill="var(--color-hours)" radius={[0, 4, 4, 0]} maxBarSize={16}>
                <LabelList
                  dataKey="hours"
                  position="right"
                  offset={8}
                  className="fill-muted-foreground"
                  fontSize={12}
                  formatter={(v: unknown) => formatHours(Number(v))}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
