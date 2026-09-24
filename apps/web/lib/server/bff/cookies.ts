import "server-only";
import type { AuthTokens } from "@repo/contracts";
import { COOKIE, SECURE_COOKIES } from "./config";

interface CookieOptions {
  maxAge: number;
  path?: string;
}

function serialize(name: string, value: string, { maxAge, path = "/" }: CookieOptions): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${path}`,
    `Max-Age=${Math.max(0, Math.floor(maxAge))}`,
    "HttpOnly",
    "SameSite=Lax",
  ];
  if (SECURE_COOKIES) parts.push("Secure");
  return parts.join("; ");
}

export function readCookies(request: Request): Record<string, string> {
  const header = request.headers.get("cookie");
  if (!header) return {};
  return Object.fromEntries(
    header.split(/;\s*/).flatMap((pair) => {
      const index = pair.indexOf("=");
      if (index < 1) return [];
      try {
        return [[pair.slice(0, index), decodeURIComponent(pair.slice(index + 1))]];
      } catch {
        return [];
      }
    }),
  );
}

/**
 * The access token cookie expires with the token itself, so its absence means
 * "refresh first". Both cookies are HttpOnly: tokens never reach browser JS.
 */
export const sessionCookies = (tokens: AuthTokens): string[] => [
  serialize(COOKIE.access, tokens.accessToken, { maxAge: tokens.accessTokenExpiresIn - 15 }),
  serialize(COOKIE.refresh, tokens.refreshToken, { maxAge: tokens.refreshTokenExpiresIn }),
];

export const clearedSessionCookies = (): string[] => [
  serialize(COOKIE.access, "", { maxAge: 0 }),
  serialize(COOKIE.refresh, "", { maxAge: 0 }),
];

export function withCookies(response: Response, cookies: string[]): Response {
  for (const cookie of cookies) response.headers.append("set-cookie", cookie);
  return response;
}
