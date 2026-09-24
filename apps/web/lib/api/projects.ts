import type {
  Attachment,
  CreateMilestoneInput,
  CreateProjectInput,
  CreateRiskInput,
  CreateStatusUpdateInput,
  ListProjectsQuery,
  Milestone,
  Paginated,
  ProjectAnalytics,
  ProjectDetail,
  ProjectMember,
  ProjectMemberInput,
  ProjectMemberRole,
  ProjectSummary,
  Risk,
  StatusUpdate,
  UpdateMilestoneInput,
  UpdateProjectInput,
  UpdateRiskInput,
} from "@repo/contracts";
import { queryOptions, useMutation, useQueryClient, type QueryClient, type QueryKey } from "@tanstack/react-query";
import { api } from "./client";
import { sessionQuery } from "./session";

export type ProjectListParams = ListProjectsQuery;

/**
 * Per-project keys live under `["projects", id, <part>]` so a child mutation can
 * refresh exactly the parts it affects instead of everything about the project.
 */
export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (params: ProjectListParams) => [...projectKeys.lists(), params] as const,
  detail: (id: string) => [...projectKeys.all, id, "detail"] as const,
  analytics: (id: string) => [...projectKeys.all, id, "analytics"] as const,
  members: (id: string) => [...projectKeys.all, id, "members"] as const,
  milestones: (id: string) => [...projectKeys.all, id, "milestones"] as const,
  risks: (id: string) => [...projectKeys.all, id, "risks"] as const,
  updates: (id: string) => [...projectKeys.all, id, "status-updates"] as const,
  attachments: (id: string) => [...projectKeys.all, id, "attachments"] as const,
};

/** Keys owned by other domains that embed project data (names, colors, health, hours). */
const DASHBOARD_KEY = ["dashboard"] as const;
const BOOKING_KEYS = [["schedule"], ["allocations"]] as const;

const invalidate = (queryClient: QueryClient, keys: readonly QueryKey[]) =>
  Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

export const projectsQuery = (params: ProjectListParams) =>
  queryOptions({
    queryKey: projectKeys.list(params),
    queryFn: ({ signal }) => api.get<Paginated<ProjectSummary>>("projects", { ...params }, signal),
    placeholderData: (previous) => previous,
  });

export const projectQuery = (id: string) =>
  queryOptions({
    queryKey: projectKeys.detail(id),
    queryFn: ({ signal }) => api.get<ProjectDetail>(`projects/${id}`, undefined, signal),
  });

export const projectAnalyticsQuery = (id: string) =>
  queryOptions({
    queryKey: projectKeys.analytics(id),
    queryFn: ({ signal }) => api.get<ProjectAnalytics>(`projects/${id}/analytics`, undefined, signal),
  });

export const projectMembersQuery = (id: string) =>
  queryOptions({
    queryKey: projectKeys.members(id),
    queryFn: ({ signal }) => api.get<ProjectMember[]>(`projects/${id}/members`, undefined, signal),
  });

export const milestonesQuery = (id: string) =>
  queryOptions({
    queryKey: projectKeys.milestones(id),
    queryFn: ({ signal }) => api.get<Milestone[]>(`projects/${id}/milestones`, undefined, signal),
  });

export const risksQuery = (id: string) =>
  queryOptions({
    queryKey: projectKeys.risks(id),
    queryFn: ({ signal }) => api.get<Risk[]>(`projects/${id}/risks`, undefined, signal),
  });

export const statusUpdatesQuery = (id: string) =>
  queryOptions({
    queryKey: projectKeys.updates(id),
    queryFn: ({ signal }) => api.get<StatusUpdate[]>(`projects/${id}/status-updates`, undefined, signal),
  });

export const attachmentsQuery = (id: string) =>
  queryOptions({
    queryKey: projectKeys.attachments(id),
    queryFn: ({ signal }) => api.get<Attachment[]>(`projects/${id}/attachments`, undefined, signal),
  });

export const attachmentDownloadUrl = (projectId: string, attachmentId: string) =>
  `/api/projects/${projectId}/attachments/${attachmentId}/download`;

// ── Projects ──────────────────────────────────────────────────────────────

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProjectInput) => api.post<ProjectDetail>("projects", input),
    onSuccess: (project) => {
      queryClient.setQueryData(projectKeys.detail(project.id), project);
      // The creator now owns the project: refresh the principal so ABAC checks see it as managed.
      return invalidate(queryClient, [projectKeys.lists(), sessionQuery.queryKey, DASHBOARD_KEY, ["clients"]]);
    },
  });
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProjectInput) => api.patch<ProjectDetail>(`projects/${id}`, input),
    onSuccess: (project, input) => {
      queryClient.setQueryData(projectKeys.detail(id), project);
      return invalidate(queryClient, [
        projectKeys.lists(),
        projectKeys.analytics(id),
        projectKeys.members(id),
        DASHBOARD_KEY,
        ["clients"],
        ...BOOKING_KEYS,
        // A new owner becomes a LEAD member, which changes who may manage the project.
        ...(input.ownerId ? [sessionQuery.queryKey] : []),
      ]);
    },
  });
}

export function useArchiveProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`projects/${id}`),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: [...projectKeys.all, id] });
      return invalidate(queryClient, [projectKeys.lists(), DASHBOARD_KEY, ["clients"], sessionQuery.queryKey, ...BOOKING_KEYS]);
    },
  });
}

/** What every child mutation refreshes: its own list, the embedding detail and the derived analytics. */
const childKeys = (id: string, own: QueryKey): QueryKey[] => [
  own,
  projectKeys.detail(id),
  projectKeys.analytics(id),
  DASHBOARD_KEY,
];

// ── Members ───────────────────────────────────────────────────────────────

export function useMemberMutations(projectId: string) {
  const queryClient = useQueryClient();
  // Membership drives ABAC (memberProjectIds/managedProjectIds) and the list's member count.
  const onSuccess = () =>
    invalidate(queryClient, [
      ...childKeys(projectId, projectKeys.members(projectId)),
      projectKeys.lists(),
      sessionQuery.queryKey,
    ]);
  return {
    add: useMutation({
      mutationFn: (input: ProjectMemberInput) => api.post<ProjectMember>(`projects/${projectId}/members`, input),
      onSuccess,
    }),
    updateRole: useMutation({
      mutationFn: ({ userId, projectRole }: { userId: string; projectRole: ProjectMemberRole }) =>
        api.patch<ProjectMember>(`projects/${projectId}/members/${userId}`, { projectRole }),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (userId: string) => api.delete(`projects/${projectId}/members/${userId}`),
      onSuccess,
    }),
  };
}

// ── Milestones ────────────────────────────────────────────────────────────

export function useMilestoneMutations(projectId: string) {
  const queryClient = useQueryClient();
  const onSuccess = () => invalidate(queryClient, childKeys(projectId, projectKeys.milestones(projectId)));
  return {
    create: useMutation({
      mutationFn: (input: CreateMilestoneInput) => api.post<Milestone>(`projects/${projectId}/milestones`, input),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateMilestoneInput }) =>
        api.patch<Milestone>(`projects/${projectId}/milestones/${id}`, input),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.delete(`projects/${projectId}/milestones/${id}`),
      onSuccess,
    }),
  };
}

// ── Risks ─────────────────────────────────────────────────────────────────

export function useRiskMutations(projectId: string) {
  const queryClient = useQueryClient();
  const onSuccess = () => invalidate(queryClient, childKeys(projectId, projectKeys.risks(projectId)));
  return {
    create: useMutation({
      mutationFn: (input: CreateRiskInput) => api.post<Risk>(`projects/${projectId}/risks`, input),
      onSuccess,
    }),
    update: useMutation({
      mutationFn: ({ id, input }: { id: string; input: UpdateRiskInput }) =>
        api.patch<Risk>(`projects/${projectId}/risks/${id}`, input),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.delete(`projects/${projectId}/risks/${id}`),
      onSuccess,
    }),
  };
}

// ── Status updates ────────────────────────────────────────────────────────

export function useCreateStatusUpdate(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStatusUpdateInput) =>
      api.post<StatusUpdate>(`projects/${projectId}/status-updates`, input),
    // Posting an update moves the project's health and progress, which the list shows.
    onSuccess: () =>
      invalidate(queryClient, [...childKeys(projectId, projectKeys.updates(projectId)), projectKeys.lists()]),
  });
}

// ── Attachments ───────────────────────────────────────────────────────────

/** Mirrors the API's multipart limits. */
export const MAX_FILES_PER_UPLOAD = 10;
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export function useAttachmentMutations(projectId: string) {
  const queryClient = useQueryClient();
  const onSuccess = () =>
    invalidate(queryClient, [projectKeys.attachments(projectId), projectKeys.detail(projectId)]);
  return {
    upload: useMutation({
      mutationFn: (files: File[]) => api.upload<Attachment[]>(`projects/${projectId}/attachments`, files),
      onSuccess,
    }),
    remove: useMutation({
      mutationFn: (id: string) => api.delete(`projects/${projectId}/attachments/${id}`),
      onSuccess,
    }),
  };
}
