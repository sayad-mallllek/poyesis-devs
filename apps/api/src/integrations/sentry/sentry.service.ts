import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import type { SentryAvailableProject, SentryIssue, SentryIssuesQuery } from "@repo/contracts";
import type { Actor } from "../../authz/actor.js";
import { AuthzService } from "../../authz/authz.service.js";
import { notFound } from "../../common/http/errors.js";
import { collectAcross } from "../common/concurrency.js";
import { cacheKey, TtlCache } from "../common/ttl-cache.js";
import { sentryPath, SentryClientProvider } from "./sentry-api.js";
import {
  toAvailableProject,
  toSentryIssue,
  type SentryIssuePayload,
  type SentryProjectPayload,
} from "./sentry-mappers.js";
import { SentryLinksService } from "./sentry-links.service.js";

const CACHE_TTL_MS = 60_000;
const LINK_CONCURRENCY = 4;
const DEFAULT_LIMIT = 25;
const MAX_AVAILABLE_PROJECTS = 500;

@Injectable()
export class SentryService {
  private readonly logger = new Logger(SentryService.name);
  private readonly cache = new TtlCache({ ttlMs: CACHE_TTL_MS, max: 500 });

  constructor(
    private readonly authz: AuthzService,
    private readonly links: SentryLinksService,
    private readonly sentry: SentryClientProvider,
  ) {}

  /** Issues across the project's Sentry links (or one), most recently seen first. */
  async issues(actor: Actor, projectId: string, query: SentryIssuesQuery = {}): Promise<SentryIssue[]> {
    const links = await this.links.list(actor, projectId);
    const { api, version } = await this.sentry.connect();
    const targets = query.sentryLinkId ? links.filter((l) => l.id === query.sentryLinkId) : links;
    if (query.sentryLinkId && !targets.length) throw notFound("Sentry link", query.sentryLinkId);

    // Sentry only computes issue stats in `24h` or `14d` buckets.
    const statsPeriod = query.statsPeriod ?? "14d";
    const limit = query.limit ?? DEFAULT_LIMIT;
    const items = await collectAcross(
      targets,
      (link) => {
        const params = {
          statsPeriod,
          query: query.query ?? "is:unresolved",
          sort: query.sort ?? "date",
          limit,
          environment: link.environment ?? undefined,
        };
        const key = cacheKey(version, "issues", link.organizationSlug, link.projectSlug, params);
        return this.cache.getOrLoad(key, async () => {
          const { data } = await api.get<SentryIssuePayload[]>(
            sentryPath`/projects/${link.organizationSlug}/${link.projectSlug}/issues/`,
            {
              query: params,
              notFound: `Sentry project ${link.organizationSlug}/${link.projectSlug} was not found`,
            },
          );
          return data.map((issue) => toSentryIssue(link, issue, statsPeriod));
        });
      },
      {
        limit: LINK_CONCURRENCY,
        logger: this.logger,
        describe: (link) => `Sentry project ${link.organizationSlug}/${link.projectSlug}`,
      },
    );
    return items.sort((a, b) => b.lastSeen.localeCompare(a.lastSeen)).slice(0, limit);
  }

  /** Projects of the configured organization, for the link picker. */
  async availableProjects(actor: Actor): Promise<SentryAvailableProject[]> {
    if (!this.canLinkSomewhere(actor)) {
      throw new ForbiddenException("You are not allowed to link Sentry projects");
    }
    const { api, config, version } = await this.sentry.connect();
    return this.cache.getOrLoad(cacheKey(version, "projects", config.organizationSlug), async () => {
      const projects: SentryAvailableProject[] = [];
      let cursor: string | undefined;
      do {
        const page = await api.get<SentryProjectPayload[]>(
          sentryPath`/organizations/${config.organizationSlug}/projects/`,
          { query: { cursor } },
        );
        projects.push(...page.data.map(toAvailableProject));
        cursor = page.nextCursor ?? undefined;
      } while (cursor && projects.length < MAX_AVAILABLE_PROJECTS);
      return projects.slice(0, MAX_AVAILABLE_PROJECTS).sort((a, b) => a.name.localeCompare(b.name));
    });
  }

  /**
   * "May link a Sentry project to at least one project": either unconditionally
   * (admins) or on one of the projects the principal belongs to.
   */
  private canLinkSomewhere({ principal }: Actor): boolean {
    return [{}, ...principal.memberProjectIds.map((projectId) => ({ projectId }))].some((resource) =>
      this.authz.can(principal, "create", "SentryLink", resource),
    );
  }
}
