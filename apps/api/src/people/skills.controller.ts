import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import { createSkillSchema, type CreateSkillInput } from "@repo/contracts";
import type { Actor } from "../authz/actor.js";
import { CurrentActor, RequirePermission } from "../authz/decorators.js";
import { ark } from "../common/validation/ark.pipe.js";
import { listSkillsQuerySchema, SkillsService, type ListSkillsQuery } from "./skills.service.js";

@Controller("skills")
export class SkillsController {
  constructor(private readonly skills: SkillsService) {}

  @Get()
  @RequirePermission("read", "Skill")
  list(@CurrentActor() actor: Actor, @Query(ark(listSkillsQuerySchema)) query: ListSkillsQuery) {
    return this.skills.list(actor, query);
  }

  @Post()
  @RequirePermission("create", "Skill")
  create(@CurrentActor() actor: Actor, @Body(ark(createSkillSchema)) input: CreateSkillInput) {
    return this.skills.create(actor, input);
  }

  @Delete(":id")
  @RequirePermission("delete", "Skill")
  @HttpCode(204)
  remove(@CurrentActor() actor: Actor, @Param("id") id: string) {
    return this.skills.remove(actor, id);
  }
}
