import type { Allocation, TimeOff } from "@repo/contracts";
import { describe, expect, it } from "vitest";
import { buildScheduleRow, timeOffByDay, utilizationPercent } from "./schedule-builder.js";

const WEEKDAYS = [1, 2, 3, 4, 5];

const user = {
  id: "u1",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  avatarUrl: null,
  jobTitle: null,
  department: null,
  weeklyCapacityHours: 40,
};

const allocation = (overrides: Partial<Allocation>): Allocation => ({
  id: "a1",
  userId: "u1",
  projectId: "p1",
  project: { id: "p1", code: "P1", name: "Project", color: "#000" },
  startDate: "2026-09-28",
  endDate: "2026-10-04",
  hoursPerDay: 6,
  includeWeekends: false,
  tentative: false,
  note: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  ...overrides,
});

const vacation = (startDate: string, endDate: string): TimeOff => ({
  id: `t-${startDate}`,
  userId: "u1",
  type: "VACATION",
  startDate,
  endDate,
  note: null,
});

describe("buildScheduleRow", () => {
  // Monday 2026-09-28 → Sunday 2026-10-04
  const week = { from: "2026-09-28", to: "2026-10-04", workingDays: WEEKDAYS };

  it("emits one day per date with capacity only on working days", () => {
    const row = buildScheduleRow({ ...week, user, allocations: [allocation({})], timeOff: [] });
    expect(row.days).toHaveLength(7);
    expect(row.days.map((d) => d.capacityHours)).toEqual([8, 8, 8, 8, 8, 0, 0]);
    expect(row.days.map((d) => d.bookedHours)).toEqual([6, 6, 6, 6, 6, 0, 0]);
    expect(row.days[5]).toMatchObject({ date: "2026-10-03", isWorkingDay: false, timeOff: null });
    expect(row.totals).toEqual({ bookedHours: 30, capacityHours: 40, utilization: 75 });
  });

  it("removes both booked hours and capacity on time off", () => {
    const row = buildScheduleRow({
      ...week,
      user,
      allocations: [allocation({})],
      timeOff: [vacation("2026-09-30", "2026-10-01")],
    });
    expect(row.days[2]).toEqual({
      date: "2026-09-30",
      bookedHours: 0,
      capacityHours: 0,
      isWorkingDay: true,
      timeOff: "VACATION",
    });
    expect(row.totals).toEqual({ bookedHours: 18, capacityHours: 24, utilization: 75 });
  });

  it("counts weekend bookings when requested, beyond capacity", () => {
    const row = buildScheduleRow({
      ...week,
      user,
      allocations: [allocation({ includeWeekends: true, hoursPerDay: 4 }), allocation({ id: "a2", hoursPerDay: 6 })],
      timeOff: [],
    });
    expect(row.days[0]?.bookedHours).toBe(10);
    expect(row.days[6]).toMatchObject({ bookedHours: 4, capacityHours: 0 });
    expect(row.totals).toEqual({ bookedHours: 58, capacityHours: 40, utilization: 145 });
  });

  it("spreads weekly capacity over the company's working days", () => {
    const row = buildScheduleRow({
      ...week,
      workingDays: [1, 2, 3, 4],
      user: { ...user, weeklyCapacityHours: 30 },
      allocations: [],
      timeOff: [],
    });
    expect(row.days.map((d) => d.capacityHours)).toEqual([7.5, 7.5, 7.5, 7.5, 0, 0, 0]);
    expect(row.totals.utilization).toBe(0);
  });
});

describe("timeOffByDay", () => {
  it("clamps absences to the window", () => {
    const days = timeOffByDay([vacation("2026-09-20", "2026-09-29")], "2026-09-28", "2026-10-04");
    expect([...days.keys()]).toEqual(["2026-09-28", "2026-09-29"]);
  });
});

describe("utilizationPercent", () => {
  it("rounds and guards against zero capacity", () => {
    expect(utilizationPercent(10, 30)).toBe(33);
    expect(utilizationPercent(5, 0)).toBe(0);
  });
});
