import { Injectable, Logger } from "@nestjs/common";
import type {
  GithubDeployment,
  GithubListQuery,
  GithubOverview,
  GithubPullRequest,
  GithubRelease,
  GithubWorkflowRun,
  RepositoryLink,
} from "@repo/contracts";
import type { Actor } from "../../authz/actor.js";
import { notFound } from "../../common/http/errors.js";
import { collectAcross, mapWithConcurrency } from "../common/concurrency.js";
import { cacheKey, TtlCache } from "../common/ttl-cache.js";
import { githubCall, GithubClientProvider, type GithubConnection } from "./github-client.js";
import {
  newestFirst,
  toGithubDeployment,
  toGithubPullRequest,
  toGithubRelease,
  toGithubWorkflowRun,
  toRepositoryOverview,
} from "./github-mappers.js";
import { RepositoryLinksService } from "./repository-links.service.js";

const CACHE_TTL_MS = 60_000;
const REPOSITORY_CONCURRENCY = 4;
const DEPLOYMENT_STATUS_CONCURRENCY = 5;
const DEFAULT_LIMIT = 30;
/** GitHub's page-size maximum; the overview counts open PRs up to this many per repository. */
const MAX_PAGE = 100;
const DAY_MS = 86_400_000;

const sinceDaysAgo = (days: number) => new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);
const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

interface Scope {
  connection: GithubConnection;
  repositories: RepositoryLink[];
}

/**
 * Read-only GitHub activity for the repositories linked to a project.
 * Responses are cached briefly per (credential version, endpoint, repository, params).
 */
@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly cache = new TtlCache({ ttlMs: CACHE_TTL_MS, max: 2_000 });

  constructor(
    private readonly links: RepositoryLinksService,
    private readonly github: GithubClientProvider,
  ) {}

  async overview(actor: Actor, projectId: string): Promise<GithubOverview> {
    const { connection, repositories } = await this.scope(actor, projectId);
    const since7 = sinceDaysAgo(7);
    const since30 = sinceDaysAgo(30);
    const perRepository = await mapWithConcurrency(repositories, REPOSITORY_CONCURRENCY, async (link) => {
      const [metadata, openPulls, failedRuns, successfulRuns, deployments] = await Promise.allSettled([
        this.repository(connection, link),
        this.fetchPullRequests(connection, link, "open", MAX_PAGE),
        this.countRuns(connection, link, "failure", since7),
        this.countRuns(connection, link, "success", since7),
        this.countDeployments(connection, link, since30),
      ]);
      const failures = [metadata, openPulls, failedRuns, successfulRuns, deployments].flatMap((r) =>
        r.status === "rejected" ? [r.reason as unknown] : [],
      );
      for (const reason of failures) {
        this.logger.warn({ err: reason }, `GitHub overview incomplete for ${link.fullName}`);
      }
      const value = <T>(result: PromiseSettledResult<T>, fallback: T) =>
        result.status === "fulfilled" ? result.value : fallback;
      return {
        repository: toRepositoryOverview(
          link,
          value(metadata, null),
          failures.length ? errorMessage(failures[0]) : null,
        ),
        openPullRequests: value(openPulls, []).length,
        failedRuns: value(failedRuns, 0),
        successfulRuns: value(successfulRuns, 0),
        deployments: value(deployments, 0),
      };
    });
    const sum = (pick: (r: (typeof perRepository)[number]) => number) =>
      perRepository.reduce((total, r) => total + pick(r), 0);
    return {
      repositories: perRepository.map((r) => r.repository),
      openPullRequests: sum((r) => r.openPullRequests),
      failedRunsLast7Days: sum((r) => r.failedRuns),
      successfulRunsLast7Days: sum((r) => r.successfulRuns),
      deploymentsLast30Days: sum((r) => r.deployments),
    };
  }

  async pullRequests(actor: Actor, projectId: string, query: GithubListQuery = {}): Promise<GithubPullRequest[]> {
    const { connection, repositories } = await this.scope(actor, projectId, query.repositoryId);
    const limit = query.limit ?? DEFAULT_LIMIT;
    const items = await this.across(repositories, (link) =>
      this.fetchPullRequests(connection, link, query.state ?? "open", limit),
    );
    return items.sort(newestFirst((pr) => pr.updatedAt)).slice(0, limit);
  }

  /** `query.state` only applies to pull requests and is ignored here. */
  async workflowRuns(actor: Actor, projectId: string, query: GithubListQuery = {}): Promise<GithubWorkflowRun[]> {
    const { connection, repositories } = await this.scope(actor, projectId, query.repositoryId);
    const limit = query.limit ?? DEFAULT_LIMIT;
    const items = await this.across(repositories, (link) =>
      this.cached(connection, "runs", link, { limit }, async () => {
        const { data } = await githubCall(() =>
          connection.octokit.rest.actions.listWorkflowRunsForRepo({ owner: link.owner, repo: link.name, per_page: limit }),
        );
        return data.workflow_runs.map((run) => toGithubWorkflowRun(link.fullName, run));
      }),
    );
    return items.sort(newestFirst((run) => run.createdAt)).slice(0, limit);
  }

  /** `query.state` only applies to pull requests and is ignored here. */
  async deployments(actor: Actor, projectId: string, query: GithubListQuery = {}): Promise<GithubDeployment[]> {
    const { connection, repositories } = await this.scope(actor, projectId, query.repositoryId);
    const limit = query.limit ?? DEFAULT_LIMIT;
    const { octokit } = connection;
    const items = await this.across(repositories, (link) =>
      this.cached(connection, "deployments", link, { limit }, async () => {
        const { data } = await githubCall(() =>
          octokit.rest.repos.listDeployments({ owner: link.owner, repo: link.name, per_page: limit }),
        );
        return mapWithConcurrency(data, DEPLOYMENT_STATUS_CONCURRENCY, async (deployment) => {
          // Statuses are returned newest first; the first one is the current state.
          const { data: statuses } = await githubCall(() =>
            octokit.rest.repos.listDeploymentStatuses({
              owner: link.owner,
              repo: link.name,
              deployment_id: deployment.id,
              per_page: 1,
            }),
          );
          return toGithubDeployment(link.fullName, deployment, statuses[0]);
        });
      }),
    );
    return items.sort(newestFirst((deployment) => deployment.createdAt)).slice(0, limit);
  }

  /** `query.state` only applies to pull requests and is ignored here. */
  async releases(actor: Actor, projectId: string, query: GithubListQuery = {}): Promise<GithubRelease[]> {
    const { connection, repositories } = await this.scope(actor, projectId, query.repositoryId);
    const limit = query.limit ?? DEFAULT_LIMIT;
    const items = await this.across(repositories, (link) =>
      this.cached(connection, "releases", link, { limit }, async () => {
        const { data } = await githubCall(() =>
          connection.octokit.rest.repos.listReleases({ owner: link.owner, repo: link.name, per_page: limit }),
        );
        return data.map((release) => toGithubRelease(link.fullName, release));
      }),
    );
    return items.sort(newestFirst((release) => release.publishedAt)).slice(0, limit);
  }

  /** Authorizes via the link listing, then requires configured credentials. */
  private async scope(actor: Actor, projectId: string, repositoryId?: string): Promise<Scope> {
    const links = await this.links.list(actor, projectId);
    const connection = await this.github.connect();
    if (!repositoryId) return { connection, repositories: links };
    const link = links.find((l) => l.id === repositoryId);
    if (!link) throw notFound("Repository link", repositoryId);
    return { connection, repositories: [link] };
  }

  private across<R>(repositories: RepositoryLink[], fetch: (link: RepositoryLink) => Promise<R[]>) {
    return collectAcross(repositories, fetch, {
      limit: REPOSITORY_CONCURRENCY,
      logger: this.logger,
      describe: (link) => `GitHub repository ${link.fullName}`,
    });
  }

  private cached<T>(
    connection: GithubConnection,
    endpoint: string,
    link: RepositoryLink,
    params: Record<string, unknown>,
    load: () => Promise<T>,
  ): Promise<T> {
    return this.cache.getOrLoad(cacheKey(connection.version, endpoint, link.fullName, params), load);
  }

  private repository(connection: GithubConnection, link: RepositoryLink) {
    return this.cached(connection, "repository", link, {}, async () => {
      const { data } = await githubCall(
        () => connection.octokit.rest.repos.get({ owner: link.owner, repo: link.name }),
        `Repository ${link.fullName} was not found or the GitHub token cannot access it`,
      );
      return {
        stargazers_count: data.stargazers_count,
        open_issues_count: data.open_issues_count,
        pushed_at: data.pushed_at,
        language: data.language,
      };
    });
  }

  private fetchPullRequests(
    connection: GithubConnection,
    link: RepositoryLink,
    state: NonNullable<GithubListQuery["state"]>,
    limit: number,
  ) {
    return this.cached(connection, "pulls", link, { state, limit }, async () => {
      const { data } = await githubCall(() =>
        connection.octokit.rest.pulls.list({
          owner: link.owner,
          repo: link.name,
          state,
          sort: "updated",
          direction: "desc",
          per_page: limit,
        }),
      );
      return data.map((pr) => toGithubPullRequest(link.fullName, pr));
    });
  }

  /** `status` accepts conclusions too; `total_count` gives an exact count with one tiny page. */
  private countRuns(connection: GithubConnection, link: RepositoryLink, status: "failure" | "success", since: string) {
    return this.cached(connection, "runCount", link, { status, since }, async () => {
      const { data } = await githubCall(() =>
        connection.octokit.rest.actions.listWorkflowRunsForRepo({
          owner: link.owner,
          repo: link.name,
          status,
          created: `>=${since}`,
          per_page: 1,
        }),
      );
      return data.total_count;
    });
  }

  /** The deployments API has no date filter: count the most recent page. */
  private countDeployments(connection: GithubConnection, link: RepositoryLink, since: string) {
    return this.cached(connection, "deploymentCount", link, { since }, async () => {
      const { data } = await githubCall(() =>
        connection.octokit.rest.repos.listDeployments({ owner: link.owner, repo: link.name, per_page: MAX_PAGE }),
      );
      return data.filter((deployment) => deployment.created_at.slice(0, 10) >= since).length;
    });
  }
}
