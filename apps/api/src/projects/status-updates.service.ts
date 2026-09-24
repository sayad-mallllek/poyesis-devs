import { Injectable } from "@nestjs/common";
import type { CreateStatusUpdateInput, StatusUpdate } from "@repo/contracts";
import { AuditService } from "../audit/audit.service.js";
import type { Actor } from "../authz/actor.js";
import { AuthzService } from "../authz/authz.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { requireActiveProject } from "./project-lookup.js";
import { statusUpdateInclude, toStatusUpdate } from "./project.serializers.js";

@Injectable()
export class StatusUpdatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
  ) {}

  /** Newest first. */
  async list(actor: Actor, projectId: string, limit?: number): Promise<StatusUpdate[]> {
    this.authz.assert(actor.principal, "read", "StatusUpdate", { projectId });
    await requireActiveProject(this.prisma, projectId);
    const rows = await this.prisma.projectStatusUpdate.findMany({
      where: { projectId },
      include: statusUpdateInclude,
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.map(toStatusUpdate);
  }

  async create(actor: Actor, projectId: string, input: CreateStatusUpdateInput): Promise<StatusUpdate> {
    this.authz.assert(actor.principal, "create", "StatusUpdate", { projectId, authorId: actor.principal.id });
    const project = await requireActiveProject(this.prisma, projectId, { id: true, code: true });
    const row = await this.prisma.$transaction(async (tx) => {
      const update = await tx.projectStatusUpdate.create({
        data: { ...input, projectId, authorId: actor.principal.id },
        include: statusUpdateInclude,
      });
      // Status updates are the members' reporting channel, so they move health/progress without Project:update.
      await tx.project.update({
        where: { id: projectId },
        data: { health: input.health, ...(input.progress !== undefined && { progress: input.progress }) },
      });
      await this.audit.record(
        actor,
        {
          action: "project.status_reported",
          entityType: "Project",
          entityId: projectId,
          summary: `Reported ${project.code} as ${input.health}${
            input.progress !== undefined ? ` at ${input.progress}%` : ""
          }`,
          metadata: { statusUpdateId: update.id },
        },
        tx,
      );
      return update;
    });
    return toStatusUpdate(row);
  }
}
