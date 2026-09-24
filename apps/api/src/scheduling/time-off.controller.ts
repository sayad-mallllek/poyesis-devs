import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import {
  createTimeOffSchema,
  updateTimeOffSchema,
  type CreateTimeOffInput,
  type UpdateTimeOffInput,
} from "@repo/contracts";
import type { Actor } from "../authz/actor.js";
import { CurrentActor, RequirePermission } from "../authz/decorators.js";
import { ark } from "../common/validation/ark.pipe.js";
import { listTimeOffQuerySchema, type ListTimeOffQuery } from "./scheduling.queries.js";
import { TimeOffService } from "./time-off.service.js";

@Controller("time-off")
export class TimeOffController {
  constructor(private readonly timeOff: TimeOffService) {}

  @Get()
  @RequirePermission("read", "TimeOff")
  list(@CurrentActor() actor: Actor, @Query(ark(listTimeOffQuerySchema)) query: ListTimeOffQuery) {
    return this.timeOff.list(actor, query);
  }

  @Post()
  @RequirePermission("create", "TimeOff")
  create(@CurrentActor() actor: Actor, @Body(ark(createTimeOffSchema)) input: CreateTimeOffInput) {
    return this.timeOff.create(actor, input);
  }

  @Patch(":id")
  update(
    @CurrentActor() actor: Actor,
    @Param("id") id: string,
    @Body(ark(updateTimeOffSchema)) input: UpdateTimeOffInput,
  ) {
    return this.timeOff.update(actor, id, input);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentActor() actor: Actor, @Param("id") id: string) {
    return this.timeOff.remove(actor, id);
  }
}
