import { Injectable } from "@nestjs/common";
import type { LinkSentryProjectInput, SentryLink } from "@repo/contracts";
import { AuditService } from "../../audit/audit.service.js";
import type { Actor } from "../../authz/actor.js";
import { AuthzService } from "../../authz/authz.service.js";
import { conflict, isUniqueViolation, notFound } from "../../common/http/errors.js";
import { userRefSelect } from "../../common/serialization/index.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { requireActiveProject } from "../../projects/project-lookup.js";
import { sentryPath, SentryClientProvider } from "./sentry-api.js";
import { toSentryLink, type SentryProjectPayload } from "./sentry-mappers.js";

const linkInclude = { createdBy: { select: userRefSelect } } as const satisfies Prisma.SentryLinkInclude;

@Injectable()
export class SentryLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
    private readonly sentry: SentryClientProvider,
  ) {}

  /** Reads stored links only, so it works even while Sentry is not configured. */
  async list(actor: Actor, projectId: string): Promise<SentryLink[]> {
    this.authz.assert(actor.principal, "read", "SentryLink", { projectId });
    await requireActiveProject(this.prisma, projectId);
    const rows = await this.prisma.sentryLink.findMany({
      where: { projectId },
      include: linkInclude,
      orderBy: [{ organizationSlug: "asc" }, { projectSlug: "asc" }],
    });
    return rows.map(toSentryLink);
  }

  /** Verifies the Sentry project exists and stores its display name and platform. */
  async link(actor: Actor, projectId: string, input: LinkSentryProjectInput): Promise<SentryLink> {
    this.authz.assert(actor.principal, "create", "SentryLink", { projectId });
    await requireActiveProject(this.prisma, projectId);

    const { api, config } = await this.sentry.connect();
    const organizationSlug = input.organizationSlug ?? config.organizationSlug;
    const { data: project } = await api.get<SentryProjectPayload>(
      sentryPath`/projects/${organizationSlug}/${input.projectSlug}/`,
      { notFound: `Sentry project ${organizationSlug}/${input.projectSlug} was not found or the token cannot access it` },
    );
    const label = `${organizationSlug}/${project.slug}`;

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.sentryLink.create({
          data: {
            projectId,
            organizationSlug,
            projectSlug: project.slug,
            environment: input.environment?.trim() || null,
            name: project.name,
            platform: project.platform ?? null,
            createdById: actor.principal.id,
          },
          include: linkInclude,
        });
        await this.audit.record(
          actor,
          {
            action: "sentry_project.linked",
            entityType: "SentryLink",
            entityId: created.id,
            summary: `Linked Sentry project ${label}`,
            metadata: { projectId, sentryProject: label, environment: created.environment },
          },
          tx,
        );
        return created;
      });
      return toSentryLink(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw conflict(`Sentry project ${label} is already linked to this project`);
      throw error;
    }
  }

  async unlink(actor: Actor, projectId: string, linkId: string): Promise<void> {
    this.authz.assert(actor.principal, "delete", "SentryLink", { projectId });
    const link = await this.prisma.sentryLink.findFirst({ where: { id: linkId, projectId } });
    if (!link) throw notFound("Sentry link", linkId);
    const label = `${link.organizationSlug}/${link.projectSlug}`;
    await this.prisma.$transaction(async (tx) => {
      await tx.sentryLink.delete({ where: { id: linkId } });
      await this.audit.record(
        actor,
        {
          action: "sentry_project.unlinked",
          entityType: "SentryLink",
          entityId: linkId,
          summary: `Unlinked Sentry project ${label}`,
          metadata: { projectId, sentryProject: label },
        },
        tx,
      );
    });
  }
}
