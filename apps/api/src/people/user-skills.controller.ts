import { Body, Controller, Delete, Get, HttpCode, Param, Put } from "@nestjs/common";
import {
  rateUserSkillSchema,
  upsertUserSkillSchema,
  type RateUserSkillInput,
  type UpsertUserSkillInput,
} from "@repo/contracts";
import type { Actor } from "../authz/actor.js";
import { CurrentActor, RequirePermission } from "../authz/decorators.js";
import { ark } from "../common/validation/ark.pipe.js";
import { UserSkillsService } from "./user-skills.service.js";

/** Nested under `/users` but owned by the people module; no overlap with `/users/:id`. */
@Controller("users/:userId/skills")
export class UserSkillsController {
  constructor(private readonly userSkills: UserSkillsService) {}

  @Get()
  @RequirePermission("read", "UserSkill")
  list(@CurrentActor() actor: Actor, @Param("userId") userId: string) {
    return this.userSkills.list(actor, userId);
  }

  @Put(":skillId")
  upsert(
    @CurrentActor() actor: Actor,
    @Param("userId") userId: string,
    @Param("skillId") skillId: string,
    @Body(ark(upsertUserSkillSchema)) input: UpsertUserSkillInput,
  ) {
    return this.userSkills.upsert(actor, userId, skillId, input);
  }

  @Put(":skillId/rating")
  rate(
    @CurrentActor() actor: Actor,
    @Param("userId") userId: string,
    @Param("skillId") skillId: string,
    @Body(ark(rateUserSkillSchema)) input: RateUserSkillInput,
  ) {
    return this.userSkills.rate(actor, userId, skillId, input);
  }

  @Delete(":skillId")
  @HttpCode(204)
  remove(@CurrentActor() actor: Actor, @Param("userId") userId: string, @Param("skillId") skillId: string) {
    return this.userSkills.remove(actor, userId, skillId);
  }
}
