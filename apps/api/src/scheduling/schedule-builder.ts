import type {
  Allocation,
  IsoDate,
  ScheduleDay,
  ScheduleRow,
  TimeOff,
  TimeOffType,
} from "@repo/contracts";
import {
  bookedHoursByDay,
  dailyCapacity,
  eachDay,
  maxDate,
  minDate,
  round,
  weekday,
} from "../common/calendar.js";

export interface ScheduleRowInput {
  user: ScheduleRow["user"];
  allocations: Allocation[];
  timeOff: TimeOff[];
  from: IsoDate;
  to: IsoDate;
  workingDays: readonly number[];
}

/** Absence type per day within [from, to]. */
export function timeOffByDay(timeOff: readonly TimeOff[], from: IsoDate, to: IsoDate) {
  const days = new Map<IsoDate, TimeOffType>();
  for (const entry of timeOff) {
    const start = maxDate(entry.startDate, from);
    const end = minDate(entry.endDate, to);
    if (start > end) continue;
    for (const date of eachDay(start, end)) if (!days.has(date)) days.set(date, entry.type);
  }
  return days;
}

/** Booked share of capacity as a whole percentage; 0 when there is no capacity. */
export const utilizationPercent = (bookedHours: number, capacityHours: number) =>
  capacityHours > 0 ? Math.round((bookedHours / capacityHours) * 100) : 0;

/**
 * One calendar row: bookings are not counted on days off, and capacity is the
 * person's weekly capacity spread over the company's working days.
 */
export function buildScheduleRow({ user, allocations, timeOff, from, to, workingDays }: ScheduleRowInput): ScheduleRow {
  const absences = timeOffByDay(timeOff, from, to);
  const booked = bookedHoursByDay(allocations, from, to, {
    workingDays,
    unavailable: new Set(absences.keys()),
  });
  const perDay = dailyCapacity(user.weeklyCapacityHours, workingDays);

  const days = eachDay(from, to).map<ScheduleDay>((date) => {
    const absence = absences.get(date) ?? null;
    const isWorkingDay = workingDays.includes(weekday(date));
    return {
      date,
      bookedHours: round(booked.get(date) ?? 0, 2),
      capacityHours: isWorkingDay && !absence ? round(perDay, 2) : 0,
      isWorkingDay,
      timeOff: absence,
    };
  });

  const bookedHours = round(days.reduce((sum, d) => sum + d.bookedHours, 0), 2);
  const capacityHours = round(days.reduce((sum, d) => sum + d.capacityHours, 0), 2);
  return {
    user,
    allocations,
    timeOff,
    days,
    totals: { bookedHours, capacityHours, utilization: utilizationPercent(bookedHours, capacityHours) },
  };
}
