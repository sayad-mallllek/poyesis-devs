import type {
  CreateSkillInput,
  RateUserSkillInput,
  Skill,
  UpsertUserSkillInput,
  UserSkill,
} from "@repo/contracts";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export const skillKeys = {
  all: ["skills"] as const,
  catalog: (search?: string) => [...skillKeys.all, "catalog", search ?? ""] as const,
  ofUser: (userId: string) => [...skillKeys.all, "user", userId] as const,
};

export const skillsQuery = (search?: string) =>
  queryOptions({
    queryKey: skillKeys.catalog(search),
    queryFn: ({ signal }) => api.get<Skill[]>("skills", { search }, signal),
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });

export const userSkillsQuery = (userId: string) =>
  queryOptions({
    queryKey: skillKeys.ofUser(userId),
    queryFn: ({ signal }) => api.get<UserSkill[]>(`users/${userId}/skills`, undefined, signal),
  });

export function useCreateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSkillInput) => api.post<Skill>("skills", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: skillKeys.all }),
  });
}

export function useDeleteSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`skills/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: skillKeys.all }),
  });
}

/** Invalidating `skills` refreshes both the person's list and catalog user counts. */
export function useUpsertUserSkill(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ skillId, ...input }: UpsertUserSkillInput & { skillId: string }) =>
      api.put<UserSkill>(`users/${userId}/skills/${skillId}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: skillKeys.all }),
  });
}

export function useRateUserSkill(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ skillId, ...input }: RateUserSkillInput & { skillId: string }) =>
      api.put<UserSkill>(`users/${userId}/skills/${skillId}/rating`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: skillKeys.ofUser(userId) }),
  });
}

export function useRemoveUserSkill(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (skillId: string) => api.delete(`users/${userId}/skills/${skillId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: skillKeys.all }),
  });
}
