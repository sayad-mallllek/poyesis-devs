import { type } from "arktype";
import { isoDateSchema, type IsoDate, type IsoDateTime, type UserRef } from "./common.js";
import { TIME_OFF_TYPES, type TimeOffType } from "./enums.js";

const dateRange = <T extends { startDate: string; endDate: string }>(
  value: T,
  ctx: { reject: (p: { path: string[]; expected: string }) => false },
) =>
  value.startDate <= value.endDate ||
  ctx.reject({ path: ["endDate"], expected: "on or after the start date" });

// ── Allocations (a.k.a. bookings) ─────────────────────────────────────────

/**
 * A booking reserves `hoursPerDay` of a person on a project for every working
 * day between `startDate` and `endDate` (inclusive), resource-guru style.
 */
export const createAllocationSchema = type({
  userId: "string > 0",
  projectId: "string > 0",
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  hoursPerDay: "0 < number <= 24",
  "includeWeekends?": "boolean",
  "tentative?": "boolean",
  "note?": "string <= 1000 | null",
}).narrow(dateRange);
export type CreateAllocationInput = typeof createAllocationSchema.infer;

export const updateAllocationSchema = type({
  "userId?": "string > 0",
  "projectId?": "string > 0",
  "startDate?": isoDateSchema,
  "endDate?": isoDateSchema,
  "hoursPerDay?": "0 < number <= 24",
  "includeWeekends?": "boolean",
  "tentative?": "boolean",
  "note?": "string <= 1000 | null",
});
export type UpdateAllocationInput = typeof updateAllocationSchema.infer;

export interface Allocation {
  id: string;
  userId: string;
  projectId: string;
  project: { id: string; code: string; name: string; color: string };
  startDate: IsoDate;
  endDate: IsoDate;
  hoursPerDay: number;
  includeWeekends: boolean;
  tentative: boolean;
  note: string | null;
  createdAt: IsoDateTime;
}

// ── Time off ──────────────────────────────────────────────────────────────

export const createTimeOffSchema = type({
  userId: "string > 0",
  type: type.enumerated(...TIME_OFF_TYPES),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
  "note?": "string <= 500 | null",
}).narrow(dateRange);
export type CreateTimeOffInput = typeof createTimeOffSchema.infer;

export const updateTimeOffSchema = type({
  "type?": type.enumerated(...TIME_OFF_TYPES),
  "startDate?": isoDateSchema,
  "endDate?": isoDateSchema,
  "note?": "string <= 500 | null",
});
export type UpdateTimeOffInput = typeof updateTimeOffSchema.infer;

export interface TimeOff {
  id: string;
  userId: string;
  type: TimeOffType;
  startDate: IsoDate;
  endDate: IsoDate;
  note: string | null;
}

// ── Schedule (calendar view) ──────────────────────────────────────────────

export const scheduleQuerySchema = type({
  from: isoDateSchema,
  to: isoDateSchema,
  "userIds?": "string",
  "projectId?": "string",
  "search?": "string",
}).narrow(
  (q, ctx) =>
    q.from <= q.to || ctx.reject({ path: ["to"], expected: "on or after `from`" }),
);
export type ScheduleQuery = typeof scheduleQuerySchema.infer;

export interface ScheduleDay {
  date: IsoDate;
  bookedHours: number;
  capacityHours: number;
  isWorkingDay: boolean;
  timeOff: TimeOffType | null;
}

export interface ScheduleRow {
  user: UserRef & { weeklyCapacityHours: number; department: string | null };
  allocations: Allocation[];
  timeOff: TimeOff[];
  /** One entry per calendar day in the requested range. */
  days: ScheduleDay[];
  totals: { bookedHours: number; capacityHours: number; utilization: number };
}

export interface Schedule {
  from: IsoDate;
  to: IsoDate;
  workingDays: number[];
  rows: ScheduleRow[];
}
