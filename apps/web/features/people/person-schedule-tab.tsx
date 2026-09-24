"use client";

import type { Allocation, ScheduleRow, TimeOff, UserDetail } from "@repo/contracts";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, ChevronLeft, ChevronRight, Palmtree } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useCan } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { BookingDialog, type BookingDialogState } from "@/features/schedule/booking-dialog";
import { ScheduleGrid } from "@/features/schedule/schedule-grid";
import { buildDays, formatRange, shiftDate, weekStart } from "@/features/schedule/timeline";
import { allocationsQuery, scheduleQuery, timeOffQuery } from "@/lib/api/scheduling";
import { toIsoDate } from "@/lib/format";
import { UpcomingBookings, UpcomingTimeOff } from "./upcoming-lists";

const WEEKS = 5;
const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];

export function PersonScheduleTab({ user }: { user: UserDetail }) {
  const can = useCan();
  const [from, setFrom] = useState(() => weekStart());
  const to = shiftDate(from, WEEKS * 7 - 1);
  const today = useMemo(() => toIsoDate(new Date()), []);
  const [dialog, setDialog] = useState<BookingDialogState | null>(null);

  const schedule = useQuery(scheduleQuery({ from, to, userIds: [user.id] }));
  const bookings = useQuery(allocationsQuery({ userId: user.id, from: today }));
  const timeOff = useQuery(timeOffQuery({ userId: user.id, from: today }));

  const workingDays = schedule.data?.workingDays ?? DEFAULT_WORKING_DAYS;
  const shownFrom = schedule.data?.from ?? from;
  const shownWorkingDays = schedule.data?.workingDays;
  const days = useMemo(
    () => buildDays(shownFrom, WEEKS * 7, shownWorkingDays ?? DEFAULT_WORKING_DAYS),
    [shownFrom, shownWorkingDays],
  );
  const rows = schedule.data?.rows;

  const openAllocation = useCallback(
    (row: ScheduleRow, allocation: Allocation) => setDialog({ kind: "allocation", allocation, user: row.user }),
    [setDialog],
  );
  const openTimeOff = useCallback(
    (row: ScheduleRow, entry: TimeOff) => setDialog({ kind: "time-off", timeOff: entry, user: row.user }),
    [setDialog],
  );
  const selectRange = useCallback(
    (row: ScheduleRow, startDate: string, endDate: string) => setDialog({ kind: "new", user: row.user, startDate, endDate }),
    [setDialog],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => setFrom(weekStart())}>
          Today
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => setFrom(shiftDate(from, -7))}>
          <ChevronLeft />
          <span className="sr-only">Previous week</span>
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => setFrom(shiftDate(from, 7))}>
          <ChevronRight />
          <span className="sr-only">Next week</span>
        </Button>
        <span className="text-sm font-semibold tabular-nums">{formatRange(from, to)}</span>
        <div className="ml-auto flex gap-2">
          {can("create", "TimeOff", { userId: user.id }) && (
            <Button variant="outline" size="sm" onClick={() => setDialog({ kind: "new", tab: "time-off", user })}>
              <Palmtree /> Add time off
            </Button>
          )}
          {can("create", "Allocation", { userId: user.id }) && (
            <Button size="sm" onClick={() => setDialog({ kind: "new", user })}>
              <CalendarPlus /> Book
            </Button>
          )}
        </div>
      </div>

      <ScheduleGrid
        rows={rows}
        days={days}
        minColumn={24}
        onSelectRange={selectRange}
        onOpenAllocation={openAllocation}
        onOpenTimeOff={openTimeOff}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <UpcomingBookings
          query={bookings}
          onOpen={
            can("update", "Allocation", { userId: user.id })
              ? (allocation) => setDialog({ kind: "allocation", allocation, user })
              : undefined
          }
        />
        <UpcomingTimeOff
          query={timeOff}
          onOpen={
            can("update", "TimeOff", { userId: user.id })
              ? (entry) => setDialog({ kind: "time-off", timeOff: entry, user })
              : undefined
          }
        />
      </div>
      <BookingDialog state={dialog} onClose={() => setDialog(null)} workingDays={workingDays} />
    </div>
  );
}
