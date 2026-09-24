import "server-only";
import { loginSchema, type ApiErrorBody, type LoginResponse, type Session } from "@repo/contracts";
import { Elysia } from "elysia";
import { COOKIE } from "./config";
import { clearedSessionCookies, readCookies, sessionCookies, withCookies } from "./cookies";
import { refreshOnce } from "./refresh";
import { errorResponse, upstream, UpstreamUnavailableError } from "./upstream";

/** Request headers worth forwarding to the API. */
const FORWARDED_REQUEST_HEADERS = ["accept", "content-type", "x-request-id", "user-agent"];
/** Response headers worth returning to the browser. */
const FORWARDED_RESPONSE_HEADERS = [
  "content-type",
  "content-disposition",
  "content-length",
  "cache-control",
  "x-request-id",
  "retry-after",
];

const clientIp = (request: Request) =>
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

function upstreamHeaders(request: Request, accessToken: string | undefined): Headers {
  const headers = new Headers();
  for (const name of FORWARDED_REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const ip = clientIp(request);
  if (ip) headers.set("x-forwarded-for", ip);
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);
  return headers;
}

function toClientResponse(response: Response): Response {
  const headers = new Headers();
  for (const name of FORWARDED_RESPONSE_HEADERS) {
    const value = response.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (headers.get("content-type")?.startsWith("text/event-stream")) {
    headers.set("cache-control", "no-cache, no-transform");
    headers.set("x-accel-buffering", "no");
  }
  return new Response(response.body, { status: response.status, headers });
}

/**
 * Calls the API on behalf of the browser session. When the access token is
 * missing or rejected, rotates the refresh token once and retries; the new
 * cookies are attached to the response.
 */
async function forward(request: Request, path: string): Promise<Response> {
  const cookies = readCookies(request);
  const refreshToken = cookies[COOKIE.refresh];
  let accessToken = cookies[COOKIE.access];
  let setCookies: string[] = [];

  if (!accessToken && !refreshToken) return errorResponse(401, "Not signed in");

  // Buffer once so the request can be replayed after a refresh.
  const body =
    request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();
  const url = new URL(request.url);
  const target = `${path}${url.search}`;
  const send = () =>
    upstream(target, { method: request.method, headers: upstreamHeaders(request, accessToken), body });

  const refresh = async () => {
    if (!refreshToken) return false;
    const result = await refreshOnce(refreshToken, {
      userAgent: request.headers.get("user-agent"),
      ip: clientIp(request),
    });
    if (!result.ok) return false;
    accessToken = result.session.tokens.accessToken;
    setCookies = sessionCookies(result.session.tokens);
    return true;
  };

  if (!accessToken && !(await refresh())) {
    return errorResponse(401, "Your session has expired", clearedSessionCookies());
  }

  let response = await send();
  if (response.status === 401 && setCookies.length === 0) {
    if (!(await refresh())) {
      return withCookies(toClientResponse(response), clearedSessionCookies());
    }
    response = await send();
  }
  return withCookies(toClientResponse(response), setCookies);
}

async function readError(response: Response): Promise<ApiErrorBody> {
  try {
    return (await response.json()) as ApiErrorBody;
  } catch {
    return { statusCode: response.status, error: "ERROR", message: response.statusText };
  }
}

/**
 * Backend-for-frontend. The browser only ever talks to `/api/*` on the web
 * origin with HttpOnly cookies; tokens never touch client-side JavaScript.
 */
export const bff = new Elysia({ prefix: "/api" })
  .onError(({ error, code }) => {
    if (error instanceof UpstreamUnavailableError) {
      return errorResponse(502, "The API is unreachable. Please try again shortly.");
    }
    if (code === "VALIDATION") {
      return Response.json(
        { statusCode: 400, error: "BAD_REQUEST", message: "Validation failed" } satisfies ApiErrorBody,
        { status: 400 },
      );
    }
    return undefined;
  })
  .post(
    "/auth/login",
    async ({ body, request }) => {
      const response = await upstream("auth/login", {
        method: "POST",
        headers: upstreamHeaders(request, undefined),
        body: JSON.stringify(body),
      });
      if (!response.ok) return Response.json(await readError(response), { status: response.status });
      const { tokens, ...session } = (await response.json()) as LoginResponse;
      return withCookies(Response.json(session satisfies Session), sessionCookies(tokens));
    },
    { body: loginSchema },
  )
  .post("/auth/logout", async ({ request }) => {
    const refreshToken = readCookies(request)[COOKIE.refresh];
    if (refreshToken) {
      await upstream("auth/logout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => undefined);
    }
    return withCookies(new Response(null, { status: 204 }), clearedSessionCookies());
  })
  .get("/auth/session", ({ request }) => forward(request, "auth/me"))
  // Token endpoints are only reachable through the handlers above.
  .all("/auth/*", () => errorResponse(404, "Not found"))
  .all("/*", ({ request, params }) => forward(request, params["*"]));

export type Bff = typeof bff;
