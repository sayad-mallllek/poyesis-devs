import { Injectable } from "@nestjs/common";
import type { CreateMilestoneInput, Milestone, MilestoneStatus, UpdateMilestoneInput } from "@repo/contracts";
import { AuditService } from "../audit/audit.service.js";
import type { Actor } from "../authz/actor.js";
import { AuthzService } from "../authz/authz.service.js";
import { notFound } from "../common/http/errors.js";
import { definedOnly, fromIsoDate } from "../common/serialization/index.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { requireActiveProject } from "./project-lookup.js";
import { toMilestone } from "./project.serializers.js";

@Injectable()
export class MilestonesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: Actor, projectId: string): Promise<Milestone[]> {
    this.authz.assert(actor.principal, "read", "Milestone", { projectId });
    await requireActiveProject(this.prisma, projectId);
    const rows = await this.prisma.milestone.findMany({
      where: { projectId },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(toMilestone);
  }

  async create(actor: Actor, projectId: string, input: CreateMilestoneInput): Promise<Milestone> {
    this.authz.assert(actor.principal, "create", "Milestone", { projectId });
    await requireActiveProject(this.prisma, projectId);
    const row = await this.prisma.$transaction(async (tx) => {
      const milestone = await tx.milestone.create({
        data: {
          ...input,
          projectId,
          dueDate: fromIsoDate(input.dueDate),
          completedAt: input.status === "DONE" ? new Date() : null,
        },
      });
      await this.audit.record(
        actor,
        {
          action: "milestone.created",
          entityType: "Milestone",
          entityId: milestone.id,
          summary: `Added milestone "${milestone.name}" due ${input.dueDate}`,
          metadata: { projectId },
        },
        tx,
      );
      return milestone;
    });
    return toMilestone(row);
  }

  async update(actor: Actor, projectId: string, id: string, input: UpdateMilestoneInput): Promise<Milestone> {
    this.authz.assert(actor.principal, "update", "Milestone", { projectId });
    await requireActiveProject(this.prisma, projectId);
    const current = await this.require(projectId, id);
    const { dueDate, ...fields } = input;
    const row = await this.prisma.$transaction(async (tx) => {
      const milestone = await tx.milestone.update({
        where: { id },
        data: definedOnly({
          ...fields,
          dueDate: dueDate ? fromIsoDate(dueDate) : undefined,
          completedAt: completedAtTransition(current, input.status),
        }),
      });
      const changed = Object.keys(definedOnly(input));
      await this.audit.record(
        actor,
        {
          action: "milestone.updated",
          entityType: "Milestone",
          entityId: id,
          summary: `Updated milestone "${milestone.name}": ${changed.join(", ")}`,
          metadata: { projectId, fields: changed },
        },
        tx,
      );
      return milestone;
    });
    return toMilestone(row);
  }

  async remove(actor: Actor, projectId: string, id: string): Promise<void> {
    this.authz.assert(actor.principal, "delete", "Milestone", { projectId });
    await requireActiveProject(this.prisma, projectId);
    const milestone = await this.require(projectId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.milestone.delete({ where: { id } });
      await this.audit.record(
        actor,
        {
          action: "milestone.deleted",
          entityType: "Milestone",
          entityId: id,
          summary: `Deleted milestone "${milestone.name}"`,
          metadata: { projectId },
        },
        tx,
      );
    });
  }

  private async require(projectId: string, id: string) {
    const milestone = await this.prisma.milestone.findFirst({ where: { id, projectId } });
    if (!milestone) throw notFound("Milestone", id);
    return milestone;
  }
}

/** `completedAt` tracks entering DONE; leaving DONE clears it. `undefined` = leave as is. */
function completedAtTransition(
  current: { status: MilestoneStatus },
  next: MilestoneStatus | undefined,
): Date | null | undefined {
  if (next === undefined || next === current.status) return undefined;
  return next === "DONE" ? new Date() : current.status === "DONE" ? null : undefined;
}
