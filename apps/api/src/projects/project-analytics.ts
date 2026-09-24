import type { IsoDate, Milestone, ProjectAnalytics } from "@repo/contracts";
import {
  addDays,
  bookedHoursByDay,
  daysBetween,
  eachDay,
  maxDate,
  minDate,
  round,
  startOfIsoWeek,
  type BookingLike,
} from "../common/calendar.js";

/** Pure computations behind `GET /projects/:id/analytics`. */

/** Bounds the weekly series for absurd date ranges (≈ 10 years). */
const MAX_WEEKS = 520;
const UPCOMING_MILESTONES = 5;

export interface DateWindow {
  from: IsoDate;
  to: IsoDate;
}

export function scheduleMetrics(input: {
  startDate: IsoDate | null;
  targetEndDate: IsoDate | null;
  actualEndDate: IsoDate | null;
  progress: number;
  today: IsoDate;
}): ProjectAnalytics["schedule"] {
  const { startDate, targetEndDate, progress } = input;
  const base = { startDate, targetEndDate, progress };
  if (!startDate || !targetEndDate) {
    return { ...base, daysTotal: null, daysElapsed: null, daysRemaining: null, timeElapsedPercent: null, scheduleVariance: null };
  }
  // A finished project's clock stops at its actual end date.
  const asOf = input.actualEndDate ? minDate(input.actualEndDate, input.today) : input.today;
  const daysTotal = daysBetween(startDate, targetEndDate);
  const daysElapsed = Math.min(Math.max(daysBetween(startDate, asOf), 0), daysTotal);
  const timeElapsedPercent =
    daysTotal > 0 ? round((daysElapsed / daysTotal) * 100) : asOf >= startDate ? 100 : 0;
  return {
    ...base,
    daysTotal,
    daysElapsed,
    // Negative once the target date has passed: the project is overdue by that many days.
    daysRemaining: daysBetween(asOf, targetEndDate),
    timeElapsedPercent,
    scheduleVariance: round(progress - timeElapsedPercent),
  };
}

export interface MemberBooking extends BookingLike {
  userId: string;
}

export interface Absence {
  userId: string;
  startDate: IsoDate;
  endDate: IsoDate;
}

/**
 * Expands allocations into booked hours per day and per member, honouring the
 * company's working days and each member's time off.
 */
export function bookedHours(
  bookings: readonly MemberBooking[],
  absences: readonly Absence[],
  workingDays: readonly number[],
): { byDay: Map<IsoDate, number>; byUser: Map<string, number> } {
  const byDay = new Map<IsoDate, number>();
  const byUser = new Map<string, number>();
  const userIds = new Set(bookings.map((b) => b.userId));
  for (const userId of userIds) {
    const own = bookings.filter((b) => b.userId === userId);
    const span = spanOf(own);
    if (!span) continue;
    const unavailable = new Set(
      absences
        .filter((a) => a.userId === userId)
        .flatMap((a) => eachDay(maxDate(a.startDate, span.from), minDate(a.endDate, span.to))),
    );
    for (const [day, hours] of bookedHoursByDay(own, span.from, span.to, { workingDays, unavailable })) {
      byDay.set(day, (byDay.get(day) ?? 0) + hours);
      byUser.set(userId, (byUser.get(userId) ?? 0) + hours);
    }
  }
  return { byDay, byUser };
}

/** Earliest start to latest end of a set of date ranges. */
export function spanOf(ranges: readonly { startDate: IsoDate; endDate: IsoDate }[]): DateWindow | null {
  if (!ranges.length) return null;
  return {
    from: ranges.map((r) => r.startDate).reduce(minDate),
    to: ranges.map((r) => r.endDate).reduce(maxDate),
  };
}

/** The project's own dates, completed from the allocation span where missing. */
export function analyticsWindow(
  project: { startDate: IsoDate | null; targetEndDate: IsoDate | null; actualEndDate: IsoDate | null },
  allocationSpan: DateWindow | null,
): DateWindow | null {
  const from = project.startDate ?? allocationSpan?.from;
  const to = project.actualEndDate ?? project.targetEndDate ?? allocationSpan?.to;
  if (!from || !to || from > to) return null;
  return { from, to };
}

export const sumHours = (byDay: ReadonlyMap<IsoDate, number>, until?: IsoDate) => {
  let total = 0;
  for (const [day, hours] of byDay) if (!until || day <= until) total += hours;
  return round(total, 2);
};

/** Hours per ISO week over `window`, including empty weeks, with a running total. */
export function weeklySeries(
  byDay: ReadonlyMap<IsoDate, number>,
  window: DateWindow,
): ProjectAnalytics["effort"]["weekly"] {
  const buckets = new Map<IsoDate, number>();
  for (const [day, hours] of byDay) {
    if (day < window.from || day > window.to) continue;
    const week = startOfIsoWeek(day);
    buckets.set(week, (buckets.get(week) ?? 0) + hours);
  }
  const series: ProjectAnalytics["effort"]["weekly"] = [];
  let cumulative = 0;
  for (let week = startOfIsoWeek(window.from); week <= window.to && series.length < MAX_WEEKS; week = addDays(week, 7)) {
    const hours = buckets.get(week) ?? 0;
    cumulative += hours;
    series.push({ weekStart: week, hours: round(hours, 2), cumulative: round(cumulative, 2) });
  }
  return series;
}

export function budgetMetrics(input: {
  budgetAmount: number | null;
  currency: string;
  hourlyRate: number | null;
  bookedHoursToDate: number;
  bookedHoursTotal: number;
}): ProjectAnalytics["budget"] {
  const cost = (hours: number) => (input.hourlyRate == null ? null : round(hours * input.hourlyRate, 2));
  return {
    budgetAmount: input.budgetAmount,
    currency: input.currency,
    burnedToDate: cost(input.bookedHoursToDate),
    forecastAtCompletion: cost(input.bookedHoursTotal),
  };
}

export function milestoneStats(milestones: readonly Milestone[], today: IsoDate): ProjectAnalytics["milestones"] {
  const pending = milestones.filter((m) => m.status !== "DONE");
  return {
    total: milestones.length,
    done: milestones.length - pending.length,
    overdue: pending.filter((m) => m.dueDate < today).length,
    upcoming: pending
      .filter((m) => m.dueDate >= today)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
      .slice(0, UPCOMING_MILESTONES),
  };
}

/** `matrix[probability - 1][impact - 1]` counts; out-of-range scores are ignored. */
export function riskMatrix(risks: readonly { probability: number; impact: number }[]): number[][] {
  const matrix = Array.from({ length: 5 }, () => Array<number>(5).fill(0));
  for (const { probability, impact } of risks) {
    const row = matrix[probability - 1];
    if (row && impact >= 1 && impact <= 5) row[impact - 1]! += 1;
  }
  return matrix;
}
