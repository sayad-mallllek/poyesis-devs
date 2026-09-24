import type { IsoDate } from "@repo/contracts";
import { fromIsoDate, toIsoDate } from "./serialization/index.js";

const DAY_MS = 86_400_000;

/** Inclusive list of calendar dates between two `YYYY-MM-DD` dates (UTC). */
export function eachDay(from: IsoDate, to: IsoDate): IsoDate[] {
  const days: IsoDate[] = [];
  for (let t = fromIsoDate(from).getTime(), end = fromIsoDate(to).getTime(); t <= end; t += DAY_MS) {
    days.push(toIsoDate(new Date(t)));
  }
  return days;
}

/** 0 = Sunday … 6 = Saturday, evaluated in UTC to match `@db.Date` storage. */
export const weekday = (date: IsoDate) => fromIsoDate(date).getUTCDay();

export const addDays = (date: IsoDate, days: number): IsoDate =>
  toIsoDate(new Date(fromIsoDate(date).getTime() + days * DAY_MS));

/** Whole days from `a` to `b` (positive when `b` is later). */
export const daysBetween = (a: IsoDate, b: IsoDate) =>
  Math.round((fromIsoDate(b).getTime() - fromIsoDate(a).getTime()) / DAY_MS);

/** Monday of the ISO week containing `date`. */
export function startOfIsoWeek(date: IsoDate): IsoDate {
  const offset = (weekday(date) + 6) % 7;
  return addDays(date, -offset);
}

export const todayIso = (): IsoDate => toIsoDate(new Date());

export const maxDate = (a: IsoDate, b: IsoDate) => (a > b ? a : b);
export const minDate = (a: IsoDate, b: IsoDate) => (a < b ? a : b);

export interface BookingLike {
  startDate: IsoDate;
  endDate: IsoDate;
  hoursPerDay: number;
  includeWeekends: boolean;
}

export interface CalendarRules {
  /** ISO weekday numbers considered working days (0 = Sunday). */
  workingDays: readonly number[];
  /** Dates on which the person is unavailable (time off). */
  unavailable?: ReadonlySet<IsoDate>;
}

/** Whether a booking consumes hours on a given day. */
export function bookingAppliesOn(booking: BookingLike, date: IsoDate, rules: CalendarRules): boolean {
  if (date < booking.startDate || date > booking.endDate) return false;
  if (rules.unavailable?.has(date)) return false;
  return booking.includeWeekends || rules.workingDays.includes(weekday(date));
}

/**
 * Expands bookings into hours per day within [from, to]. Days without hours
 * are omitted. This is the single source of truth for "booked hours" used by
 * the schedule, project analytics and the dashboard.
 */
export function bookedHoursByDay(
  bookings: readonly BookingLike[],
  from: IsoDate,
  to: IsoDate,
  rules: CalendarRules,
): Map<IsoDate, number> {
  const hours = new Map<IsoDate, number>();
  for (const booking of bookings) {
    const start = maxDate(booking.startDate, from);
    const end = minDate(booking.endDate, to);
    if (start > end) continue;
    for (const date of eachDay(start, end)) {
      if (bookingAppliesOn(booking, date, rules)) {
        hours.set(date, (hours.get(date) ?? 0) + booking.hoursPerDay);
      }
    }
  }
  return hours;
}

/** Daily capacity of a person given their weekly capacity and the working week. */
export const dailyCapacity = (weeklyCapacityHours: number, workingDays: readonly number[]) =>
  workingDays.length ? weeklyCapacityHours / workingDays.length : 0;

export const round = (value: number, digits = 1) => {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
};
