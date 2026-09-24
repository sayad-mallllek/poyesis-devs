import { Controller, Get, Query } from "@nestjs/common";
import { scheduleQuerySchema, type ScheduleQuery } from "@repo/contracts";
import type { Actor } from "../authz/actor.js";
import { CurrentActor, RequirePermission } from "../authz/decorators.js";
import { ark } from "../common/validation/ark.pipe.js";
import { SchedulingService } from "./scheduling.service.js";

@Controller("schedule")
export class ScheduleController {
  constructor(private readonly scheduling: SchedulingService) {}

  @Get()
  @RequirePermission("read", "Allocation")
  get(@CurrentActor() actor: Actor, @Query(ark(scheduleQuerySchema)) query: ScheduleQuery) {
    return this.scheduling.schedule(actor, query);
  }
}
