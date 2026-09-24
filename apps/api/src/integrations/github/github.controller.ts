import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import {
  githubListQuerySchema,
  linkRepositorySchema,
  type GithubListQuery,
  type LinkRepositoryInput,
} from "@repo/contracts";
import type { Actor } from "../../authz/actor.js";
import { CurrentActor, RequirePermission } from "../../authz/decorators.js";
import { ark } from "../../common/validation/ark.pipe.js";
import { GithubService } from "./github.service.js";
import { RepositoryLinksService } from "./repository-links.service.js";

@Controller("projects/:projectId")
export class GithubController {
  constructor(
    private readonly links: RepositoryLinksService,
    private readonly github: GithubService,
  ) {}

  @Get("repositories")
  @RequirePermission("read", "RepositoryLink")
  list(@CurrentActor() actor: Actor, @Param("projectId") projectId: string) {
    return this.links.list(actor, projectId);
  }

  @Post("repositories")
  @RequirePermission("create", "RepositoryLink")
  link(
    @CurrentActor() actor: Actor,
    @Param("projectId") projectId: string,
    @Body(ark(linkRepositorySchema)) input: LinkRepositoryInput,
  ) {
    return this.links.link(actor, projectId, input);
  }

  @Delete("repositories/:linkId")
  @HttpCode(204)
  @RequirePermission("delete", "RepositoryLink")
  unlink(@CurrentActor() actor: Actor, @Param("projectId") projectId: string, @Param("linkId") linkId: string) {
    return this.links.unlink(actor, projectId, linkId);
  }

  @Get("github/overview")
  @RequirePermission("read", "RepositoryLink")
  overview(@CurrentActor() actor: Actor, @Param("projectId") projectId: string) {
    return this.github.overview(actor, projectId);
  }

  @Get("github/pull-requests")
  @RequirePermission("read", "RepositoryLink")
  pullRequests(
    @CurrentActor() actor: Actor,
    @Param("projectId") projectId: string,
    @Query(ark(githubListQuerySchema)) query: GithubListQuery,
  ) {
    return this.github.pullRequests(actor, projectId, query);
  }

  @Get("github/workflow-runs")
  @RequirePermission("read", "RepositoryLink")
  workflowRuns(
    @CurrentActor() actor: Actor,
    @Param("projectId") projectId: string,
    @Query(ark(githubListQuerySchema)) query: GithubListQuery,
  ) {
    return this.github.workflowRuns(actor, projectId, query);
  }

  @Get("github/deployments")
  @RequirePermission("read", "RepositoryLink")
  deployments(
    @CurrentActor() actor: Actor,
    @Param("projectId") projectId: string,
    @Query(ark(githubListQuerySchema)) query: GithubListQuery,
  ) {
    return this.github.deployments(actor, projectId, query);
  }

  @Get("github/releases")
  @RequirePermission("read", "RepositoryLink")
  releases(
    @CurrentActor() actor: Actor,
    @Param("projectId") projectId: string,
    @Query(ark(githubListQuerySchema)) query: GithubListQuery,
  ) {
    return this.github.releases(actor, projectId, query);
  }
}
