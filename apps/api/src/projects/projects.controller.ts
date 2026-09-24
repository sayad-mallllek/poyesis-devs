import { Body, Controller, Delete, Get, Header, HttpCode, Param, Patch, Post, Query } from "@nestjs/common";
import {
  createProjectSchema,
  listProjectsQuerySchema,
  updateProjectSchema,
  type CreateProjectInput,
  type ListProjectsQuery,
  type UpdateProjectInput,
} from "@repo/contracts";
import type { Actor } from "../authz/actor.js";
import { CurrentActor, RequirePermission } from "../authz/decorators.js";
import { ark } from "../common/validation/ark.pipe.js";
import { ProjectAnalyticsService } from "./project-analytics.service.js";
import { ProjectContextService } from "./project-context.service.js";
import { ProjectsService } from "./projects.service.js";

@Controller("projects")
export class ProjectsController {
  constructor(
    private readonly projects: ProjectsService,
    private readonly analytics: ProjectAnalyticsService,
    private readonly context: ProjectContextService,
  ) {}

  @Get()
  @RequirePermission("read", "Project")
  list(@CurrentActor() actor: Actor, @Query(ark(listProjectsQuerySchema)) query: ListProjectsQuery) {
    return this.projects.list(actor, query);
  }

  @Post()
  @RequirePermission("create", "Project")
  create(@CurrentActor() actor: Actor, @Body(ark(createProjectSchema)) input: CreateProjectInput) {
    return this.projects.create(actor, input);
  }

  @Get(":id")
  get(@CurrentActor() actor: Actor, @Param("id") id: string) {
    return this.projects.get(actor, id);
  }

  @Patch(":id")
  update(
    @CurrentActor() actor: Actor,
    @Param("id") id: string,
    @Body(ark(updateProjectSchema)) input: UpdateProjectInput,
  ) {
    return this.projects.update(actor, id, input);
  }

  @Delete(":id")
  @HttpCode(204)
  archive(@CurrentActor() actor: Actor, @Param("id") id: string) {
    return this.projects.archive(actor, id);
  }

  @Get(":id/analytics")
  getAnalytics(@CurrentActor() actor: Actor, @Param("id") id: string) {
    return this.analytics.get(actor, id);
  }

  /** The digest the AI assistant receives; exposed to inspect what the model sees. */
  @Get(":id/context")
  @Header("Content-Type", "text/markdown; charset=utf-8")
  getContext(@CurrentActor() actor: Actor, @Param("id") id: string) {
    return this.context.build(actor, id);
  }
}
