import { Injectable } from "@nestjs/common";
import type { CreateRiskInput, Risk, UpdateRiskInput } from "@repo/contracts";
import { AuditService } from "../audit/audit.service.js";
import type { Actor } from "../authz/actor.js";
import { AuthzService } from "../authz/authz.service.js";
import { notFound } from "../common/http/errors.js";
import { definedOnly } from "../common/serialization/index.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { assertUsersExist, requireActiveProject } from "./project-lookup.js";
import { riskInclude, toRisk } from "./project.serializers.js";

@Injectable()
export class RisksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
  ) {}

  /** Highest score first; the score is derived, so ordering happens in memory. */
  async list(actor: Actor, projectId: string): Promise<Risk[]> {
    this.authz.assert(actor.principal, "read", "Risk", { projectId });
    await requireActiveProject(this.prisma, projectId);
    const rows = await this.prisma.projectRisk.findMany({
      where: { projectId },
      include: riskInclude,
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toRisk).sort((a, b) => b.score - a.score);
  }

  async create(actor: Actor, projectId: string, input: CreateRiskInput): Promise<Risk> {
    this.authz.assert(actor.principal, "create", "Risk", { projectId });
    await requireActiveProject(this.prisma, projectId);
    if (input.ownerId) await assertUsersExist(this.prisma, [input.ownerId], "Risk owner");
    const row = await this.prisma.$transaction(async (tx) => {
      const risk = await tx.projectRisk.create({ data: { ...input, projectId }, include: riskInclude });
      await this.audit.record(
        actor,
        {
          action: "risk.created",
          entityType: "Risk",
          entityId: risk.id,
          summary: `Logged risk "${risk.title}" (score ${risk.probability * risk.impact})`,
          metadata: { projectId },
        },
        tx,
      );
      return risk;
    });
    return toRisk(row);
  }

  async update(actor: Actor, projectId: string, id: string, input: UpdateRiskInput): Promise<Risk> {
    this.authz.assert(actor.principal, "update", "Risk", { projectId });
    await requireActiveProject(this.prisma, projectId);
    await this.require(projectId, id);
    if (input.ownerId) await assertUsersExist(this.prisma, [input.ownerId], "Risk owner");
    const row = await this.prisma.$transaction(async (tx) => {
      const risk = await tx.projectRisk.update({ where: { id }, data: definedOnly(input), include: riskInclude });
      const changed = Object.keys(definedOnly(input));
      await this.audit.record(
        actor,
        {
          action: "risk.updated",
          entityType: "Risk",
          entityId: id,
          summary: `Updated risk "${risk.title}": ${changed.join(", ")}`,
          metadata: { projectId, fields: changed },
        },
        tx,
      );
      return risk;
    });
    return toRisk(row);
  }

  async remove(actor: Actor, projectId: string, id: string): Promise<void> {
    this.authz.assert(actor.principal, "delete", "Risk", { projectId });
    await requireActiveProject(this.prisma, projectId);
    const risk = await this.require(projectId, id);
    await this.prisma.$transaction(async (tx) => {
      await tx.projectRisk.delete({ where: { id } });
      await this.audit.record(
        actor,
        {
          action: "risk.deleted",
          entityType: "Risk",
          entityId: id,
          summary: `Deleted risk "${risk.title}"`,
          metadata: { projectId },
        },
        tx,
      );
    });
  }

  private async require(projectId: string, id: string) {
    const risk = await this.prisma.projectRisk.findFirst({ where: { id, projectId }, select: { title: true } });
    if (!risk) throw notFound("Risk", id);
    return risk;
  }
}
