"use client";

import type { Allocation, ScheduleRow, TimeOff } from "@repo/contracts";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageContainer, PageHeader } from "@/components/app/page-header";
import type { ProjectOption } from "@/components/app/project-picker";
import { ErrorState } from "@/components/app/states";
import { useCan } from "@/components/providers/session-provider";
import { Button } from "@/components/ui/button";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSearchParamsState } from "@/hooks/use-search-param";
import { scheduleQuery } from "@/lib/api/scheduling";
import { parseDate } from "@/lib/format";
import { BookingDialog, type BookingDialogState } from "./booking-dialog";
import { ScheduleGrid } from "./schedule-grid";
import { ScheduleLegend, ScheduleSummary } from "./schedule-summary";
import { ScheduleToolbar } from "./schedule-toolbar";
import { buildDays, formatRange, isZoom, shiftDate, weekStart, ZOOMS } from "./timeline";

const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function ScheduleView() {
  const can = useCan();
  const { get, set } = useSearchParamsState();
  const zoomParam = get("zoom");
  const zoom = isZoom(zoomParam) ? zoomParam : "4w";
  const startParam = get("start");
  const from = startParam && ISO_DATE.test(startParam) ? weekStart(parseDate(startParam)) : weekStart();
  const { days: dayCount, minColumn, step } = ZOOMS[zoom];
  const to = shiftDate(from, dayCount - 1);
  const projectId = get("project") ?? null;
  const department = get("dept") ?? null;

  const [search, setSearch] = useState(get("q") ?? "");
  const debouncedSearch = useDebouncedValue(search.trim());
  useEffect(() => {
    if (debouncedSearch !== (get("q") ?? "")) set({ q: debouncedSearch });
  }, [debouncedSearch, get, set]);

  const [project, setProject] = useState<ProjectOption | null>(null);
  const [dialog, setDialog] = useState<BookingDialogState | null>(null);
  const { data, error, refetch, isFetching } = useQuery(
    scheduleQuery({ from, to, projectId: projectId ?? undefined, search: debouncedSearch || undefined }),
  );

  // Placeholder data keeps the previous range on screen; lay the grid out for the data actually shown.
  const shownFrom = data?.from ?? from;
  const shownCount = data?.rows[0]?.days.length ?? dayCount;
  const workingDays = data?.workingDays ?? DEFAULT_WORKING_DAYS;
  const shownWorkingDays = data?.workingDays;
  const days = useMemo(
    () => buildDays(shownFrom, shownCount, shownWorkingDays ?? DEFAULT_WORKING_DAYS),
    [shownFrom, shownCount, shownWorkingDays],
  );
  const departments = useMemo(
    () => [...new Set(data?.rows.map((r) => r.user.department).filter((d): d is string => !!d))].sort(),
    [data],
  );
  const rows = useMemo(
    () => (department ? data?.rows.filter((r) => r.user.department === department) : data?.rows),
    [data, department],
  );

  const onSelectRange = useCallback(
    (row: ScheduleRow, startDate: string, endDate: string) =>
      setDialog({ kind: "new", user: row.user, startDate, endDate, project: project ?? undefined }),
    [project, setDialog],
  );
  const onOpenAllocation = useCallback(
    (row: ScheduleRow, allocation: Allocation) => setDialog({ kind: "allocation", allocation, user: row.user }),
    [setDialog],
  );
  const onOpenTimeOff = useCallback(
    (row: ScheduleRow, timeOff: TimeOff) => setDialog({ kind: "time-off", timeOff, user: row.user }),
    [setDialog],
  );

  return (
    <PageContainer className="max-w-none">
      <PageHeader
        title="Schedule"
        description="Who is booked on what, and who has room. Drag across days to book someone."
        actions={
          (can("create", "Allocation") || can("create", "TimeOff")) && (
            <Button onClick={() => setDialog({ kind: "new", project: project ?? undefined })}>
              <CalendarPlus /> New booking
            </Button>
          )
        }
        className="pb-4"
      />
      <ScheduleToolbar
        rangeLabel={formatRange(from, to)}
        fetching={isFetching}
        onToday={() => set({ start: null })}
        onShift={(direction) => set({ start: shiftDate(from, direction * step) })}
        zoom={zoom}
        onZoomChange={(z) => set({ zoom: z === "4w" ? null : z })}
        search={search}
        onSearchChange={setSearch}
        projectId={projectId}
        onProjectChange={(id, picked) => {
          setProject(picked);
          set({ project: id });
        }}
        department={department}
        departments={departments}
        onDepartmentChange={(d) => set({ dept: d })}
      />
      {error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : (
        <>
          <ScheduleGrid
            rows={rows}
            days={days}
            minColumn={minColumn}
            onSelectRange={onSelectRange}
            onOpenAllocation={onOpenAllocation}
            onOpenTimeOff={onOpenTimeOff}
            className="max-h-[calc(100svh-17rem)] min-h-80"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <ScheduleSummary rows={rows} />
            <ScheduleLegend />
          </div>
        </>
      )}
      <BookingDialog state={dialog} onClose={() => setDialog(null)} workingDays={workingDays} />
    </PageContainer>
  );
}
