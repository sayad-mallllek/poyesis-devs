import { Body, Controller, Delete, Get, HttpCode, Param, Post, Query } from "@nestjs/common";
import {
  linkSentryProjectSchema,
  sentryIssuesQuerySchema,
  type LinkSentryProjectInput,
  type SentryIssuesQuery,
} from "@repo/contracts";
import type { Actor } from "../../authz/actor.js";
import { CurrentActor, RequirePermission } from "../../authz/decorators.js";
import { ark } from "../../common/validation/ark.pipe.js";
import { SentryLinksService } from "./sentry-links.service.js";
import { SentryService } from "./sentry.service.js";

@Controller()
export class SentryController {
  constructor(
    private readonly links: SentryLinksService,
    private readonly sentry: SentryService,
  ) {}

  @Get("integrations/sentry/projects")
  @RequirePermission("create", "SentryLink")
  availableProjects(@CurrentActor() actor: Actor) {
    return this.sentry.availableProjects(actor);
  }

  @Get("projects/:projectId/sentry-projects")
  @RequirePermission("read", "SentryLink")
  list(@CurrentActor() actor: Actor, @Param("projectId") projectId: string) {
    return this.links.list(actor, projectId);
  }

  @Post("projects/:projectId/sentry-projects")
  @RequirePermission("create", "SentryLink")
  link(
    @CurrentActor() actor: Actor,
    @Param("projectId") projectId: string,
    @Body(ark(linkSentryProjectSchema)) input: LinkSentryProjectInput,
  ) {
    return this.links.link(actor, projectId, input);
  }

  @Delete("projects/:projectId/sentry-projects/:linkId")
  @HttpCode(204)
  @RequirePermission("delete", "SentryLink")
  unlink(@CurrentActor() actor: Actor, @Param("projectId") projectId: string, @Param("linkId") linkId: string) {
    return this.links.unlink(actor, projectId, linkId);
  }

  @Get("projects/:projectId/sentry/issues")
  @RequirePermission("read", "SentryLink")
  issues(
    @CurrentActor() actor: Actor,
    @Param("projectId") projectId: string,
    @Query(ark(sentryIssuesQuerySchema)) query: SentryIssuesQuery,
  ) {
    return this.sentry.issues(actor, projectId, query);
  }
}
