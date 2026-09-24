"use client";

import type { Allocation, IsoDate, ScheduleRow as Row, TimeOff } from "@repo/contracts";
import { CalendarX2 } from "lucide-react";
import { useCallback, useMemo, useRef } from "react";
import { EmptyState } from "@/components/app/states";
import { useCan } from "@/components/providers/session-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ScheduleHeader } from "./schedule-header";
import { LEFT_COLUMN_CLASS, ScheduleRow, type RowPermissions } from "./schedule-row";
import type { TimelineDay } from "./timeline";
import { useColumnWidth } from "./use-column-width";

export interface ScheduleGridProps {
  rows: Row[] | undefined;
  days: readonly TimelineDay[];
  minColumn: number;
  onSelectRange: (row: Row, startDate: IsoDate, endDate: IsoDate) => void;
  onOpenAllocation: (row: Row, allocation: Allocation) => void;
  onOpenTimeOff: (row: Row, timeOff: TimeOff) => void;
  className?: string;
  /** Replaces the default "no people" state. */
  empty?: React.ReactNode;
}

export function ScheduleGrid({
  rows,
  days,
  minColumn,
  onSelectRange,
  onOpenAllocation,
  onOpenTimeOff,
  className,
  empty,
}: ScheduleGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const column = useColumnWidth(scrollRef, days.length, minColumn);
  const can = useCan();
  const from = days[0]?.date ?? "";

  const permissions = useMemo(() => {
    const map = new Map<string, RowPermissions>();
    for (const row of rows ?? []) {
      const userId = row.user.id;
      map.set(userId, {
        select: can("create", "Allocation", { userId }) || can("create", "TimeOff", { userId }),
        editAllocation: (a) => can("update", "Allocation", { userId, projectId: a.projectId }),
        editTimeOff: can("update", "TimeOff", { userId }),
      });
    }
    return map;
  }, [rows, can]);

  const selectRange = useCallback(
    (row: Row, start: number, end: number) => onSelectRange(row, days[start]!.date, days[end]!.date),
    [days, onSelectRange],
  );

  return (
    <div
      ref={scrollRef}
      className={cn("relative overflow-auto overscroll-x-contain rounded-xl border bg-card shadow-xs", className)}
    >
      <div className="w-max min-w-full">
        <ScheduleHeader
          days={days}
          column={column}
          label={rows ? `${rows.length} ${rows.length === 1 ? "person" : "people"}` : "People"}
        />
        {!rows ? (
          Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex h-14 border-b">
              <div className={cn("sticky left-0 flex shrink-0 items-center gap-2 border-r bg-card px-3", LEFT_COLUMN_CLASS)}>
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-4 flex-1" />
              </div>
              <div className="flex-1 p-2">
                <Skeleton className="h-6" style={{ width: `${30 + ((i * 37) % 50)}%`, marginLeft: `${(i * 13) % 30}%` }} />
              </div>
            </div>
          ))
        ) : rows.length === 0 ? (
          <div className="sticky left-0 w-[min(100%,100vw)] max-w-full p-6">
            {empty ?? <EmptyState icon={<CalendarX2 />} title="No people match" description="Adjust the filters to see more people." />}
          </div>
        ) : (
          rows.map((row) => (
            <ScheduleRow
              key={row.user.id}
              row={row}
              days={days}
              from={from}
              column={column}
              showDayLoad={column >= 44}
              permissions={permissions.get(row.user.id)!}
              onSelectRange={selectRange}
              onOpenAllocation={onOpenAllocation}
              onOpenTimeOff={onOpenTimeOff}
            />
          ))
        )}
      </div>
    </div>
  );
}
