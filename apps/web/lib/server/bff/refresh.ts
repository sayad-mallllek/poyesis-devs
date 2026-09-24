import "server-only";
import type { LoginResponse } from "@repo/contracts";
import { upstream } from "./upstream";

type RefreshResult = { ok: true; session: LoginResponse } | { ok: false };

interface RefreshState {
  inflight: Map<string, Promise<RefreshResult>>;
  recent: Map<string, { result: RefreshResult; expiresAt: number }>;
}

/** Survives dev hot reloads, which would otherwise reset the single-flight maps. */
const state: RefreshState = ((globalThis as { __bffRefresh?: RefreshState }).__bffRefresh ??= {
  inflight: new Map(),
  recent: new Map(),
});

/** How long a rotation result is reused for requests still carrying the old token. */
const REUSE_WINDOW_MS = 20_000;

/**
 * Rotates a refresh token at most once. The API treats a second use of a
 * rotated token as theft and revokes the session, so concurrent requests that
 * all hold the same expired access token must share one rotation.
 */
export function refreshOnce(refreshToken: string, meta: { userAgent?: string | null; ip?: string | null }) {
  const now = Date.now();
  for (const [key, entry] of state.recent) if (entry.expiresAt <= now) state.recent.delete(key);

  const cached = state.recent.get(refreshToken);
  if (cached) return Promise.resolve(cached.result);

  let pending = state.inflight.get(refreshToken);
  if (!pending) {
    pending = rotate(refreshToken, meta).finally(() => state.inflight.delete(refreshToken));
    pending.then((result) =>
      state.recent.set(refreshToken, { result, expiresAt: Date.now() + REUSE_WINDOW_MS }),
    );
    state.inflight.set(refreshToken, pending);
  }
  return pending;
}

async function rotate(
  refreshToken: string,
  meta: { userAgent?: string | null; ip?: string | null },
): Promise<RefreshResult> {
  const response = await upstream("auth/refresh", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(meta.userAgent && { "user-agent": meta.userAgent }),
      ...(meta.ip && { "x-forwarded-for": meta.ip }),
    },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) return { ok: false };
  return { ok: true, session: (await response.json()) as LoginResponse };
}
