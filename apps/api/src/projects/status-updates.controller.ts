import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { createStatusUpdateSchema, type CreateStatusUpdateInput } from "@repo/contracts";
import type { Actor } from "../authz/actor.js";
import { CurrentActor } from "../authz/decorators.js";
import { ark } from "../common/validation/ark.pipe.js";
import { StatusUpdatesService } from "./status-updates.service.js";

@Controller("projects/:projectId/status-updates")
export class StatusUpdatesController {
  constructor(private readonly statusUpdates: StatusUpdatesService) {}

  @Get()
  list(@CurrentActor() actor: Actor, @Param("projectId") projectId: string) {
    return this.statusUpdates.list(actor, projectId);
  }

  @Post()
  create(
    @CurrentActor() actor: Actor,
    @Param("projectId") projectId: string,
    @Body(ark(createStatusUpdateSchema)) input: CreateStatusUpdateInput,
  ) {
    return this.statusUpdates.create(actor, projectId, input);
  }
}
