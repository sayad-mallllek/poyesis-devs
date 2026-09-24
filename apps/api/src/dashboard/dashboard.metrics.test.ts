import { describe, expect, it } from "vitest";
import { bucketProjects, summarizeUtilization, withDaysRemaining, type PersonLoad } from "./dashboard.metrics.js";

const person = (id: string, bookedHours: number, capacityHours: number): PersonLoad => ({
  user: { id, firstName: id, lastName: "", email: `${id}@example.com`, avatarUrl: null, jobTitle: null },
  bookedHours,
  capacityHours,
});

describe("bucketProjects", () => {
  it("fills every status and health, summing grouped counts", () => {
    const projects = bucketProjects([
      { status: "ACTIVE", health: "ON_TRACK", count: 3 },
      { status: "ACTIVE", health: "AT_RISK", count: 1 },
      { status: "PLANNING", health: "ON_TRACK", count: 2 },
    ]);
    expect(projects.total).toBe(6);
    expect(projects.byStatus).toEqual({ PLANNING: 2, ACTIVE: 4, ON_HOLD: 0, COMPLETED: 0, CANCELLED: 0 });
    expect(projects.byHealth).toEqual({ ON_TRACK: 5, AT_RISK: 1, OFF_TRACK: 0 });
  });
});

describe("withDaysRemaining", () => {
  it("counts days until the deadline, negative when overdue", () => {
    expect(withDaysRemaining({ targetEndDate: "2026-10-04" }, "2026-09-24").daysRemaining).toBe(10);
    expect(withDaysRemaining({ targetEndDate: "2026-09-20" }, "2026-09-24").daysRemaining).toBe(-4);
  });
});

describe("summarizeUtilization", () => {
  it("aggregates hours and computes the overall percentage", () => {
    const summary = summarizeUtilization("2026-09-21", [person("a", 30, 40), person("b", 10, 40)]);
    expect(summary).toMatchObject({ weekStart: "2026-09-21", bookedHours: 40, capacityHours: 80, percent: 50 });
  });

  it("ranks over-booked people by load, including bookings without capacity", () => {
    const summary = summarizeUtilization("2026-09-21", [
      person("fine", 40, 40),
      person("busy", 48, 40),
      person("slammed", 60, 40),
      person("onLeave", 8, 0),
    ]);
    expect(summary.overbooked.map((l) => l.user.id)).toEqual(["onLeave", "slammed", "busy"]);
  });

  it("lists under-booked people emptiest first, ignoring people without capacity", () => {
    const summary = summarizeUtilization("2026-09-21", [
      person("half", 20, 40),
      person("idle", 0, 40),
      person("light", 10, 40),
      person("away", 0, 0),
    ]);
    expect(summary.underbooked.map((l) => l.user.id)).toEqual(["idle", "light"]);
  });

  it("keeps at most five entries per list", () => {
    const idle = Array.from({ length: 7 }, (_, i) => person(`p${i}`, 0, 40));
    expect(summarizeUtilization("2026-09-21", idle).underbooked).toHaveLength(5);
  });

  it("handles an empty team", () => {
    expect(summarizeUtilization("2026-09-21", [])).toEqual({
      weekStart: "2026-09-21",
      bookedHours: 0,
      capacityHours: 0,
      percent: 0,
      overbooked: [],
      underbooked: [],
    });
  });
});
