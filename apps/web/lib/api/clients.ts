import type {
  ClientDetail,
  ClientStatus,
  ClientSummary,
  CreateClientInput,
  Paginated,
  UpdateClientInput,
} from "@repo/contracts";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export interface ClientListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ClientStatus;
}

export const clientKeys = {
  all: ["clients"] as const,
  list: (params: ClientListParams) => [...clientKeys.all, "list", params] as const,
  detail: (id: string) => [...clientKeys.all, "detail", id] as const,
};

export const clientsQuery = (params: ClientListParams) =>
  queryOptions({
    queryKey: clientKeys.list(params),
    queryFn: ({ signal }) => api.get<Paginated<ClientSummary>>("clients", { ...params }, signal),
    placeholderData: (previous) => previous,
  });

export const clientQuery = (id: string) =>
  queryOptions({
    queryKey: clientKeys.detail(id),
    queryFn: ({ signal }) => api.get<ClientDetail>(`clients/${id}`, undefined, signal),
  });

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateClientInput) => api.post<ClientDetail>("clients", input),
    onSuccess: (client) => {
      queryClient.setQueryData(clientKeys.detail(client.id), client);
      return queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
}

export function useUpdateClient(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateClientInput) => api.patch<ClientDetail>(`clients/${id}`, input),
    onSuccess: (client) => {
      queryClient.setQueryData(clientKeys.detail(id), client);
      return queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`clients/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: clientKeys.all }),
  });
}
