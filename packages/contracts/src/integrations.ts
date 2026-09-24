import { type } from "arktype";
import type { IsoDateTime, UserRef } from "./common.js";
import type { IntegrationProvider } from "./enums.js";

// ── Workspace-level credentials ───────────────────────────────────────────

export const configureGithubSchema = type({
  /** Fine-grained or classic personal access token with `repo` + `actions:read`. */
  token: "string >= 20",
  "apiBaseUrl?": "string.url",
});
export type ConfigureGithubInput = typeof configureGithubSchema.infer;

export const configureSentrySchema = type({
  /** Organization auth token with `project:read` and `event:read`. */
  token: "string >= 20",
  organizationSlug: "0 < string <= 100",
  /** `https://sentry.io`, a regional host, or a self-hosted instance. */
  "baseUrl?": "string.url",
});
export type ConfigureSentryInput = typeof configureSentrySchema.infer;

export interface IntegrationStatus {
  provider: IntegrationProvider;
  configured: boolean;
  /** Non-secret configuration (e.g. organization slug, base URL). */
  config: Record<string, string>;
  /** Last four characters of the token, for recognition only. */
  tokenHint: string | null;
  lastVerifiedAt: IsoDateTime | null;
  lastError: string | null;
  updatedAt: IsoDateTime | null;
}

// ── GitHub repositories linked to a project ───────────────────────────────

export const linkRepositorySchema = type({
  /** `owner/name` or a full https://github.com/owner/name URL. */
  repository: "0 < string <= 300",
});
export type LinkRepositoryInput = typeof linkRepositorySchema.infer;

export interface RepositoryLink {
  id: string;
  projectId: string;
  owner: string;
  name: string;
  fullName: string;
  url: string;
  defaultBranch: string | null;
  isPrivate: boolean | null;
  createdAt: IsoDateTime;
}

export const githubListQuerySchema = type({
  "repositoryId?": "string",
  "state?": "'open' | 'closed' | 'all'",
  "limit?": "string.integer.parse |> 1 <= number.integer <= 100",
});
export type GithubListQuery = typeof githubListQuerySchema.infer;

export interface GithubActor {
  login: string;
  avatarUrl: string | null;
  url: string | null;
}

export interface GithubPullRequest {
  repository: string;
  number: number;
  title: string;
  url: string;
  state: "open" | "closed";
  draft: boolean;
  merged: boolean;
  author: GithubActor | null;
  headRef: string;
  baseRef: string;
  labels: Array<{ name: string; color: string }>;
  reviewers: string[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  mergedAt: IsoDateTime | null;
  closedAt: IsoDateTime | null;
}

export interface GithubWorkflowRun {
  repository: string;
  id: number;
  name: string;
  displayTitle: string;
  url: string;
  event: string;
  branch: string | null;
  status: string | null;
  conclusion: string | null;
  actor: GithubActor | null;
  runNumber: number;
  durationSeconds: number | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface GithubDeployment {
  repository: string;
  id: number;
  environment: string;
  ref: string;
  sha: string;
  description: string | null;
  creator: GithubActor | null;
  /** Latest deployment status state (`success`, `failure`, `in_progress`…). */
  state: string | null;
  environmentUrl: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface GithubRelease {
  repository: string;
  id: number;
  name: string | null;
  tagName: string;
  url: string;
  draft: boolean;
  prerelease: boolean;
  author: GithubActor | null;
  publishedAt: IsoDateTime | null;
}

export interface GithubOverview {
  repositories: Array<
    RepositoryLink & {
      stars: number | null;
      openIssues: number | null;
      pushedAt: IsoDateTime | null;
      language: string | null;
      error: string | null;
    }
  >;
  openPullRequests: number;
  failedRunsLast7Days: number;
  successfulRunsLast7Days: number;
  deploymentsLast30Days: number;
}

// ── Sentry projects linked to a project ───────────────────────────────────

export const linkSentryProjectSchema = type({
  projectSlug: "0 < string <= 100",
  "organizationSlug?": "0 < string <= 100",
  "environment?": "string <= 64 | null",
});
export type LinkSentryProjectInput = typeof linkSentryProjectSchema.infer;

export interface SentryLink {
  id: string;
  projectId: string;
  organizationSlug: string;
  projectSlug: string;
  environment: string | null;
  name: string | null;
  platform: string | null;
  createdAt: IsoDateTime;
  createdBy: UserRef | null;
}

export const sentryIssuesQuerySchema = type({
  "sentryLinkId?": "string",
  "statsPeriod?": "'24h' | '14d'",
  "query?": "string <= 500",
  "sort?": "'date' | 'new' | 'freq' | 'user'",
  "limit?": "string.integer.parse |> 1 <= number.integer <= 100",
});
export type SentryIssuesQuery = typeof sentryIssuesQuerySchema.infer;

export interface SentryIssue {
  sentryLinkId: string;
  sentryProject: string;
  id: string;
  shortId: string;
  title: string;
  culprit: string | null;
  level: string;
  status: string;
  count: number;
  userCount: number;
  permalink: string;
  firstSeen: IsoDateTime;
  lastSeen: IsoDateTime;
  /** Event counts per bucket for sparkline rendering. */
  stats: number[];
}

export interface SentryAvailableProject {
  slug: string;
  name: string;
  platform: string | null;
}
