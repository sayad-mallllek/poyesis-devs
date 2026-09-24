import { Body, Controller, Delete, Get, HttpCode, Param, Post, Put } from "@nestjs/common";
import {
  configureGithubSchema,
  configureSentrySchema,
  type ConfigureGithubInput,
  type ConfigureSentryInput,
  type IntegrationProvider,
} from "@repo/contracts";
import type { Actor } from "../../authz/actor.js";
import { CurrentActor, RequirePermission } from "../../authz/decorators.js";
import { ark } from "../../common/validation/ark.pipe.js";
import { IntegrationCredentialsService } from "./integration-credentials.service.js";
import { ProviderPipe } from "./provider.pipe.js";

@Controller("integrations")
export class IntegrationsController {
  constructor(private readonly credentials: IntegrationCredentialsService) {}

  @Get()
  @RequirePermission("read", "Integration")
  list(@CurrentActor() actor: Actor) {
    return this.credentials.list(actor);
  }

  @Put("github")
  @RequirePermission("update", "Integration")
  configureGithub(@CurrentActor() actor: Actor, @Body(ark(configureGithubSchema)) input: ConfigureGithubInput) {
    return this.credentials.configureGithub(actor, input);
  }

  @Put("sentry")
  @RequirePermission("update", "Integration")
  configureSentry(@CurrentActor() actor: Actor, @Body(ark(configureSentrySchema)) input: ConfigureSentryInput) {
    return this.credentials.configureSentry(actor, input);
  }

  @Post(":provider/test")
  @HttpCode(200)
  @RequirePermission("update", "Integration")
  test(@CurrentActor() actor: Actor, @Param("provider", ProviderPipe) provider: IntegrationProvider) {
    return this.credentials.test(actor, provider);
  }

  @Delete(":provider")
  @HttpCode(204)
  @RequirePermission("delete", "Integration")
  remove(@CurrentActor() actor: Actor, @Param("provider", ProviderPipe) provider: IntegrationProvider) {
    return this.credentials.remove(actor, provider);
  }
}
