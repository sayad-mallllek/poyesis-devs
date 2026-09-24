import { HttpException, HttpStatus, Injectable, UnprocessableEntityException } from "@nestjs/common";
import {
  INTEGRATION_PROVIDERS,
  type ConfigureGithubInput,
  type ConfigureSentryInput,
  type IntegrationProvider,
  type IntegrationStatus,
} from "@repo/contracts";
import { AuditService } from "../../audit/audit.service.js";
import type { Actor } from "../../authz/actor.js";
import { AuthzService } from "../../authz/authz.service.js";
import { notFound } from "../../common/http/errors.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { EncryptionService } from "../../security/encryption.service.js";
import { githubConfig, verifyGithubToken } from "../github/github-client.js";
import { sentryConfig, verifySentryToken } from "../sentry/sentry-api.js";
import { CredentialStore, PROVIDER_LABEL } from "./credential-store.js";
import { tokenHint, toIntegrationStatus } from "./integration-status.js";

const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Checks a token against the provider and returns a label for the audit summary. */
function verify(provider: IntegrationProvider, token: string, config: Record<string, string>): Promise<string> {
  return provider === "GITHUB"
    ? verifyGithubToken(token, githubConfig(config).apiBaseUrl).then((login) => `authenticated as ${login}`)
    : verifySentryToken(token, sentryConfig(config)).then((name) => `organization ${name}`);
}

/**
 * Rejected credentials are the caller's input error (422); unreachable or
 * rate-limited upstreams keep their own status.
 */
async function verifyInput(provider: IntegrationProvider, token: string, config: Record<string, string>) {
  try {
    return await verify(provider, token, config);
  } catch (error) {
    if (error instanceof HttpException && error.getStatus() < 500 && error.getStatus() !== HttpStatus.TOO_MANY_REQUESTS) {
      throw new UnprocessableEntityException(
        `Could not verify the ${PROVIDER_LABEL[provider]} credentials: ${error.message}`,
      );
    }
    throw error;
  }
}

/** Workspace-level integration credentials. Tokens are write-only. */
@Injectable()
export class IntegrationCredentialsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
    private readonly encryption: EncryptionService,
    private readonly store: CredentialStore,
  ) {}

  async list(actor: Actor): Promise<IntegrationStatus[]> {
    this.authz.assert(actor.principal, "read", "Integration");
    const rows = await this.prisma.integrationCredential.findMany();
    return INTEGRATION_PROVIDERS.map((provider) =>
      toIntegrationStatus(provider, rows.find((row) => row.provider === provider) ?? null),
    );
  }

  async configureGithub(actor: Actor, input: ConfigureGithubInput): Promise<IntegrationStatus> {
    this.authz.assert(actor.principal, "update", "Integration");
    const config = githubConfig(input.apiBaseUrl ? { apiBaseUrl: input.apiBaseUrl } : {});
    return this.save(actor, "GITHUB", input.token, { ...config });
  }

  async configureSentry(actor: Actor, input: ConfigureSentryInput): Promise<IntegrationStatus> {
    this.authz.assert(actor.principal, "update", "Integration");
    const config = sentryConfig({
      organizationSlug: input.organizationSlug,
      ...(input.baseUrl && { baseUrl: input.baseUrl }),
    });
    return this.save(actor, "SENTRY", input.token, { ...config });
  }

  /** Re-verifies the stored token and records the outcome instead of failing. */
  async test(actor: Actor, provider: IntegrationProvider): Promise<IntegrationStatus> {
    this.authz.assert(actor.principal, "update", "Integration");
    const credential = await this.store.require(provider);
    const lastError = await verify(provider, credential.token, credential.config).then(
      () => null,
      (error: unknown) => errorMessage(error),
    );
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.integrationCredential.update({
        where: { provider },
        data: { lastError, ...(lastError === null && { lastVerifiedAt: new Date() }) },
      });
      await this.audit.record(
        actor,
        {
          action: "integration.tested",
          entityType: "Integration",
          entityId: provider,
          summary: `Tested ${PROVIDER_LABEL[provider]} integration: ${lastError ?? "ok"}`,
        },
        tx,
      );
      return updated;
    });
    return toIntegrationStatus(provider, row);
  }

  async remove(actor: Actor, provider: IntegrationProvider): Promise<void> {
    this.authz.assert(actor.principal, "delete", "Integration");
    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.integrationCredential.deleteMany({ where: { provider } });
      if (!count) throw notFound(`${PROVIDER_LABEL[provider]} integration`);
      await this.audit.record(
        actor,
        {
          action: "integration.removed",
          entityType: "Integration",
          entityId: provider,
          summary: `Removed ${PROVIDER_LABEL[provider]} integration`,
        },
        tx,
      );
    });
  }

  private async save(
    actor: Actor,
    provider: IntegrationProvider,
    token: string,
    config: Record<string, string>,
  ): Promise<IntegrationStatus> {
    const identity = await verifyInput(provider, token, config);
    const data = {
      encryptedToken: this.encryption.encrypt(token),
      tokenHint: tokenHint(token),
      config,
      lastVerifiedAt: new Date(),
      lastError: null,
    };
    const row = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.integrationCredential.upsert({
        where: { provider },
        create: { provider, ...data },
        update: data,
      });
      await this.audit.record(
        actor,
        {
          action: "integration.configured",
          entityType: "Integration",
          entityId: provider,
          summary: `Configured ${PROVIDER_LABEL[provider]} integration (${identity})`,
          metadata: { config },
        },
        tx,
      );
      return saved;
    });
    return toIntegrationStatus(provider, row);
  }
}
