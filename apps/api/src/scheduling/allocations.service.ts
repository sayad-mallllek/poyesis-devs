import { BadRequestException, Injectable } from "@nestjs/common";
import type {
  Allocation,
  CreateAllocationInput,
  IsoDate,
  ResourceAttributes,
  UpdateAllocationInput,
} from "@repo/contracts";
import { AuditService } from "../audit/audit.service.js";
import type { Actor } from "../authz/actor.js";
import { AuthzService } from "../authz/authz.service.js";
import { notFound } from "../common/http/errors.js";
import { definedOnly, fromIsoDate, toIsoDate } from "../common/serialization/index.js";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService, type PrismaTx } from "../prisma/prisma.service.js";
import { displayName } from "../users/users.service.js";
import { allocationInclude, toAllocation } from "./scheduling.mappers.js";
import {
  assertDateRange,
  overlapping,
  type DateWindow,
  type ListAllocationsQuery,
} from "./scheduling.queries.js";

export interface AllocationFilter extends DateWindow {
  userIds?: readonly string[];
  projectId?: string;
}

@Injectable()
export class AllocationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
  ) {}

  list(actor: Actor, query: ListAllocationsQuery): Promise<Allocation[]> {
    const { userId, ...rest } = query;
    return this.find(actor, { ...rest, userIds: userId ? [userId] : undefined });
  }

  /** Allocations visible to the actor that overlap the window. */
  async find(actor: Actor, filter: AllocationFilter): Promise<Allocation[]> {
    this.authz.assert(actor.principal, "read", "Allocation");
    const rows = await this.prisma.allocation.findMany({
      where: {
        AND: [
          this.authz.where<Prisma.AllocationWhereInput>(actor.principal, "read", "Allocation"),
          overlapping(filter),
          definedOnly({
            userId: filter.userIds && { in: [...filter.userIds] },
            projectId: filter.projectId,
          }),
        ],
      },
      include: allocationInclude,
      orderBy: [{ startDate: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(toAllocation);
  }

  async get(actor: Actor, id: string): Promise<Allocation> {
    const row = await this.prisma.allocation.findUnique({ where: { id }, include: allocationInclude });
    if (!row) throw notFound("Allocation", id);
    this.authz.assert(actor.principal, "read", "Allocation", resourceOf(row));
    return toAllocation(row);
  }

  async create(actor: Actor, input: CreateAllocationInput): Promise<Allocation> {
    this.authz.assert(actor.principal, "create", "Allocation", resourceOf(input));
    const { startDate, endDate, ...rest } = input;
    const row = await this.prisma.$transaction(async (tx) => {
      const target = await this.prepareTarget(tx, actor, input.userId, input.projectId);
      const created = await tx.allocation.create({
        data: {
          ...rest,
          startDate: fromIsoDate(startDate),
          endDate: fromIsoDate(endDate),
          createdById: actor.principal.id,
        },
        include: allocationInclude,
      });
      await this.audit.record(
        actor,
        {
          action: "allocation.created",
          entityType: "Allocation",
          entityId: created.id,
          summary: `Booked ${target.userName} on ${target.projectCode} ${describeRange(startDate, endDate, input.hoursPerDay)}`,
        },
        tx,
      );
      return created;
    });
    return toAllocation(row);
  }

  async update(actor: Actor, id: string, input: UpdateAllocationInput): Promise<Allocation> {
    const current = await this.prisma.allocation.findUnique({ where: { id } });
    if (!current) throw notFound("Allocation", id);
    this.authz.assert(actor.principal, "update", "Allocation", resourceOf(current));

    const next = {
      userId: input.userId ?? current.userId,
      projectId: input.projectId ?? current.projectId,
      startDate: input.startDate ?? toIsoDate(current.startDate),
      endDate: input.endDate ?? toIsoDate(current.endDate),
    };
    assertDateRange(next.startDate, next.endDate);
    const moved = next.userId !== current.userId || next.projectId !== current.projectId;
    // Moving a booking is also a write on the destination person/project.
    if (moved) this.authz.assert(actor.principal, "update", "Allocation", resourceOf(next));

    const { startDate, endDate, ...rest } = input;
    const row = await this.prisma.$transaction(async (tx) => {
      if (moved) await this.prepareTarget(tx, actor, next.userId, next.projectId);
      const updated = await tx.allocation.update({
        where: { id },
        data: definedOnly({
          ...rest,
          startDate: startDate ? fromIsoDate(startDate) : undefined,
          endDate: endDate ? fromIsoDate(endDate) : undefined,
        }),
        include: allocationInclude,
      });
      await this.audit.record(
        actor,
        {
          action: "allocation.updated",
          entityType: "Allocation",
          entityId: id,
          summary: `Updated booking on ${updated.project.code}: ${Object.keys(definedOnly(input)).join(", ")}`,
          metadata: { fields: Object.keys(definedOnly(input)) },
        },
        tx,
      );
      return updated;
    });
    return toAllocation(row);
  }

  async remove(actor: Actor, id: string): Promise<void> {
    const current = await this.prisma.allocation.findUnique({ where: { id } });
    if (!current) throw notFound("Allocation", id);
    this.authz.assert(actor.principal, "delete", "Allocation", resourceOf(current));
    await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.allocation.delete({
        where: { id },
        include: { project: { select: { code: true } } },
      });
      await this.audit.record(
        actor,
        {
          action: "allocation.deleted",
          entityType: "Allocation",
          entityId: id,
          summary: `Removed booking on ${deleted.project.code} ${describeRange(
            toIsoDate(deleted.startDate),
            toIsoDate(deleted.endDate),
            deleted.hoursPerDay,
          )}`,
        },
        tx,
      );
    });
  }

  /**
   * Checks that the person can be booked on the project and, resource-guru
   * style, makes them a contributor if they are not on the team yet.
   */
  private async prepareTarget(tx: PrismaTx, actor: Actor, userId: string, projectId: string) {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { status: true, firstName: true, lastName: true },
    });
    if (!user) throw notFound("User", userId);
    if (user.status !== "ACTIVE") throw new BadRequestException(`${displayName(user)} is not an active user`);

    const project = await tx.project.findUnique({
      where: { id: projectId },
      select: { code: true, ownerId: true, archivedAt: true, members: { where: { userId }, select: { userId: true } } },
    });
    if (!project) throw notFound("Project", projectId);
    if (project.archivedAt) throw new BadRequestException(`Project ${project.code} is archived`);

    const userName = displayName(user);
    if (project.ownerId !== userId && project.members.length === 0) {
      // skipDuplicates keeps a concurrent booking of the same person from failing the transaction.
      const { count } = await tx.projectMember.createMany({
        data: [{ projectId, userId, projectRole: "CONTRIBUTOR" }],
        skipDuplicates: true,
      });
      if (count) {
        await this.audit.record(
          actor,
          {
            action: "project.member_added",
            entityType: "Project",
            entityId: projectId,
            summary: `Added ${userName} to ${project.code} as contributor (booked)`,
            metadata: { userId, projectRole: "CONTRIBUTOR" },
          },
          tx,
        );
      }
    }
    return { userName, projectCode: project.code };
  }
}

const resourceOf = (a: { userId: string; projectId: string }): ResourceAttributes => ({
  userId: a.userId,
  projectId: a.projectId,
});

const describeRange = (startDate: IsoDate, endDate: IsoDate, hoursPerDay: number) =>
  `${startDate} → ${endDate} (${hoursPerDay}h/day)`;
