import type { LoginInput, Session } from "@repo/contracts";
import { queryOptions } from "@tanstack/react-query";
import { api, request } from "./client";

export const sessionQuery = queryOptions({
  queryKey: ["session"],
  queryFn: () => api.get<Session>("auth/session"),
  staleTime: 5 * 60_000,
  retry: false,
});

export const login = (input: LoginInput) => request<Session>("POST", "auth/login", { body: input });
export const logout = () => request<void>("POST", "auth/logout");
