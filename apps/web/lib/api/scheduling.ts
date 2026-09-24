import type {
  Allocation,
  CreateAllocationInput,
  CreateTimeOffInput,
  IsoDate,
  Schedule,
  TimeOff,
  UpdateAllocationInput,
  UpdateTimeOffInput,
} from "@repo/contracts";
import { queryOptions, useMutation, useQueryClient, type MutationMeta, type QueryClient } from "@tanstack/react-query";
import { api } from "./client";

export interface ScheduleParams {
  from: IsoDate;
  to: IsoDate;
  userIds?: string[];
  projectId?: string;
  search?: string;
}

export interface AllocationListParams {
  from?: IsoDate;
  to?: IsoDate;
  userId?: string;
  projectId?: string;
}

export interface TimeOffListParams {
  from?: IsoDate;
  to?: IsoDate;
  userId?: string;
}

export const scheduleKeys = {
  all: ["schedule"] as const,
  range: (params: ScheduleParams) => [...scheduleKeys.all, params] as const,
};

export const allocationKeys = {
  all: ["allocations"] as const,
  list: (params: AllocationListParams) => [...allocationKeys.all, "list", params] as const,
};

export const timeOffKeys = {
  all: ["time-off"] as const,
  list: (params: TimeOffListParams) => [...timeOffKeys.all, "list", params] as const,
};

export const scheduleQuery = (params: ScheduleParams) =>
  queryOptions({
    queryKey: scheduleKeys.range(params),
    queryFn: ({ signal }) => api.get<Schedule>("schedule", { ...params }, signal),
    // Keeps the grid on screen while paging through weeks.
    placeholderData: (previous) => previous,
  });

export const allocationsQuery = (params: AllocationListParams) =>
  queryOptions({
    queryKey: allocationKeys.list(params),
    queryFn: ({ signal }) => api.get<Allocation[]>("allocations", { ...params }, signal),
  });

export const timeOffQuery = (params: TimeOffListParams) =>
  queryOptions({
    queryKey: timeOffKeys.list(params),
    queryFn: ({ signal }) => api.get<TimeOff[]>("time-off", { ...params }, signal),
  });

/** Bookings feed the schedule, dashboards and (via auto-membership) project teams. */
function invalidateBookings(queryClient: QueryClient) {
  return Promise.all(
    [scheduleKeys.all, allocationKeys.all, ["dashboard"], ["projects"], ["users"]].map((queryKey) =>
      queryClient.invalidateQueries({ queryKey }),
    ),
  );
}

function invalidateTimeOff(queryClient: QueryClient) {
  return Promise.all(
    [scheduleKeys.all, timeOffKeys.all, ["dashboard"]].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}

export function useCreateAllocation(meta?: MutationMeta) {
  const queryClient = useQueryClient();
  return useMutation({
    meta,
    mutationFn: (input: CreateAllocationInput) => api.post<Allocation>("allocations", input),
    onSuccess: () => invalidateBookings(queryClient),
  });
}

export function useUpdateAllocation(meta?: MutationMeta) {
  const queryClient = useQueryClient();
  return useMutation({
    meta,
    mutationFn: ({ id, ...input }: UpdateAllocationInput & { id: string }) =>
      api.patch<Allocation>(`allocations/${id}`, input),
    onSuccess: () => invalidateBookings(queryClient),
  });
}

export function useDeleteAllocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`allocations/${id}`),
    onSuccess: () => invalidateBookings(queryClient),
  });
}

export function useCreateTimeOff(meta?: MutationMeta) {
  const queryClient = useQueryClient();
  return useMutation({
    meta,
    mutationFn: (input: CreateTimeOffInput) => api.post<TimeOff>("time-off", input),
    onSuccess: () => invalidateTimeOff(queryClient),
  });
}

export function useUpdateTimeOff(meta?: MutationMeta) {
  const queryClient = useQueryClient();
  return useMutation({
    meta,
    mutationFn: ({ id, ...input }: UpdateTimeOffInput & { id: string }) => api.patch<TimeOff>(`time-off/${id}`, input),
    onSuccess: () => invalidateTimeOff(queryClient),
  });
}

export function useDeleteTimeOff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`time-off/${id}`),
    onSuccess: () => invalidateTimeOff(queryClient),
  });
}
