"use client";

import type { Allocation, ScheduleRow as Row, TimeOff } from "@repo/contracts";
import Link from "next/link";
import { memo, useMemo, useRef, useState } from "react";
import { fullName, UserAvatar } from "@/components/app/user-avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatHours } from "@/lib/format";
import { cn } from "@/lib/utils";
import { BookingBar, LANE_GAP, LANE_HEIGHT, TRACK_PADDING } from "./booking-bar";
import { DayCells } from "./day-cells";
import { layoutLanes, type TimelineDay } from "./timeline";
import { TimeOffBlock } from "./time-off-block";
import { UTILIZATION_BAR, UTILIZATION_TEXT, utilizationLevel } from "./utilization";

export const LEFT_COLUMN_CLASS = "w-40 sm:w-60";

export interface RowPermissions {
  select: boolean;
  editAllocation: (allocation: Allocation) => boolean;
  editTimeOff: boolean;
}

export interface RowHandlers {
  onSelectRange: (row: Row, start: number, end: number) => void;
  onOpenAllocation: (row: Row, allocation: Allocation) => void;
  onOpenTimeOff: (row: Row, timeOff: TimeOff) => void;
}

interface ScheduleRowProps extends RowHandlers {
  row: Row;
  days: readonly TimelineDay[];
  from: string;
  column: number;
  showDayLoad: boolean;
  permissions: RowPermissions;
}

export const ScheduleRow = memo(function ScheduleRow({
  row,
  days,
  from,
  column,
  showDayLoad,
  permissions,
  onSelectRange,
  onOpenAllocation,
  onOpenTimeOff,
}: ScheduleRowProps) {
  const { bars, lanes } = useMemo(() => layoutLanes(row.allocations, from, days.length), [row.allocations, from, days.length]);
  const [selection, setSelection] = useState<{ anchor: number; head: number } | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const bottom = showDayLoad || row.timeOff.length > 0 ? 18 : 8;
  const height = Math.max(52, TRACK_PADDING + Math.max(lanes, 1) * (LANE_HEIGHT + LANE_GAP) - LANE_GAP + bottom);
  const level = utilizationLevel(row.totals.utilization);

  const indexAt = (clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    return Math.min(days.length - 1, Math.max(0, Math.floor((clientX - rect.left) / column)));
  };
  const range = selection && [Math.min(selection.anchor, selection.head), Math.max(selection.anchor, selection.head)];

  return (
    <div className="group/row flex border-b last:border-b-0" style={{ contentVisibility: "auto", containIntrinsicSize: `auto ${height}px` }}>
      <div className={cn("sticky left-0 z-20 flex shrink-0 items-center gap-2.5 border-r bg-card px-3", LEFT_COLUMN_CLASS)}>
        <UserAvatar user={row.user} className="hidden size-8 sm:flex" />
        <div className="min-w-0 flex-1">
          <Link href={`/people/${row.user.id}?tab=schedule`} className="block truncate text-sm font-medium hover:text-primary">
            {fullName(row.user)}
          </Link>
          <p className="truncate text-xs text-muted-foreground">{row.user.jobTitle ?? row.user.department ?? "—"}</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex w-10 shrink-0 flex-col items-end gap-1" tabIndex={0}>
              <span className={cn("text-xs font-semibold tabular-nums", UTILIZATION_TEXT[level])}>{row.totals.utilization}%</span>
              <span className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <span
                  className={cn("block h-full rounded-full", UTILIZATION_BAR[level])}
                  style={{ width: `${Math.min(row.totals.utilization, 100)}%` }}
                />
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right">
            {formatHours(row.totals.bookedHours)} booked of {formatHours(row.totals.capacityHours)} available
          </TooltipContent>
        </Tooltip>
      </div>

      <div
        ref={trackRef}
        className={cn("relative shrink-0 touch-pan-y select-none", permissions.select && "cursor-cell")}
        style={{ width: days.length * column, height }}
        onPointerDown={(e) => {
          if (!permissions.select || e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          const index = indexAt(e.clientX);
          setSelection({ anchor: index, head: index });
        }}
        onPointerMove={(e) => {
          if (!selection) return;
          const head = indexAt(e.clientX);
          if (head !== selection.head) setSelection({ ...selection, head });
        }}
        onPointerUp={() => {
          if (range) onSelectRange(row, range[0]!, range[1]!);
          setSelection(null);
        }}
        onPointerCancel={() => setSelection(null)}
      >
        <DayCells days={days} load={row.days} column={column} showLoad={showDayLoad} />
        {row.timeOff.map((entry) => (
          <TimeOffBlock
            key={entry.id}
            entry={entry}
            from={from}
            dayCount={days.length}
            column={column}
            onOpen={permissions.editTimeOff ? (t) => onOpenTimeOff(row, t) : undefined}
          />
        ))}
        {bars.map((bar) => (
          <BookingBar
            key={bar.item.id}
            bar={bar}
            column={column}
            interactive={permissions.editAllocation(bar.item)}
            onOpen={(allocation) => onOpenAllocation(row, allocation)}
          />
        ))}
        {range && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-1 z-20 rounded-md border-2 border-primary bg-primary/15"
            style={{ left: range[0]! * column + 1, width: (range[1]! - range[0]! + 1) * column - 2 }}
          />
        )}
      </div>
    </div>
  );
});
