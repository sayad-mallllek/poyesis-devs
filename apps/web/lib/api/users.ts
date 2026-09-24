import type {
  ChangePasswordInput,
  CreateUserInput,
  ListUsersQuery,
  Paginated,
  UpdateUserInput,
  UserDetail,
  UserSummary,
} from "@repo/contracts";
import { queryOptions, useMutation, useQueryClient, type MutationMeta, type QueryClient } from "@tanstack/react-query";
import { api } from "./client";
import { sessionQuery } from "./session";

export type UserListParams = ListUsersQuery;

export const userKeys = {
  all: ["users"] as const,
  list: (params: UserListParams) => [...userKeys.all, "list", params] as const,
  detail: (id: string) => [...userKeys.all, "detail", id] as const,
};

export const usersQuery = (params: UserListParams) =>
  queryOptions({
    queryKey: userKeys.list(params),
    queryFn: ({ signal }) => api.get<Paginated<UserSummary>>("users", { ...params }, signal),
    placeholderData: (previous) => previous,
  });

export const userQuery = (id: string) =>
  queryOptions({
    queryKey: userKeys.detail(id),
    queryFn: ({ signal }) => api.get<UserDetail>(`users/${id}`, undefined, signal),
  });

function onUserChanged(queryClient: QueryClient, user: UserDetail) {
  queryClient.setQueryData(userKeys.detail(user.id), user);
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: userKeys.all }),
    // Names, titles and capacity also appear in the schedule and the signed-in user's session.
    queryClient.invalidateQueries({ queryKey: ["schedule"] }),
    queryClient.invalidateQueries({ queryKey: sessionQuery.queryKey }),
  ]);
}

export function useCreateUser(meta?: MutationMeta) {
  const queryClient = useQueryClient();
  return useMutation({
    meta,
    mutationFn: (input: CreateUserInput) => api.post<UserDetail>("users", input),
    onSuccess: (user) => onUserChanged(queryClient, user),
  });
}

export function useUpdateUser(id: string, meta?: MutationMeta) {
  const queryClient = useQueryClient();
  return useMutation({
    meta,
    mutationFn: (input: UpdateUserInput) => api.patch<UserDetail>(`users/${id}`, input),
    onSuccess: (user) => onUserChanged(queryClient, user),
  });
}

export function useSuspendUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<UserDetail>(`users/${id}`),
    onSuccess: (user) => onUserChanged(queryClient, user),
  });
}

export function useChangePassword(meta?: MutationMeta) {
  return useMutation({
    meta,
    mutationFn: (input: ChangePasswordInput) => api.post<void>("users/me/password", input),
  });
}
