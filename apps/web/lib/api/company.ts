import type { AuditLogEntry, Company, Paginated, UpdateCompanyInput } from "@repo/contracts";
import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

export const companyKeys = { all: ["company"] as const, audit: (params: AuditParams) => ["audit", params] as const };

export interface AuditParams {
  page?: number;
  entityType?: string;
  actorId?: string;
}

export const companyQuery = queryOptions({
  queryKey: companyKeys.all,
  queryFn: ({ signal }) => api.get<Company>("company", undefined, signal),
  staleTime: 5 * 60_000,
});

export const auditLogQuery = (params: AuditParams) =>
  queryOptions({
    queryKey: companyKeys.audit(params),
    queryFn: ({ signal }) => api.get<Paginated<AuditLogEntry>>("audit-logs", { pageSize: 30, ...params }, signal),
    placeholderData: (previous) => previous,
  });

export function useUpdateCompany() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCompanyInput) => api.patch<Company>("company", input),
    onSuccess: (company) => queryClient.setQueryData(companyKeys.all, company),
  });
}
