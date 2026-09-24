import { Controller, Get, Query } from "@nestjs/common";
import { listAuditLogsQuerySchema, type ListAuditLogsQuery } from "@repo/contracts";
import type { Actor } from "../authz/actor.js";
import { CurrentActor, RequirePermission } from "../authz/decorators.js";
import { ark } from "../common/validation/ark.pipe.js";
import { AuditService } from "./audit.service.js";

@Controller("audit-logs")
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermission("read", "AuditLog")
  list(@CurrentActor() actor: Actor, @Query(ark(listAuditLogsQuerySchema)) query: ListAuditLogsQuery) {
    return this.audit.list(actor, query);
  }
}
