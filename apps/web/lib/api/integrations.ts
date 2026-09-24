import type {
  ConfigureGithubInput,
  ConfigureSentryInput,
  GithubDeployment,
  GithubOverview,
  GithubPullRequest,
  GithubRelease,
  GithubWorkflowRun,
  IntegrationProvider,
  IntegrationStatus,
  LinkRepositoryInput,
  LinkSentryProjectInput,
  RepositoryLink,
  SentryAvailableProject,
  SentryIssue,
  SentryLink,
} from "@repo/contracts";
import { keepPreviousData, queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export interface GithubListParams {
  repositoryId?: string;
  state?: "open" | "closed" | "all";
  limit?: number;
}

export interface SentryIssueParams {
  sentryLinkId?: string;
  statsPeriod?: "24h" | "14d";
  query?: string;
  sort?: "date" | "new" | "freq" | "user";
}

export const integrationKeys = {
  all: ["integrations"] as const,
  statuses: () => [...integrationKeys.all, "statuses"] as const,
  sentryProjects: () => [...integrationKeys.all, "sentry-projects"] as const,
  project: (projectId: string) => [...integrationKeys.all, "project", projectId] as const,
  repositories: (projectId: string) => [...integrationKeys.project(projectId), "repositories"] as const,
  github: (projectId: string, kind: string, params?: GithubListParams) =>
    [...integrationKeys.project(projectId), "github", kind, params ?? {}] as const,
  sentryLinks: (projectId: string) => [...integrationKeys.project(projectId), "sentry-links"] as const,
  sentryIssues: (projectId: string, params: SentryIssueParams) =>
    [...integrationKeys.project(projectId), "sentry-issues", params] as const,
};

export const integrationStatusesQuery = queryOptions({
  queryKey: integrationKeys.statuses(),
  queryFn: ({ signal }) => api.get<IntegrationStatus[]>("integrations", undefined, signal),
});

export const sentryAvailableProjectsQuery = queryOptions({
  queryKey: integrationKeys.sentryProjects(),
  queryFn: ({ signal }) => api.get<SentryAvailableProject[]>("integrations/sentry/projects", undefined, signal),
  staleTime: 5 * 60_000,
});

export const repositoriesQuery = (projectId: string) =>
  queryOptions({
    queryKey: integrationKeys.repositories(projectId),
    queryFn: ({ signal }) => api.get<RepositoryLink[]>(`projects/${projectId}/repositories`, undefined, signal),
  });

/** Upstream data is cached ~60s by the API as well; avoid refetch storms. */
const UPSTREAM_STALE_MS = 60_000;

export const githubOverviewQuery = (projectId: string) =>
  queryOptions({
    queryKey: integrationKeys.github(projectId, "overview"),
    queryFn: ({ signal }) => api.get<GithubOverview>(`projects/${projectId}/github/overview`, undefined, signal),
    staleTime: UPSTREAM_STALE_MS,
  });

const githubList = <T>(kind: string, path: string) => (projectId: string, params: GithubListParams) =>
  queryOptions({
    queryKey: integrationKeys.github(projectId, kind, params),
    queryFn: ({ signal }) => api.get<T[]>(`projects/${projectId}/github/${path}`, { ...params }, signal),
    staleTime: UPSTREAM_STALE_MS,
    placeholderData: keepPreviousData,
  });

export const pullRequestsQuery = githubList<GithubPullRequest>("pull-requests", "pull-requests");
export const workflowRunsQuery = githubList<GithubWorkflowRun>("workflow-runs", "workflow-runs");
export const deploymentsQuery = githubList<GithubDeployment>("deployments", "deployments");
export const releasesQuery = githubList<GithubRelease>("releases", "releases");

export const sentryLinksQuery = (projectId: string) =>
  queryOptions({
    queryKey: integrationKeys.sentryLinks(projectId),
    queryFn: ({ signal }) => api.get<SentryLink[]>(`projects/${projectId}/sentry-projects`, undefined, signal),
  });

export const sentryIssuesQuery = (projectId: string, params: SentryIssueParams) =>
  queryOptions({
    queryKey: integrationKeys.sentryIssues(projectId, params),
    queryFn: ({ signal }) => api.get<SentryIssue[]>(`projects/${projectId}/sentry/issues`, { ...params, limit: 50 }, signal),
    staleTime: UPSTREAM_STALE_MS,
    placeholderData: keepPreviousData,
  });

export function useConfigureIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (
      input: { provider: "GITHUB"; values: ConfigureGithubInput } | { provider: "SENTRY"; values: ConfigureSentryInput },
    ) => api.put<IntegrationStatus>(`integrations/${input.provider.toLowerCase()}`, input.values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.all }),
  });
}

export function useTestIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provider: IntegrationProvider) => api.post<IntegrationStatus>(`integrations/${provider.toLowerCase()}/test`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.statuses() }),
  });
}

export function useRemoveIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provider: IntegrationProvider) => api.delete(`integrations/${provider.toLowerCase()}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.all }),
  });
}

export function useLinkRepository(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LinkRepositoryInput) => api.post<RepositoryLink>(`projects/${projectId}/repositories`, input),
    meta: { silent: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.project(projectId) }),
  });
}

export function useUnlinkRepository(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => api.delete(`projects/${projectId}/repositories/${linkId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.project(projectId) }),
  });
}

export function useLinkSentryProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LinkSentryProjectInput) => api.post<SentryLink>(`projects/${projectId}/sentry-projects`, input),
    meta: { silent: true },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.project(projectId) }),
  });
}

export function useUnlinkSentryProject(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => api.delete(`projects/${projectId}/sentry-projects/${linkId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: integrationKeys.project(projectId) }),
  });
}
