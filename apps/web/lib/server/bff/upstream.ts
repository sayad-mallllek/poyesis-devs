import "server-only";
import type { ApiErrorBody } from "@repo/contracts";
import { API_URL } from "./config";

export class UpstreamUnavailableError extends Error {}

export async function upstream(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${API_URL}/v1/${path.replace(/^\//, "")}`, {
      ...init,
      cache: "no-store",
      redirect: "manual",
    });
  } catch (cause) {
    throw new UpstreamUnavailableError("API unreachable", { cause });
  }
}

export function errorResponse(statusCode: number, message: string, cookies: string[] = []): Response {
  const error = { 401: "UNAUTHORIZED", 404: "NOT_FOUND", 502: "BAD_GATEWAY" }[statusCode] ?? "ERROR";
  const body: ApiErrorBody = { statusCode, error, message };
  const response = Response.json(body, { status: statusCode });
  for (const cookie of cookies) response.headers.append("set-cookie", cookie);
  return response;
}
