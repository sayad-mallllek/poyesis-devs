import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import {
  createAllocationSchema,
  updateAllocationSchema,
  type CreateAllocationInput,
  type UpdateAllocationInput,
} from "@repo/contracts";
import type { Actor } from "../authz/actor.js";
import { CurrentActor, RequirePermission } from "../authz/decorators.js";
import { ark } from "../common/validation/ark.pipe.js";
import { AllocationsService } from "./allocations.service.js";
import { listAllocationsQuerySchema, type ListAllocationsQuery } from "./scheduling.queries.js";

@Controller("allocations")
export class AllocationsController {
  constructor(private readonly allocations: AllocationsService) {}

  @Get()
  @RequirePermission("read", "Allocation")
  list(@CurrentActor() actor: Actor, @Query(ark(listAllocationsQuerySchema)) query: ListAllocationsQuery) {
    return this.allocations.list(actor, query);
  }

  @Post()
  @RequirePermission("create", "Allocation")
  create(@CurrentActor() actor: Actor, @Body(ark(createAllocationSchema)) input: CreateAllocationInput) {
    return this.allocations.create(actor, input);
  }

  @Patch(":id")
  update(
    @CurrentActor() actor: Actor,
    @Param("id") id: string,
    @Body(ark(updateAllocationSchema)) input: UpdateAllocationInput,
  ) {
    return this.allocations.update(actor, id, input);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentActor() actor: Actor, @Param("id") id: string) {
    return this.allocations.remove(actor, id);
  }
}
