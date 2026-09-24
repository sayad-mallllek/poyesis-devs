import type { ChatMessage, ChatSession } from "@repo/contracts";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export const assistantKeys = {
  all: ["assistant"] as const,
  status: () => [...assistantKeys.all, "status"] as const,
  sessions: () => [...assistantKeys.all, "sessions"] as const,
  messages: (sessionId: string) => [...assistantKeys.all, "messages", sessionId] as const,
};

export const assistantStatusQuery = queryOptions({
  queryKey: assistantKeys.status(),
  queryFn: () => api.get<{ enabled: boolean; model: string }>("ai/status"),
  staleTime: 5 * 60_000,
});

export const chatSessionsQuery = queryOptions({
  queryKey: assistantKeys.sessions(),
  queryFn: ({ signal }) => api.get<ChatSession[]>("ai/sessions", undefined, signal),
});

export const chatMessagesQuery = (sessionId: string) =>
  queryOptions({
    queryKey: assistantKeys.messages(sessionId),
    queryFn: ({ signal }) => api.get<ChatMessage[]>(`ai/sessions/${sessionId}/messages`, undefined, signal),
    staleTime: Infinity,
  });

export function useCreateChatSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<ChatSession>("ai/sessions", {}),
    onSuccess: (session) => {
      queryClient.setQueryData<ChatSession[]>(assistantKeys.sessions(), (list) => [session, ...(list ?? [])]);
      queryClient.setQueryData<ChatMessage[]>(assistantKeys.messages(session.id), []);
    },
  });
}

export function useRenameChatSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => api.patch<ChatSession>(`ai/sessions/${id}`, { title }),
    onSuccess: (session) =>
      queryClient.setQueryData<ChatSession[]>(assistantKeys.sessions(), (list) =>
        list?.map((s) => (s.id === session.id ? session : s)),
      ),
  });
}

export function useDeleteChatSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`ai/sessions/${id}`),
    onSuccess: (_void, id) => {
      queryClient.setQueryData<ChatSession[]>(assistantKeys.sessions(), (list) => list?.filter((s) => s.id !== id));
      queryClient.removeQueries({ queryKey: assistantKeys.messages(id) });
    },
  });
}
