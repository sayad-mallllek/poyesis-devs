import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import {
  createMilestoneSchema,
  updateMilestoneSchema,
  type CreateMilestoneInput,
  type UpdateMilestoneInput,
} from "@repo/contracts";
import type { Actor } from "../authz/actor.js";
import { CurrentActor } from "../authz/decorators.js";
import { ark } from "../common/validation/ark.pipe.js";
import { MilestonesService } from "./milestones.service.js";

@Controller("projects/:projectId/milestones")
export class MilestonesController {
  constructor(private readonly milestones: MilestonesService) {}

  @Get()
  list(@CurrentActor() actor: Actor, @Param("projectId") projectId: string) {
    return this.milestones.list(actor, projectId);
  }

  @Post()
  create(
    @CurrentActor() actor: Actor,
    @Param("projectId") projectId: string,
    @Body(ark(createMilestoneSchema)) input: CreateMilestoneInput,
  ) {
    return this.milestones.create(actor, projectId, input);
  }

  @Patch(":milestoneId")
  update(
    @CurrentActor() actor: Actor,
    @Param("projectId") projectId: string,
    @Param("milestoneId") milestoneId: string,
    @Body(ark(updateMilestoneSchema)) input: UpdateMilestoneInput,
  ) {
    return this.milestones.update(actor, projectId, milestoneId, input);
  }

  @Delete(":milestoneId")
  @HttpCode(204)
  remove(
    @CurrentActor() actor: Actor,
    @Param("projectId") projectId: string,
    @Param("milestoneId") milestoneId: string,
  ) {
    return this.milestones.remove(actor, projectId, milestoneId);
  }
}
