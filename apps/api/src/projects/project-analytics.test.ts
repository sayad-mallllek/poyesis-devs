import type { Milestone } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import {
  analyticsWindow,
  bookedHours,
  budgetMetrics,
  milestoneStats,
  riskMatrix,
  scheduleMetrics,
  spanOf,
  sumHours,
  weeklySeries,
} from "./project-analytics.js";

const WEEKDAYS = [1, 2, 3, 4, 5];
const booking = (userId: string, startDate: string, endDate: string, hoursPerDay = 8) => ({
  userId,
  startDate,
  endDate,
  hoursPerDay,
  includeWeekends: false,
});

describe("scheduleMetrics", () => {
  const base = { startDate: "2026-09-01", targetEndDate: "2026-09-11", actualEndDate: null, progress: 30 };

  it("measures elapsed time and variance", () => {
    expect(scheduleMetrics({ ...base, today: "2026-09-06" })).toEqual({
      startDate: "2026-09-01",
      targetEndDate: "2026-09-11",
      progress: 30,
      daysTotal: 10,
      daysElapsed: 5,
      daysRemaining: 5,
      timeElapsedPercent: 50,
      scheduleVariance: -20,
    });
  });

  it("clamps before the start and reports overdue days after the target", () => {
    expect(scheduleMetrics({ ...base, today: "2026-08-01" })).toMatchObject({ daysElapsed: 0, timeElapsedPercent: 0 });
    expect(scheduleMetrics({ ...base, today: "2026-09-14" })).toMatchObject({
      daysElapsed: 10,
      daysRemaining: -3,
      timeElapsedPercent: 100,
    });
  });

  it("stops the clock at the actual end date", () => {
    expect(
      scheduleMetrics({ ...base, actualEndDate: "2026-09-03", progress: 100, today: "2026-12-01" }),
    ).toMatchObject({ daysElapsed: 2, timeElapsedPercent: 20, scheduleVariance: 80 });
  });

  it("returns nulls without both dates", () => {
    expect(scheduleMetrics({ ...base, targetEndDate: null, today: "2026-09-06" })).toMatchObject({
      daysTotal: null,
      timeElapsedPercent: null,
      scheduleVariance: null,
    });
  });
});

describe("bookedHours", () => {
  it("counts working days only and skips each member's time off", () => {
    // 2026-09-21 is a Monday.
    const { byDay, byUser } = bookedHours(
      [booking("a", "2026-09-21", "2026-09-27"), booking("b", "2026-09-21", "2026-09-22", 4)],
      [{ userId: "a", startDate: "2026-09-23", endDate: "2026-09-23" }],
      WEEKDAYS,
    );
    expect(byUser.get("a")).toBe(32);
    expect(byUser.get("b")).toBe(8);
    expect(byDay.get("2026-09-21")).toBe(12);
    expect(byDay.has("2026-09-23")).toBe(false);
    expect(byDay.has("2026-09-26")).toBe(false);
    expect(sumHours(byDay)).toBe(40);
    expect(sumHours(byDay, "2026-09-22")).toBe(24);
  });
});

describe("windows and weekly series", () => {
  it("falls back to the allocation span for missing project dates", () => {
    const span = spanOf([
      { startDate: "2026-10-01", endDate: "2026-10-10" },
      { startDate: "2026-09-15", endDate: "2026-09-20" },
    ]);
    expect(span).toEqual({ from: "2026-09-15", to: "2026-10-10" });
    expect(analyticsWindow({ startDate: null, targetEndDate: null, actualEndDate: null }, span)).toEqual(span);
    expect(analyticsWindow({ startDate: "2026-09-01", targetEndDate: null, actualEndDate: null }, span)).toEqual({
      from: "2026-09-01",
      to: "2026-10-10",
    });
    expect(analyticsWindow({ startDate: null, targetEndDate: null, actualEndDate: null }, null)).toBeNull();
  });

  it("buckets by ISO week, keeps empty weeks and accumulates", () => {
    const { byDay } = bookedHours(
      [booking("a", "2026-09-21", "2026-09-22"), booking("a", "2026-10-05", "2026-10-05")],
      [],
      WEEKDAYS,
    );
    expect(weeklySeries(byDay, { from: "2026-09-23", to: "2026-10-06" })).toEqual([
      { weekStart: "2026-09-21", hours: 0, cumulative: 0 },
      { weekStart: "2026-09-28", hours: 0, cumulative: 0 },
      { weekStart: "2026-10-05", hours: 8, cumulative: 8 },
    ]);
    expect(weeklySeries(byDay, { from: "2026-09-21", to: "2026-10-05" }).map((w) => w.cumulative)).toEqual([16, 16, 24]);
  });
});

describe("budgetMetrics", () => {
  it("burns booked hours at the hourly rate", () => {
    expect(
      budgetMetrics({ budgetAmount: 10_000, currency: "EUR", hourlyRate: 85.5, bookedHoursToDate: 10, bookedHoursTotal: 40 }),
    ).toEqual({ budgetAmount: 10_000, currency: "EUR", burnedToDate: 855, forecastAtCompletion: 3420 });
    expect(
      budgetMetrics({ budgetAmount: null, currency: "EUR", hourlyRate: null, bookedHoursToDate: 10, bookedHoursTotal: 40 }),
    ).toMatchObject({ burnedToDate: null, forecastAtCompletion: null });
  });
});

describe("milestoneStats", () => {
  const milestone = (id: string, dueDate: string, status: Milestone["status"]): Milestone => ({
    id,
    projectId: "p",
    name: id,
    description: null,
    dueDate,
    status,
    completedAt: null,
  });

  it("counts done/overdue and lists upcoming by due date", () => {
    const stats = milestoneStats(
      [
        milestone("late", "2026-09-01", "IN_PROGRESS"),
        milestone("missed", "2026-09-02", "MISSED"),
        milestone("done", "2026-09-03", "DONE"),
        milestone("later", "2026-11-01", "PENDING"),
        milestone("soon", "2026-10-01", "PENDING"),
        milestone("today", "2026-09-24", "PENDING"),
      ],
      "2026-09-24",
    );
    expect(stats).toMatchObject({ total: 6, done: 1, overdue: 2 });
    expect(stats.upcoming.map((m) => m.id)).toEqual(["today", "soon", "later"]);
  });
});

describe("riskMatrix", () => {
  it("counts risks by probability and impact", () => {
    const matrix = riskMatrix([
      { probability: 5, impact: 5 },
      { probability: 5, impact: 5 },
      { probability: 1, impact: 3 },
      { probability: 6, impact: 1 },
    ]);
    expect(matrix).toHaveLength(5);
    expect(matrix[4]![4]).toBe(2);
    expect(matrix[0]![2]).toBe(1);
    expect(matrix.flat().reduce((a, b) => a + b)).toBe(3);
  });
});
