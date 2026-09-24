import {
  PROJECT_HEALTHS,
  PROJECT_STATUSES,
  type DashboardOverview,
  type IsoDate,
  type ProjectHealth,
  type ProjectStatus,
  type UserRef,
} from "@repo/contracts";
import { daysBetween, round } from "../common/calendar.js";
import { utilizationPercent } from "../scheduling/schedule-builder.js";

type Utilization = DashboardOverview["utilization"];

export const DASHBOARD_LIST_LIMIT = 8;
export const UTILIZATION_LIST_LIMIT = 5;
/** Below this share of capacity a person is considered under-booked. */
const UNDERBOOKED_RATIO = 0.5;

const zeroes = <K extends string>(keys: readonly K[]) =>
  Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;

export function bucketProjects(
  groups: ReadonlyArray<{ status: ProjectStatus; health: ProjectHealth; count: number }>,
): DashboardOverview["projects"] {
  const byStatus = zeroes(PROJECT_STATUSES);
  const byHealth = zeroes(PROJECT_HEALTHS);
  let total = 0;
  for (const { status, health, count } of groups) {
    byStatus[status] += count;
    byHealth[health] += count;
    total += count;
  }
  return { total, byStatus, byHealth };
}

/** Negative when the deadline has passed. */
export const withDaysRemaining = <P extends { targetEndDate: IsoDate }>(project: P, today: IsoDate) => ({
  ...project,
  daysRemaining: daysBetween(today, project.targetEndDate),
});

export interface PersonLoad {
  user: UserRef;
  bookedHours: number;
  capacityHours: number;
}

/** Booked/capacity ratio; a booking without any capacity counts as infinitely over-booked. */
const loadRatio = ({ bookedHours, capacityHours }: PersonLoad) =>
  capacityHours > 0 ? bookedHours / capacityHours : bookedHours > 0 ? Infinity : 0;

export function summarizeUtilization(weekStart: IsoDate, loads: readonly PersonLoad[]): Utilization {
  const bookedHours = round(loads.reduce((sum, l) => sum + l.bookedHours, 0), 2);
  const capacityHours = round(loads.reduce((sum, l) => sum + l.capacityHours, 0), 2);
  const overbooked = loads
    .filter((l) => loadRatio(l) > 1)
    .sort((a, b) => loadRatio(b) - loadRatio(a) || b.bookedHours - a.bookedHours);
  // People with no capacity this week (e.g. on leave) are not "under-booked".
  const underbooked = loads
    .filter((l) => l.capacityHours > 0 && loadRatio(l) < UNDERBOOKED_RATIO)
    .sort((a, b) => loadRatio(a) - loadRatio(b));
  return {
    weekStart,
    capacityHours,
    bookedHours,
    percent: utilizationPercent(bookedHours, capacityHours),
    overbooked: overbooked.slice(0, UTILIZATION_LIST_LIMIT),
    underbooked: underbooked.slice(0, UTILIZATION_LIST_LIMIT),
  };
}
