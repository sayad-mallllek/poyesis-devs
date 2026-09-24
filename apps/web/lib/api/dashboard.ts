import type { DashboardOverview } from "@repo/contracts";
import { queryOptions } from "@tanstack/react-query";
import { api } from "./client";

export const dashboardKeys = { all: ["dashboard"] as const };

export const dashboardQuery = queryOptions({
  queryKey: dashboardKeys.all,
  queryFn: ({ signal }) => api.get<DashboardOverview>("dashboard", undefined, signal),
});
