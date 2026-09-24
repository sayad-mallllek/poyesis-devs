import { Injectable, Logger } from "@nestjs/common";
import type { AuditLogEntry, ListAuditLogsQuery, Paginated } from "@repo/contracts";
import type { Actor } from "../authz/actor.js";
import { AuthzService } from "../authz/authz.service.js";
import { pageArgs, paginated, toUserRef, userRefSelect } from "../common/serialization/index.js";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService, type PrismaTx } from "../prisma/prisma.service.js";

export interface AuditEvent {
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata?: Record<string, unknown>;
}

const ORIGIN = { web: "WEB", ai: "AI", system: "SYSTEM" } as const;

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
  ) {}

  /**
   * Records a mutation. Pass the transaction client to make the audit entry
   * atomic with the change it describes.
   */
  async record(actor: Actor, event: AuditEvent, tx: PrismaTx | PrismaService = this.prisma) {
    try {
      await tx.auditLog.create({
        data: {
          actorId: actor.principal.id,
          origin: ORIGIN[actor.origin],
          action: event.action,
          entityType: event.entityType,
          entityId: event.entityId,
          summary: event.summary,
          metadata: (event.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      // Inside a transaction the failure must propagate; outside, never block the caller.
      if (tx !== this.prisma) throw error;
      this.logger.error({ err: error, event }, "Failed to write audit log");
    }
  }

  async list(actor: Actor, query: ListAuditLogsQuery): Promise<Paginated<AuditLogEntry>> {
    this.authz.assert(actor.principal, "read", "AuditLog");
    const { skip, take, ...page } = pageArgs(query);
    const where: Prisma.AuditLogWhereInput = {
      entityType: query.entityType,
      entityId: query.entityId,
      actorId: query.actorId,
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: { actor: { select: userRefSelect } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return paginated(
      rows.map((row) => ({
        id: row.id,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        summary: row.summary,
        actor: row.actor ? toUserRef(row.actor) : null,
        origin: row.origin.toLowerCase() as AuditLogEntry["origin"],
        metadata: (row.metadata as Record<string, unknown> | null) ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
      total,
      page,
    );
  }
}
