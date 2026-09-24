import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { createRiskSchema, updateRiskSchema, type CreateRiskInput, type UpdateRiskInput } from "@repo/contracts";
import type { Actor } from "../authz/actor.js";
import { CurrentActor } from "../authz/decorators.js";
import { ark } from "../common/validation/ark.pipe.js";
import { RisksService } from "./risks.service.js";

@Controller("projects/:projectId/risks")
export class RisksController {
  constructor(private readonly risks: RisksService) {}

  @Get()
  list(@CurrentActor() actor: Actor, @Param("projectId") projectId: string) {
    return this.risks.list(actor, projectId);
  }

  @Post()
  create(
    @CurrentActor() actor: Actor,
    @Param("projectId") projectId: string,
    @Body(ark(createRiskSchema)) input: CreateRiskInput,
  ) {
    return this.risks.create(actor, projectId, input);
  }

  @Patch(":riskId")
  update(
    @CurrentActor() actor: Actor,
    @Param("projectId") projectId: string,
    @Param("riskId") riskId: string,
    @Body(ark(updateRiskSchema)) input: UpdateRiskInput,
  ) {
    return this.risks.update(actor, projectId, riskId, input);
  }

  @Delete(":riskId")
  @HttpCode(204)
  remove(@CurrentActor() actor: Actor, @Param("projectId") projectId: string, @Param("riskId") riskId: string) {
    return this.risks.remove(actor, projectId, riskId);
  }
}
