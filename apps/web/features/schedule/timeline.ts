import type { IsoDate } from "@repo/contracts";
import { addDays, differenceInCalendarDays, format, getISOWeek, startOfWeek } from "date-fns";
import { parseDate, toIsoDate } from "@/lib/format";

export const ZOOMS = {
  "2w": { label: "2 weeks", days: 14, minColumn: 56, step: 7 },
  "4w": { label: "4 weeks", days: 28, minColumn: 34, step: 7 },
  "3m": { label: "3 months", days: 91, minColumn: 16, step: 28 },
} as const;
export type Zoom = keyof typeof ZOOMS;
export const isZoom = (value: string | undefined): value is Zoom => !!value && value in ZOOMS;

export interface TimelineDay {
  date: IsoDate;
  label: string;
  weekday: string;
  isWorkingDay: boolean;
  isToday: boolean;
}

export interface TimelineSpan {
  key: string;
  label: string;
  title: string;
  start: number;
  span: number;
}

export const weekStart = (date: Date = new Date()) => toIsoDate(startOfWeek(date, { weekStartsOn: 1 }));
export const shiftDate = (date: IsoDate, days: number) => toIsoDate(addDays(parseDate(date), days));
export const dayOffset = (from: IsoDate, date: IsoDate) => differenceInCalendarDays(parseDate(date), parseDate(from));

/** Company working days use JS numbering (0 = Sunday), as returned by the API. */
export function buildDays(from: IsoDate, count: number, workingDays: readonly number[]): TimelineDay[] {
  const today = toIsoDate(new Date());
  const start = parseDate(from);
  return Array.from({ length: count }, (_, i) => {
    const day = addDays(start, i);
    const date = toIsoDate(day);
    return {
      date,
      label: format(day, "d"),
      weekday: format(day, "EEEEE"),
      isWorkingDay: workingDays.includes(day.getDay()),
      isToday: date === today,
    };
  });
}

function spans(
  days: readonly TimelineDay[],
  keyOf: (d: Date) => string,
  describe: (d: Date) => Pick<TimelineSpan, "label" | "title">,
) {
  const result: TimelineSpan[] = [];
  days.forEach((day, index) => {
    const date = parseDate(day.date);
    const key = keyOf(date);
    const last = result.at(-1);
    if (last?.key === key) last.span++;
    else result.push({ key, start: index, span: 1, ...describe(date) });
  });
  return result;
}

export const weekSpans = (days: readonly TimelineDay[]) =>
  spans(
    days,
    (d) => `${format(d, "RRRR")}-${getISOWeek(d)}`,
    (d) => {
      const monday = startOfWeek(d, { weekStartsOn: 1 });
      return { label: `W${getISOWeek(d)} · ${format(monday, "d MMM")}`, title: `Week ${getISOWeek(d)}, from ${format(monday, "d MMM yyyy")}` };
    },
  );

export const monthSpans = (days: readonly TimelineDay[]) =>
  spans(
    days,
    (d) => format(d, "yyyy-MM"),
    (d) => ({ label: format(d, "MMMM yyyy"), title: format(d, "MMMM yyyy") }),
  );

export interface LaidOut<T> {
  item: T;
  start: number;
  /** Inclusive, clipped to the visible range. */
  end: number;
  lane: number;
  clippedStart: boolean;
  clippedEnd: boolean;
}

/** Greedy interval packing: each item takes the first lane free on its start day. */
export function layoutLanes<T extends { startDate: IsoDate; endDate: IsoDate }>(
  items: readonly T[],
  from: IsoDate,
  dayCount: number,
): { bars: LaidOut<T>[]; lanes: number } {
  const laneEnds: number[] = [];
  const bars = [...items]
    .map((item) => ({ item, rawStart: dayOffset(from, item.startDate), rawEnd: dayOffset(from, item.endDate) }))
    .filter(({ rawStart, rawEnd }) => rawEnd >= 0 && rawStart < dayCount)
    .sort((a, b) => a.rawStart - b.rawStart || b.rawEnd - a.rawEnd)
    .map(({ item, rawStart, rawEnd }) => {
      const start = Math.max(rawStart, 0);
      const end = Math.min(rawEnd, dayCount - 1);
      let lane = laneEnds.findIndex((laneEnd) => laneEnd < start);
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = end;
      return { item, start, end, lane, clippedStart: rawStart < 0, clippedEnd: rawEnd > dayCount - 1 };
    });
  return { bars, lanes: laneEnds.length };
}

/** Working days a booking consumes, mirroring the API's calendar rules (time off aside). */
export function countBookedDays(
  startDate: IsoDate,
  endDate: IsoDate,
  includeWeekends: boolean,
  workingDays: readonly number[],
) {
  const total = dayOffset(startDate, endDate) + 1;
  if (total <= 0) return 0;
  if (includeWeekends) return total;
  const start = parseDate(startDate);
  let count = 0;
  for (let i = 0; i < total; i++) if (workingDays.includes(addDays(start, i).getDay())) count++;
  return count;
}

export function formatRange(from: IsoDate, to: IsoDate) {
  const a = parseDate(from);
  const b = parseDate(to);
  if (a.getFullYear() !== b.getFullYear()) return `${format(a, "d MMM yyyy")} – ${format(b, "d MMM yyyy")}`;
  if (a.getMonth() !== b.getMonth()) return `${format(a, "d MMM")} – ${format(b, "d MMM yyyy")}`;
  return `${format(a, "d")} – ${format(b, "d MMM yyyy")}`;
}
