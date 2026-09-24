"use client";

import type { ChartBlock } from "@repo/contracts";
import { BarChart3, Table2 } from "lucide-react";
import { useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { BlockCard } from "./block-card";
import { DataTable } from "./table-block";

/** Categorical slots in fixed order (never cycled); the API caps series at 6. */
const seriesColor = (index: number) => `var(--chart-${index + 1})`;

const formatValue = (unit?: string) => (value: unknown) =>
  typeof value === "number" ? `${value.toLocaleString()}${unit ? ` ${unit}` : ""}` : String(value ?? "—");

export function ChartBlockView({ block }: { block: ChartBlock }) {
  const [asTable, setAsTable] = useState(false);
  const isPie = block.chartType === "pie";
  const config: ChartConfig = Object.fromEntries(
    isPie
      ? block.data.map((d, i) => [String(d[block.xKey]), { label: String(d[block.xKey]), color: seriesColor(i) }])
      : block.series.map((s, i) => [s.key, { label: s.label, color: seriesColor(i) }]),
  );
  const showLegend = isPie || block.series.length > 1;
  const tooltip = <ChartTooltip content={<ChartTooltipContent valueFormatter={formatValue(block.unit)} />} />;
  const axes = (
    <>
      <CartesianGrid vertical={false} strokeDasharray="3 3" />
      <XAxis dataKey={block.xKey} tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
      <YAxis tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => v.toLocaleString()} />
    </>
  );

  return (
    <BlockCard
      title={block.title}
      description={block.description}
      action={
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          onClick={() => setAsTable((v) => !v)}
          aria-label={asTable ? "Show chart" : "Show as table"}
        >
          {asTable ? <BarChart3 /> : <Table2 />}
        </Button>
      }
    >
      {asTable ? (
        <DataTable
          columns={[{ key: block.xKey, label: block.xKey }, ...block.series.map((s) => ({ key: s.key, label: s.label, align: "right" as const }))]}
          rows={block.data}
        />
      ) : (
        <ChartContainer config={config} className="aspect-auto h-56 w-full">
          {isPie ? (
            <PieChart>
              {tooltip}
              <Pie data={block.data} dataKey={block.series[0]!.key} nameKey={block.xKey} innerRadius="55%" strokeWidth={2} stroke="var(--card)">
                {block.data.map((d, i) => (
                  <Cell key={String(d[block.xKey])} fill={seriesColor(i)} />
                ))}
              </Pie>
              <ChartLegend content={<ChartLegendContent nameKey={block.xKey} />} />
            </PieChart>
          ) : block.chartType === "bar" ? (
            <BarChart data={block.data} barGap={2}>
              {axes}
              {tooltip}
              {block.series.map((s, i) => (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  fill={seriesColor(i)}
                  stackId={block.stacked ? "stack" : undefined}
                  radius={block.stacked && i < block.series.length - 1 ? 0 : [4, 4, 0, 0]}
                  maxBarSize={36}
                />
              ))}
              {showLegend && <ChartLegend content={<ChartLegendContent />} />}
            </BarChart>
          ) : block.chartType === "line" ? (
            <LineChart data={block.data}>
              {axes}
              {tooltip}
              {block.series.map((s, i) => (
                <Line key={s.key} dataKey={s.key} stroke={seriesColor(i)} strokeWidth={2} dot={false} activeDot={{ r: 4 }} type="monotone" />
              ))}
              {showLegend && <ChartLegend content={<ChartLegendContent />} />}
            </LineChart>
          ) : (
            <AreaChart data={block.data}>
              {axes}
              {tooltip}
              {block.series.map((s, i) => (
                <Area
                  key={s.key}
                  dataKey={s.key}
                  stroke={seriesColor(i)}
                  fill={seriesColor(i)}
                  fillOpacity={0.15}
                  strokeWidth={2}
                  type="monotone"
                  stackId={block.stacked ? "stack" : undefined}
                />
              ))}
              {showLegend && <ChartLegend content={<ChartLegendContent />} />}
            </AreaChart>
          )}
        </ChartContainer>
      )}
    </BlockCard>
  );
}
