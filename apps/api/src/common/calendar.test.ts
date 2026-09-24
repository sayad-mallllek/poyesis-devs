import { describe, expect, it } from "vitest";
import { bookedHoursByDay, eachDay, startOfIsoWeek } from "./calendar.js";

const WEEKDAYS = [1, 2, 3, 4, 5];

describe("calendar", () => {
  it("lists days inclusively", () => {
    expect(eachDay("2026-09-28", "2026-10-01")).toEqual([
      "2026-09-28",
      "2026-09-29",
      "2026-09-30",
      "2026-10-01",
    ]);
  });

  it("finds the ISO week start", () => {
    expect(startOfIsoWeek("2026-09-27")).toBe("2026-09-21"); // Sunday → previous Monday
    expect(startOfIsoWeek("2026-09-21")).toBe("2026-09-21");
  });

  it("skips weekends and time off, clamps to the window", () => {
    const hours = bookedHoursByDay(
      [{ startDate: "2026-09-24", endDate: "2026-09-30", hoursPerDay: 4, includeWeekends: false }],
      "2026-09-25",
      "2026-10-10",
      { workingDays: WEEKDAYS, unavailable: new Set(["2026-09-29"]) },
    );
    expect([...hours.entries()]).toEqual([
      ["2026-09-25", 4],
      ["2026-09-28", 4],
      ["2026-09-30", 4],
    ]);
  });

  it("sums overlapping bookings", () => {
    const hours = bookedHoursByDay(
      [
        { startDate: "2026-09-28", endDate: "2026-09-28", hoursPerDay: 3, includeWeekends: false },
        { startDate: "2026-09-28", endDate: "2026-09-29", hoursPerDay: 2.5, includeWeekends: false },
      ],
      "2026-09-28",
      "2026-09-29",
      { workingDays: WEEKDAYS },
    );
    expect(hours.get("2026-09-28")).toBe(5.5);
    expect(hours.get("2026-09-29")).toBe(2.5);
  });
});
