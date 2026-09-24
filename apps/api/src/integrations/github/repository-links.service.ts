import { Injectable } from "@nestjs/common";
import type { LinkRepositoryInput, RepositoryLink } from "@repo/contracts";
import { AuditService } from "../../audit/audit.service.js";
import type { Actor } from "../../authz/actor.js";
import { AuthzService } from "../../authz/authz.service.js";
import { conflict, isUniqueViolation, notFound } from "../../common/http/errors.js";
import { ValidationException } from "../../common/validation/ark.pipe.js";
import { PrismaService } from "../../prisma/prisma.service.js";
import { requireActiveProject } from "../../projects/project-lookup.js";
import { CredentialStore } from "../credentials/credential-store.js";
import { githubCall, githubConfig, GithubClientProvider } from "./github-client.js";
import { githubWebUrl, toRepositoryLink } from "./github-mappers.js";
import { parseRepositoryReference } from "./repository-reference.js";

const linkSelect = {
  id: true,
  projectId: true,
  owner: true,
  name: true,
  defaultBranch: true,
  isPrivate: true,
  createdAt: true,
} as const;

@Injectable()
export class RepositoryLinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
    private readonly store: CredentialStore,
    private readonly github: GithubClientProvider,
  ) {}

  /** Reads stored links only, so it works even while GitHub is not configured. */
  async list(actor: Actor, projectId: string): Promise<RepositoryLink[]> {
    this.authz.assert(actor.principal, "read", "RepositoryLink", { projectId });
    await requireActiveProject(this.prisma, projectId);
    const [rows, config] = await Promise.all([
      this.prisma.repositoryLink.findMany({
        where: { projectId },
        select: linkSelect,
        orderBy: [{ owner: "asc" }, { name: "asc" }],
      }),
      this.store.config("GITHUB"),
    ]);
    const webUrl = githubWebUrl(githubConfig(config ?? {}).apiBaseUrl);
    return rows.map((row) => toRepositoryLink(row, webUrl));
  }

  /** Verifies the repository through the API and stores its canonical owner/name. */
  async link(actor: Actor, projectId: string, input: LinkRepositoryInput): Promise<RepositoryLink> {
    this.authz.assert(actor.principal, "create", "RepositoryLink", { projectId });
    const reference = parseRepositoryReference(input.repository);
    if (!reference) {
      throw new ValidationException({ repository: ["Expected owner/name or a GitHub repository URL"] });
    }
    await requireActiveProject(this.prisma, projectId);

    const { octokit, config } = await this.github.connect();
    const { data: repo } = await githubCall(
      () => octokit.rest.repos.get({ owner: reference.owner, repo: reference.name }),
      `Repository ${reference.owner}/${reference.name} was not found or the GitHub token cannot access it`,
    );
    const fullName = `${repo.owner.login}/${repo.name}`;

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.repositoryLink.create({
          data: {
            projectId,
            owner: repo.owner.login,
            name: repo.name,
            defaultBranch: repo.default_branch,
            isPrivate: repo.private,
            createdById: actor.principal.id,
          },
          select: linkSelect,
        });
        await this.audit.record(
          actor,
          {
            action: "repository.linked",
            entityType: "RepositoryLink",
            entityId: created.id,
            summary: `Linked GitHub repository ${fullName}`,
            metadata: { projectId, repository: fullName },
          },
          tx,
        );
        return created;
      });
      return toRepositoryLink(row, githubWebUrl(config.apiBaseUrl));
    } catch (error) {
      if (isUniqueViolation(error)) throw conflict(`Repository ${fullName} is already linked to this project`);
      throw error;
    }
  }

  async unlink(actor: Actor, projectId: string, linkId: string): Promise<void> {
    this.authz.assert(actor.principal, "delete", "RepositoryLink", { projectId });
    const link = await this.prisma.repositoryLink.findFirst({ where: { id: linkId, projectId } });
    if (!link) throw notFound("Repository link", linkId);
    await this.prisma.$transaction(async (tx) => {
      await tx.repositoryLink.delete({ where: { id: linkId } });
      await this.audit.record(
        actor,
        {
          action: "repository.unlinked",
          entityType: "RepositoryLink",
          entityId: linkId,
          summary: `Unlinked GitHub repository ${link.owner}/${link.name}`,
          metadata: { projectId, repository: `${link.owner}/${link.name}` },
        },
        tx,
      );
    });
  }
}
