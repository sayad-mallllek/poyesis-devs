import type {
  GithubActor,
  GithubDeployment,
  GithubOverview,
  GithubPullRequest,
  GithubRelease,
  GithubWorkflowRun,
  RepositoryLink,
} from "@repo/contracts";

// Minimal structural views of GitHub REST v3 payloads: Octokit's response
// types are assignable to them, and test fixtures only need these fields.

interface GhUser {
  login: string;
  avatar_url?: string | null;
  html_url?: string | null;
}

export interface GhPullRequest {
  number: number;
  title: string;
  html_url: string;
  state: string;
  draft?: boolean;
  merged_at: string | null;
  user: GhUser | null;
  head: { ref: string };
  base: { ref: string };
  labels: Array<{ name: string; color: string }>;
  requested_reviewers?: GhUser[] | null;
  requested_teams?: Array<{ slug: string }> | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

export interface GhWorkflowRun {
  id: number;
  name?: string | null;
  display_title: string;
  html_url: string;
  event: string;
  head_branch: string | null;
  status: string | null;
  conclusion: string | null;
  actor?: GhUser;
  triggering_actor?: GhUser;
  run_number: number;
  run_started_at?: string;
  created_at: string;
  updated_at: string;
}

export interface GhDeployment {
  id: number;
  environment: string;
  ref: string;
  sha: string;
  description?: string | null;
  creator: GhUser | null;
  created_at: string;
  updated_at: string;
}

export interface GhDeploymentStatus {
  state: string;
  environment_url?: string;
}

export interface GhRelease {
  id: number;
  name: string | null;
  tag_name: string;
  html_url: string;
  draft: boolean;
  prerelease: boolean;
  author: GhUser | null;
  published_at: string | null;
}

export interface GhRepository {
  stargazers_count: number;
  open_issues_count: number;
  pushed_at: string | null;
  language?: string | null;
}

export interface RepositoryLinkRow {
  id: string;
  projectId: string;
  owner: string;
  name: string;
  defaultBranch: string | null;
  isPrivate: boolean | null;
  createdAt: Date;
}

const iso = (value: string) => new Date(value).toISOString();
const isoOrNull = (value: string | null | undefined) => (value ? iso(value) : null);

/** Newest first; ISO-8601 UTC strings sort lexicographically. Nulls last. */
export const newestFirst =
  <T>(date: (item: T) => string | null) =>
  (a: T, b: T) =>
    (date(b) ?? "").localeCompare(date(a) ?? "");

/** Web host for repository links: `api.github.com` → `github.com`, GHES `/api/v3` stripped. */
export function githubWebUrl(apiBaseUrl: string): string {
  const url = new URL(apiBaseUrl);
  if (url.hostname === "api.github.com") return "https://github.com";
  return `${url.origin}${url.pathname.replace(/\/api\/v3\/?$/, "").replace(/\/+$/, "")}`;
}

export const toGithubActor = (user: GhUser | null | undefined): GithubActor | null =>
  user ? { login: user.login, avatarUrl: user.avatar_url || null, url: user.html_url || null } : null;

export const toRepositoryLink = (row: RepositoryLinkRow, webUrl: string): RepositoryLink => ({
  id: row.id,
  projectId: row.projectId,
  owner: row.owner,
  name: row.name,
  fullName: `${row.owner}/${row.name}`,
  url: `${webUrl}/${row.owner}/${row.name}`,
  defaultBranch: row.defaultBranch,
  isPrivate: row.isPrivate,
  createdAt: row.createdAt.toISOString(),
});

export const toRepositoryOverview = (
  link: RepositoryLink,
  repo: GhRepository | null,
  error: string | null,
): GithubOverview["repositories"][number] => ({
  ...link,
  stars: repo?.stargazers_count ?? null,
  openIssues: repo?.open_issues_count ?? null,
  pushedAt: isoOrNull(repo?.pushed_at),
  language: repo?.language ?? null,
  error,
});

export const toGithubPullRequest = (repository: string, pr: GhPullRequest): GithubPullRequest => ({
  repository,
  number: pr.number,
  title: pr.title,
  url: pr.html_url,
  state: pr.state === "open" ? "open" : "closed",
  draft: pr.draft ?? false,
  // List payloads have no `merged` flag; `merged_at` is set exactly when merged.
  merged: pr.merged_at !== null,
  author: toGithubActor(pr.user),
  headRef: pr.head.ref,
  baseRef: pr.base.ref,
  labels: pr.labels.map((label) => ({ name: label.name, color: label.color })),
  reviewers: [
    ...(pr.requested_reviewers ?? []).map((user) => user.login),
    ...(pr.requested_teams ?? []).map((team) => team.slug),
  ],
  createdAt: iso(pr.created_at),
  updatedAt: iso(pr.updated_at),
  mergedAt: isoOrNull(pr.merged_at),
  closedAt: isoOrNull(pr.closed_at),
});

function runDurationSeconds(run: GhWorkflowRun): number | null {
  if (run.status !== "completed" || !run.run_started_at) return null;
  const ms = Date.parse(run.updated_at) - Date.parse(run.run_started_at);
  return Number.isFinite(ms) ? Math.max(0, Math.round(ms / 1000)) : null;
}

export const toGithubWorkflowRun = (repository: string, run: GhWorkflowRun): GithubWorkflowRun => ({
  repository,
  id: run.id,
  name: run.name ?? "",
  displayTitle: run.display_title,
  url: run.html_url,
  event: run.event,
  branch: run.head_branch,
  status: run.status,
  conclusion: run.conclusion,
  actor: toGithubActor(run.triggering_actor ?? run.actor),
  runNumber: run.run_number,
  durationSeconds: runDurationSeconds(run),
  createdAt: iso(run.created_at),
  updatedAt: iso(run.updated_at),
});

export const toGithubDeployment = (
  repository: string,
  deployment: GhDeployment,
  latestStatus: GhDeploymentStatus | undefined,
): GithubDeployment => ({
  repository,
  id: deployment.id,
  environment: deployment.environment,
  ref: deployment.ref,
  sha: deployment.sha,
  description: deployment.description || null,
  creator: toGithubActor(deployment.creator),
  state: latestStatus?.state ?? null,
  environmentUrl: latestStatus?.environment_url || null,
  createdAt: iso(deployment.created_at),
  updatedAt: iso(deployment.updated_at),
});

export const toGithubRelease = (repository: string, release: GhRelease): GithubRelease => ({
  repository,
  id: release.id,
  name: release.name || null,
  tagName: release.tag_name,
  url: release.html_url,
  draft: release.draft,
  prerelease: release.prerelease,
  author: toGithubActor(release.author),
  publishedAt: isoOrNull(release.published_at),
});
