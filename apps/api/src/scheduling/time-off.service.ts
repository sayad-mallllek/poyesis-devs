import { Injectable } from "@nestjs/common";
import type { CreateTimeOffInput, TimeOff, UpdateTimeOffInput } from "@repo/contracts";
import { AuditService } from "../audit/audit.service.js";
import type { Actor } from "../authz/actor.js";
import { AuthzService } from "../authz/authz.service.js";
import { conflict, notFound } from "../common/http/errors.js";
import { definedOnly, fromIsoDate, toIsoDate } from "../common/serialization/index.js";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService, type PrismaTx } from "../prisma/prisma.service.js";
import { displayName } from "../users/users.service.js";
import { toTimeOff } from "./scheduling.mappers.js";
import { assertDateRange, overlapping, type DateWindow, type ListTimeOffQuery } from "./scheduling.queries.js";

export interface TimeOffFilter extends DateWindow {
  userIds?: readonly string[];
}

@Injectable()
export class TimeOffService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
  ) {}

  list(actor: Actor, query: ListTimeOffQuery): Promise<TimeOff[]> {
    const { userId, ...window } = query;
    return this.find(actor, { ...window, userIds: userId ? [userId] : undefined });
  }

  /** Time off visible to the actor that overlaps the window. */
  async find(actor: Actor, filter: TimeOffFilter): Promise<TimeOff[]> {
    this.authz.assert(actor.principal, "read", "TimeOff");
    const rows = await this.prisma.timeOff.findMany({
      where: {
        AND: [
          this.authz.where<Prisma.TimeOffWhereInput>(actor.principal, "read", "TimeOff"),
          overlapping(filter),
          filter.userIds ? { userId: { in: [...filter.userIds] } } : {},
        ],
      },
      orderBy: { startDate: "asc" },
    });
    return rows.map(toTimeOff);
  }

  async create(actor: Actor, input: CreateTimeOffInput): Promise<TimeOff> {
    this.authz.assert(actor.principal, "create", "TimeOff", { userId: input.userId });
    const user = await this.prisma.user.findUnique({
      where: { id: input.userId },
      select: { firstName: true, lastName: true },
    });
    if (!user) throw notFound("User", input.userId);

    const { startDate, endDate, ...rest } = input;
    const row = await this.prisma.$transaction(async (tx) => {
      await assertNoOverlap(tx, input.userId, startDate, endDate);
      const created = await tx.timeOff.create({
        data: { ...rest, startDate: fromIsoDate(startDate), endDate: fromIsoDate(endDate) },
      });
      await this.audit.record(
        actor,
        {
          action: "time_off.created",
          entityType: "TimeOff",
          entityId: created.id,
          summary: `Recorded ${input.type.toLowerCase()} for ${displayName(user)} ${startDate} → ${endDate}`,
        },
        tx,
      );
      return created;
    });
    return toTimeOff(row);
  }

  async update(actor: Actor, id: string, input: UpdateTimeOffInput): Promise<TimeOff> {
    const current = await this.prisma.timeOff.findUnique({ where: { id } });
    if (!current) throw notFound("TimeOff", id);
    this.authz.assert(actor.principal, "update", "TimeOff", { userId: current.userId });

    const startDate = input.startDate ?? toIsoDate(current.startDate);
    const endDate = input.endDate ?? toIsoDate(current.endDate);
    assertDateRange(startDate, endDate);

    const row = await this.prisma.$transaction(async (tx) => {
      await assertNoOverlap(tx, current.userId, startDate, endDate, id);
      const updated = await tx.timeOff.update({
        where: { id },
        data: definedOnly({
          type: input.type,
          note: input.note,
          startDate: input.startDate ? fromIsoDate(input.startDate) : undefined,
          endDate: input.endDate ? fromIsoDate(input.endDate) : undefined,
        }),
      });
      await this.audit.record(
        actor,
        {
          action: "time_off.updated",
          entityType: "TimeOff",
          entityId: id,
          summary: `Updated time off: ${Object.keys(definedOnly(input)).join(", ")}`,
          metadata: { userId: current.userId, fields: Object.keys(definedOnly(input)) },
        },
        tx,
      );
      return updated;
    });
    return toTimeOff(row);
  }

  async remove(actor: Actor, id: string): Promise<void> {
    const current = await this.prisma.timeOff.findUnique({ where: { id } });
    if (!current) throw notFound("TimeOff", id);
    this.authz.assert(actor.principal, "delete", "TimeOff", { userId: current.userId });
    await this.prisma.$transaction(async (tx) => {
      await tx.timeOff.delete({ where: { id } });
      await this.audit.record(
        actor,
        {
          action: "time_off.deleted",
          entityType: "TimeOff",
          entityId: id,
          summary: `Removed time off ${toIsoDate(current.startDate)} → ${toIsoDate(current.endDate)}`,
          metadata: { userId: current.userId },
        },
        tx,
      );
    });
  }
}

/** A day can only carry one kind of absence, otherwise the calendar is ambiguous. */
async function assertNoOverlap(
  tx: PrismaTx,
  userId: string,
  startDate: string,
  endDate: string,
  excludeId?: string,
) {
  const clash = await tx.timeOff.findFirst({
    where: { userId, ...overlapping({ from: startDate, to: endDate }), ...(excludeId && { id: { not: excludeId } }) },
    select: { startDate: true, endDate: true },
  });
  if (clash) {
    throw conflict(
      `Overlaps existing time off ${toIsoDate(clash.startDate)} → ${toIsoDate(clash.endDate)}`,
    );
  }
}
