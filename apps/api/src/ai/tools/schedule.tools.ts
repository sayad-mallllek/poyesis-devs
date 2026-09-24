import {
  createAllocationSchema,
  createTimeOffSchema,
  isoDateSchema,
  updateAllocationSchema,
  type Allocation,
  type Schedule,
} from "@repo/contracts";
import { type } from "arktype";
import { round } from "../../common/calendar.js";
import type { ToolDeps } from "./tool-deps.js";
import { defineTool, idArg, type AssistantTool } from "./tool-kit.js";

const window = { from: isoDateSchema, to: isoDateSchema };

const allocationBrief = (a: Allocation) => ({
  id: a.id,
  userId: a.userId,
  project: `${a.project.name} (${a.project.code})`,
  projectId: a.projectId,
  startDate: a.startDate,
  endDate: a.endDate,
  hoursPerDay: a.hoursPerDay,
  tentative: a.tentative,
  note: a.note,
});

/** The per-day grid is too verbose for the model; keep totals and exceptions. */
export function summarizeSchedule(schedule: Schedule) {
  return {
    from: schedule.from,
    to: schedule.to,
    people: schedule.rows.map((row) => ({
      userId: row.user.id,
      name: `${row.user.firstName} ${row.user.lastName}`,
      jobTitle: row.user.jobTitle,
      bookedHours: row.totals.bookedHours,
      capacityHours: row.totals.capacityHours,
      availableHours: round(Math.max(0, row.totals.capacityHours - row.totals.bookedHours)),
      utilizationPercent: row.totals.utilization,
      overbookedDays: row.days
        .filter((d) => d.bookedHours > d.capacityHours && d.bookedHours > 0)
        .map((d) => ({ date: d.date, booked: d.bookedHours, capacity: d.capacityHours })),
      timeOff: row.timeOff.map((t) => ({ type: t.type, startDate: t.startDate, endDate: t.endDate })),
      bookings: row.allocations.map(allocationBrief),
    })),
  };
}

export function scheduleTools(deps: ToolDeps): AssistantTool[] {
  return [
    defineTool({
      name: "get_schedule",
      label: "Reading schedule",
      description:
        "Resource schedule between two dates (max ~6 months): per person booked vs capacity hours, utilization, over-booked days, time off and bookings. Filter by people or project.",
      requires: { action: "read", subject: "Allocation" },
      schema: type({
        ...window,
        "userIds?": type("string").array().describe("user ids"),
        "projectId?": "string",
        "search?": type("string").describe("filter people by name, title or department"),
      }),
      run: async ({ actor }, { userIds, ...query }) =>
        summarizeSchedule(await deps.scheduling.schedule(actor, { ...query, userIds: userIds?.join(",") })),
    }),
    defineTool({
      name: "find_available_people",
      label: "Finding available people",
      description:
        "Rank people by free capacity in a date range, optionally restricted to a skill. Use for staffing questions like 'who can take 20h/week on X next month?'.",
      requires: { action: "read", subject: "Allocation" },
      schema: type({ ...window, "skillId?": type("string").describe("id from list_skills"), "minAvailableHours?": "number >= 0" }),
      run: async ({ actor }, { from, to, skillId, minAvailableHours = 0 }) => {
        const skilled = skillId
          ? new Set((await deps.users.list(actor, { skillId, pageSize: 100, status: "ACTIVE" })).items.map((u) => u.id))
          : null;
        const { people } = summarizeSchedule(await deps.scheduling.schedule(actor, { from, to }));
        return people
          .filter((p) => (!skilled || skilled.has(p.userId)) && p.availableHours >= minAvailableHours)
          .sort((a, b) => b.availableHours - a.availableHours)
          .map(({ bookings: _bookings, overbookedDays: _overbooked, ...rest }) => rest);
      },
    }),
    defineTool({
      name: "list_bookings",
      label: "Reading bookings",
      description: "List bookings (allocations) overlapping a window, optionally for one person or project.",
      requires: { action: "read", subject: "Allocation" },
      schema: type({ "from?": isoDateSchema, "to?": isoDateSchema, "userId?": "string", "projectId?": "string" }),
      run: async ({ actor }, query) => (await deps.allocations.list(actor, query)).map(allocationBrief),
    }),
    defineTool({
      name: "create_booking",
      label: "Booking time",
      description:
        "Book a person on a project for hoursPerDay on each working day between startDate and endDate (inclusive). Adds them to the project team if needed. Check get_schedule first to avoid over-booking and mention conflicts.",
      requires: { action: "create", subject: "Allocation" },
      schema: createAllocationSchema,
      run: async ({ actor }, input) => allocationBrief(await deps.allocations.create(actor, input)),
    }),
    defineTool({
      name: "update_booking",
      label: "Updating booking",
      description: "Change a booking's dates, hours, person, project or note.",
      requires: { action: "update", subject: "Allocation" },
      schema: type({ bookingId: idArg, changes: updateAllocationSchema }),
      run: async ({ actor }, { bookingId, changes }) => allocationBrief(await deps.allocations.update(actor, bookingId, changes)),
    }),
    defineTool({
      name: "delete_booking",
      label: "Delete booking",
      description: "Delete a booking. The user is asked to confirm.",
      requires: { action: "delete", subject: "Allocation" },
      mode: "confirm",
      schema: type({ bookingId: idArg, summary: type("string").describe("e.g. 'Ada on ACME-WEB, 1–15 Oct, 4h/d'") }),
      describe: ({ summary }) => `Delete the booking: ${summary}.`,
      run: async ({ actor }, { bookingId }) => {
        await deps.allocations.remove(actor, bookingId);
        return { deleted: true };
      },
    }),
    defineTool({
      name: "create_time_off",
      label: "Recording time off",
      description: "Record vacation, sick leave, a holiday or other absence for a person.",
      requires: { action: "create", subject: "TimeOff" },
      schema: createTimeOffSchema,
      run: ({ actor }, input) => deps.timeOff.create(actor, input),
    }),
  ];
}
