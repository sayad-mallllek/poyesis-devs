import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import {
  projectMemberInputSchema,
  updateProjectMemberSchema,
  type ProjectMemberInput,
  type UpdateProjectMemberInput,
} from "@repo/contracts";
import type { Actor } from "../authz/actor.js";
import { CurrentActor } from "../authz/decorators.js";
import { ark } from "../common/validation/ark.pipe.js";
import { ProjectMembersService } from "./project-members.service.js";

@Controller("projects/:projectId/members")
export class ProjectMembersController {
  constructor(private readonly members: ProjectMembersService) {}

  @Get()
  list(@CurrentActor() actor: Actor, @Param("projectId") projectId: string) {
    return this.members.list(actor, projectId);
  }

  @Post()
  add(
    @CurrentActor() actor: Actor,
    @Param("projectId") projectId: string,
    @Body(ark(projectMemberInputSchema)) input: ProjectMemberInput,
  ) {
    return this.members.add(actor, projectId, input);
  }

  @Patch(":userId")
  update(
    @CurrentActor() actor: Actor,
    @Param("projectId") projectId: string,
    @Param("userId") userId: string,
    @Body(ark(updateProjectMemberSchema)) input: UpdateProjectMemberInput,
  ) {
    return this.members.update(actor, projectId, userId, input);
  }

  @Delete(":userId")
  @HttpCode(204)
  remove(@CurrentActor() actor: Actor, @Param("projectId") projectId: string, @Param("userId") userId: string) {
    return this.members.remove(actor, projectId, userId);
  }
}
