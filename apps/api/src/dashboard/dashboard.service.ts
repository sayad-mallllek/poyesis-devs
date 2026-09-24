import { Injectable } from "@nestjs/common";
import type { DashboardOverview, IsoDate } from "@repo/contracts";
import type { Actor } from "../authz/actor.js";
import { AuthzService } from "../authz/authz.service.js";
import { addDays, startOfIsoWeek, todayIso } from "../common/calendar.js";
import { fromIsoDate, toIsoDate, toUserRef } from "../common/serialization/index.js";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { SchedulingService } from "../scheduling/scheduling.service.js";
import {
  bucketProjects,
  DASHBOARD_LIST_LIMIT,
  summarizeUtilization,
  withDaysRemaining,
} from "./dashboard.metrics.js";

/** Deadlines further away than this are not "upcoming". */
const DEADLINE_HORIZON_DAYS = 45;

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly scheduling: SchedulingService,
  ) {}

  /** Every figure is scoped to what the actor may read. */
  async overview(actor: Actor): Promise<DashboardOverview> {
    const today = todayIso();
    const [projects, upcomingDeadlines, overdueMilestones, utilization, headcount, clients] = await Promise.all([
      this.projectCounts(actor),
      this.upcomingDeadlines(actor, today),
      this.overdueMilestones(actor, today),
      this.utilization(actor, today),
      this.prisma.user.count({ where: this.activeUsers(actor) }),
      this.authz.can(actor.principal, "read", "Client") ? this.prisma.client.count() : 0,
    ]);
    return { projects, upcomingDeadlines, overdueMilestones, utilization, headcount, clients };
  }

  private visibleProjects(actor: Actor): Prisma.ProjectWhereInput {
    return {
      AND: [this.authz.where<Prisma.ProjectWhereInput>(actor.principal, "read", "Project"), { archivedAt: null }],
    };
  }

  private activeUsers(actor: Actor): Prisma.UserWhereInput {
    return { AND: [this.authz.where<Prisma.UserWhereInput>(actor.principal, "read", "User"), { status: "ACTIVE" }] };
  }

  private async projectCounts(actor: Actor) {
    const groups = await this.prisma.project.groupBy({
      by: ["status", "health"],
      where: this.visibleProjects(actor),
      _count: { _all: true },
    });
    return bucketProjects(groups.map((g) => ({ status: g.status, health: g.health, count: g._count._all })));
  }

  /** Includes overdue projects (negative `daysRemaining`), soonest first. */
  private async upcomingDeadlines(actor: Actor, today: IsoDate): Promise<DashboardOverview["upcomingDeadlines"]> {
    const rows = await this.prisma.project.findMany({
      where: {
        AND: [
          this.visibleProjects(actor),
          { status: { in: ["ACTIVE", "PLANNING"] } },
          { targetEndDate: { not: null, lte: fromIsoDate(addDays(today, DEADLINE_HORIZON_DAYS)) } },
        ],
      },
      select: { id: true, code: true, name: true, color: true, health: true, progress: true, targetEndDate: true },
      orderBy: { targetEndDate: "asc" },
      take: DASHBOARD_LIST_LIMIT,
    });
    return rows.flatMap(({ targetEndDate, ...project }) =>
      targetEndDate ? [withDaysRemaining({ ...project, targetEndDate: toIsoDate(targetEndDate) }, today)] : [],
    );
  }

  private async overdueMilestones(actor: Actor, today: IsoDate): Promise<DashboardOverview["overdueMilestones"]> {
    const rows = await this.prisma.milestone.findMany({
      where: {
        AND: [
          this.authz.where<Prisma.MilestoneWhereInput>(actor.principal, "read", "Milestone"),
          { dueDate: { lt: fromIsoDate(today) }, status: { not: "DONE" }, project: { archivedAt: null } },
        ],
      },
      select: {
        id: true,
        name: true,
        dueDate: true,
        project: { select: { id: true, code: true, name: true, color: true } },
      },
      orderBy: { dueDate: "asc" },
      take: DASHBOARD_LIST_LIMIT,
    });
    return rows.map((m) => ({ ...m, dueDate: toIsoDate(m.dueDate) }));
  }

  /** Current ISO week, computed from the same schedule rows as the planning calendar. */
  private async utilization(actor: Actor, today: IsoDate) {
    const weekStart = startOfIsoWeek(today);
    if (!this.authz.can(actor.principal, "read", "Allocation")) return summarizeUtilization(weekStart, []);
    const { rows } = await this.scheduling.schedule(actor, { from: weekStart, to: addDays(weekStart, 6) });
    return summarizeUtilization(
      weekStart,
      rows.map((row) => ({
        user: toUserRef(row.user),
        bookedHours: row.totals.bookedHours,
        capacityHours: row.totals.capacityHours,
      })),
    );
  }
}
