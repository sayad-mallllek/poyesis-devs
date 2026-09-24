import type { Allocation, TimeOff } from "@repo/contracts";
import { toIsoDate } from "../common/serialization/index.js";
import type { Prisma } from "../generated/prisma/client.js";

export const allocationInclude = {
  project: { select: { id: true, code: true, name: true, color: true } },
} as const satisfies Prisma.AllocationInclude;

type AllocationRow = Prisma.AllocationGetPayload<{ include: typeof allocationInclude }>;

export function toAllocation(row: AllocationRow): Allocation {
  return {
    id: row.id,
    userId: row.userId,
    projectId: row.projectId,
    project: row.project,
    startDate: toIsoDate(row.startDate),
    endDate: toIsoDate(row.endDate),
    hoursPerDay: row.hoursPerDay,
    includeWeekends: row.includeWeekends,
    tentative: row.tentative,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

type TimeOffRow = Prisma.TimeOffGetPayload<object>;

export function toTimeOff(row: TimeOffRow): TimeOff {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type,
    startDate: toIsoDate(row.startDate),
    endDate: toIsoDate(row.endDate),
    note: row.note,
  };
}
