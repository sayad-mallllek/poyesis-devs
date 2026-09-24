import { Injectable } from "@nestjs/common";
import type { ProjectAnalytics } from "@repo/contracts";
import type { Actor } from "../authz/actor.js";
import { AuthzService } from "../authz/authz.service.js";
import { round, todayIso } from "../common/calendar.js";
import {
  decimalToNumber,
  fromIsoDate,
  toIsoDate,
  toIsoDateOrNull,
  toUserRef,
  userRefSelect,
} from "../common/serialization/index.js";
import { CompanyService } from "../company/company.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
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
import { requireActiveProject } from "./project-lookup.js";
import { OPEN_RISK_STATUSES, toMilestone } from "./project.serializers.js";

@Injectable()
export class ProjectAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly company: CompanyService,
  ) {}

  async get(actor: Actor, projectId: string): Promise<ProjectAnalytics> {
    this.authz.assert(actor.principal, "read", "Project", { id: projectId });
    const [project, allocationRows, milestoneRows, risks, statusUpdates, { workingDays }] = await Promise.all([
      requireActiveProject(this.prisma, projectId, {
        startDate: true,
        targetEndDate: true,
        actualEndDate: true,
        progress: true,
        estimatedHours: true,
        budgetAmount: true,
        currency: true,
        hourlyRate: true,
      }),
      this.prisma.allocation.findMany({
        where: { projectId },
        select: {
          userId: true,
          startDate: true,
          endDate: true,
          hoursPerDay: true,
          includeWeekends: true,
          user: { select: userRefSelect },
        },
      }),
      this.prisma.milestone.findMany({ where: { projectId }, orderBy: { dueDate: "asc" } }),
      this.prisma.projectRisk.findMany({
        where: { projectId, status: { in: [...OPEN_RISK_STATUSES] } },
        select: { probability: true, impact: true },
      }),
      this.prisma.projectStatusUpdate.findMany({
        where: { projectId },
        select: { createdAt: true, health: true, progress: true },
        orderBy: { createdAt: "asc" },
      }),
      this.company.settings(),
    ]);

    const today = todayIso();
    const allocations = allocationRows.map((a) => ({
      ...a,
      startDate: toIsoDate(a.startDate),
      endDate: toIsoDate(a.endDate),
    }));
    const span = spanOf(allocations);
    const absences = span ? await this.absences(allocations.map((a) => a.userId), span.from, span.to) : [];
    const { byDay, byUser } = bookedHours(allocations, absences, workingDays);
    const bookedHoursToDate = sumHours(byDay, today);
    const bookedHoursTotal = sumHours(byDay);

    const dates = {
      startDate: toIsoDateOrNull(project.startDate),
      targetEndDate: toIsoDateOrNull(project.targetEndDate),
      actualEndDate: toIsoDateOrNull(project.actualEndDate),
    };
    const window = analyticsWindow(dates, span);
    const users = new Map(allocationRows.map((a) => [a.userId, a.user]));

    return {
      schedule: scheduleMetrics({ ...dates, progress: project.progress, today }),
      effort: {
        estimatedHours: project.estimatedHours,
        bookedHoursToDate,
        bookedHoursTotal,
        weekly: window ? weeklySeries(byDay, window) : [],
        byMember: [...byUser]
          .map(([userId, hours]) => ({ user: toUserRef(users.get(userId)!), hours: round(hours, 2) }))
          .sort((a, b) => b.hours - a.hours),
      },
      budget: budgetMetrics({
        budgetAmount: decimalToNumber(project.budgetAmount),
        currency: project.currency,
        hourlyRate: decimalToNumber(project.hourlyRate),
        bookedHoursToDate,
        bookedHoursTotal,
      }),
      milestones: milestoneStats(milestoneRows.map(toMilestone), today),
      risks: { open: risks.length, matrix: riskMatrix(risks) },
      healthHistory: statusUpdates.map((u) => ({
        date: u.createdAt.toISOString(),
        health: u.health,
        progress: u.progress,
      })),
    };
  }

  private async absences(userIds: string[], from: string, to: string) {
    const rows = await this.prisma.timeOff.findMany({
      where: {
        userId: { in: [...new Set(userIds)] },
        startDate: { lte: fromIsoDate(to) },
        endDate: { gte: fromIsoDate(from) },
      },
      select: { userId: true, startDate: true, endDate: true },
    });
    return rows.map((r) => ({ userId: r.userId, startDate: toIsoDate(r.startDate), endDate: toIsoDate(r.endDate) }));
  }
}
