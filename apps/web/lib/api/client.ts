import type { ApiErrorBody } from "@repo/contracts";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: ApiErrorBody,
  ) {
    super(body.message);
    this.name = "ApiError";
  }

  /** Field errors keyed by dotted path, when the API rejected the input. */
  get issues(): Record<string, string[]> {
    return this.body.issues ?? {};
  }
}

export const SESSION_EXPIRED_EVENT = "session:expired";

type QueryValue = string | number | boolean | null | undefined | readonly string[];
export type Query = Record<string, QueryValue>;

interface RequestOptions {
  query?: Query;
  body?: unknown;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, Array.isArray(value) ? value.join(",") : String(value));
  }
  const qs = params.toString();
  return `/api/${path.replace(/^\//, "")}${qs ? `?${qs}` : ""}`;
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody;
  try {
    body = (await response.json()) as ApiErrorBody;
  } catch {
    body = { statusCode: response.status, error: "ERROR", message: response.statusText || "Request failed" };
  }
  return new ApiError(response.status, body);
}

export async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const isForm = options.body instanceof FormData;
  const response = await fetch(buildUrl(path, options.query), {
    method,
    signal: options.signal,
    headers: {
      accept: "application/json",
      ...(options.body !== undefined && !isForm && { "content-type": "application/json" }),
    },
    body:
      options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
    credentials: "same-origin",
  });

  if (response.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const api = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => request<T>("GET", path, { query, signal }),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, { body }),
  delete: <T = void>(path: string) => request<T>("DELETE", path),
  upload: <T>(path: string, files: File[], field = "files") => {
    const form = new FormData();
    for (const file of files) form.append(field, file);
    return request<T>("POST", path, { body: form });
  },
};

/** Best human-readable message for any thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
