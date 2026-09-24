import { Module } from "@nestjs/common";
import { CredentialStore } from "./credentials/credential-store.js";
import { IntegrationCredentialsService } from "./credentials/integration-credentials.service.js";
import { IntegrationsController } from "./credentials/integrations.controller.js";
import { GithubClientProvider } from "./github/github-client.js";
import { GithubController } from "./github/github.controller.js";
import { GithubService } from "./github/github.service.js";
import { RepositoryLinksService } from "./github/repository-links.service.js";
import { SentryClientProvider } from "./sentry/sentry-api.js";
import { SentryLinksService } from "./sentry/sentry-links.service.js";
import { SentryController } from "./sentry/sentry.controller.js";
import { SentryService } from "./sentry/sentry.service.js";

@Module({
  controllers: [IntegrationsController, GithubController, SentryController],
  providers: [
    CredentialStore,
    IntegrationCredentialsService,
    GithubClientProvider,
    RepositoryLinksService,
    GithubService,
    SentryClientProvider,
    SentryLinksService,
    SentryService,
  ],
  exports: [GithubService, SentryService, RepositoryLinksService, SentryLinksService],
})
export class IntegrationsModule {}
