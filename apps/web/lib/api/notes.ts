import type { CreateUserNoteInput, UpdateUserNoteInput, UserNote } from "@repo/contracts";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export const noteKeys = {
  all: ["notes"] as const,
  ofUser: (userId: string) => [...noteKeys.all, "user", userId] as const,
};

export const userNotesQuery = (userId: string) =>
  queryOptions({
    queryKey: noteKeys.ofUser(userId),
    queryFn: ({ signal }) => api.get<UserNote[]>(`users/${userId}/notes`, undefined, signal),
  });

export function useCreateNote(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateUserNoteInput) => api.post<UserNote>(`users/${userId}/notes`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.ofUser(userId) }),
  });
}

export function useUpdateNote(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateUserNoteInput & { id: string }) => api.patch<UserNote>(`notes/${id}`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.ofUser(userId) }),
  });
}

export function useDeleteNote(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`notes/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.ofUser(userId) }),
  });
}
