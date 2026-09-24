import { BadRequestException, Injectable } from "@nestjs/common";
import type { Allocation, Schedule, ScheduleQuery, TimeOff } from "@repo/contracts";
import type { Actor } from "../authz/actor.js";
import { AuthzService } from "../authz/authz.service.js";
import { daysBetween } from "../common/calendar.js";
import { userRefSelect } from "../common/serialization/index.js";
import { CompanyService } from "../company/company.service.js";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { AllocationsService } from "./allocations.service.js";
import { buildScheduleRow } from "./schedule-builder.js";
import { TimeOffService } from "./time-off.service.js";

/** About six months: keeps the day-by-day payload bounded. */
export const MAX_SCHEDULE_DAYS = 184;

const scheduleUserSelect = {
  ...userRefSelect,
  weeklyCapacityHours: true,
  department: true,
} as const satisfies Prisma.UserSelect;

@Injectable()
export class SchedulingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly company: CompanyService,
    private readonly allocations: AllocationsService,
    private readonly timeOff: TimeOffService,
  ) {}

  /** Resource-planning calendar: one row per active person with day-by-day load. */
  async schedule(actor: Actor, query: ScheduleQuery): Promise<Schedule> {
    this.authz.assert(actor.principal, "read", "Allocation");
    const { from, to, projectId } = query;
    if (daysBetween(from, to) + 1 > MAX_SCHEDULE_DAYS) {
      throw new BadRequestException(`The schedule range cannot exceed ${MAX_SCHEDULE_DAYS} days`);
    }
    // Restricting rows to a project reveals its team, so the project itself must be readable.
    if (projectId) this.authz.assert(actor.principal, "read", "Project", { id: projectId });

    const [{ workingDays }, users] = await Promise.all([
      this.company.settings(),
      this.prisma.user.findMany({
        where: this.userFilter(actor, query),
        select: scheduleUserSelect,
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
    ]);
    const userIds = users.map((u) => u.id);
    const [allocations, timeOff] = await Promise.all([
      this.allocations.find(actor, { from, to, userIds, projectId }),
      this.timeOff.find(actor, { from, to, userIds }),
    ]);
    const allocationsByUser = groupByUser(allocations);
    const timeOffByUser = groupByUser(timeOff);

    return {
      from,
      to,
      workingDays,
      rows: users.map((user) =>
        buildScheduleRow({
          user,
          allocations: allocationsByUser.get(user.id) ?? [],
          timeOff: timeOffByUser.get(user.id) ?? [],
          from,
          to,
          workingDays,
        }),
      ),
    };
  }

  private userFilter(actor: Actor, { userIds, projectId, search }: ScheduleQuery): Prisma.UserWhereInput {
    const ids = userIds?.split(",").map((id) => id.trim()).filter(Boolean);
    const words = search?.trim().split(/\s+/).filter(Boolean) ?? [];
    return {
      AND: [
        this.authz.where<Prisma.UserWhereInput>(actor.principal, "read", "User"),
        { status: "ACTIVE" },
        ids?.length ? { id: { in: ids } } : {},
        projectId
          ? { OR: [{ memberships: { some: { projectId } } }, { ownedProjects: { some: { id: projectId } } }] }
          : {},
        // Every word must match some field, so "ada backend" finds Ada from the Backend team.
        ...words.map<Prisma.UserWhereInput>((word) => ({
          OR: [
            { firstName: { contains: word, mode: "insensitive" } },
            { lastName: { contains: word, mode: "insensitive" } },
            { jobTitle: { contains: word, mode: "insensitive" } },
            { department: { contains: word, mode: "insensitive" } },
          ],
        })),
      ],
    };
  }
}

function groupByUser<T extends Allocation | TimeOff>(items: readonly T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(item.userId);
    if (group) group.push(item);
    else groups.set(item.userId, [item]);
  }
  return groups;
}
