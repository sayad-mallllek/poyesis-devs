import { Injectable } from "@nestjs/common";
import { toUpstreamHttpError } from "../common/upstream-error.js";
import { trimTrailingSlashes } from "../common/url.js";
import { CredentialStore } from "../credentials/credential-store.js";

export const DEFAULT_SENTRY_URL = "https://sentry.io";
const REQUEST_TIMEOUT_MS = 15_000;

export interface SentryConfig {
  baseUrl: string;
  organizationSlug: string;
}

export const sentryConfig = (config: Record<string, string>): SentryConfig => ({
  baseUrl: trimTrailingSlashes(config.baseUrl ?? DEFAULT_SENTRY_URL),
  organizationSlug: config.organizationSlug ?? "",
});

/** Tagged template that URL-encodes every interpolated path segment. */
export const sentryPath = (strings: TemplateStringsArray, ...segments: string[]) =>
  strings.reduce((path, part, i) => path + part + (i < segments.length ? encodeURIComponent(segments[i]!) : ""), "");

/**
 * Cursor of the next page from Sentry's `Link` header, e.g.
 * `<…>; rel="next"; results="true"; cursor="0:100:0"`. `results="false"` means there is none.
 */
export function parseNextCursor(link: string | null): string | null {
  if (!link) return null;
  for (const entry of link.split(/,(?=\s*<)/)) {
    const attributes = Object.fromEntries(
      [...entry.matchAll(/;\s*([a-z]+)="([^"]*)"/gi)].map((m) => [m[1]!.toLowerCase(), m[2]!]),
    );
    if (attributes.rel === "next") return attributes.results === "true" && attributes.cursor ? attributes.cursor : null;
  }
  return null;
}

function networkMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const code = (error.cause as { code?: unknown } | undefined)?.code;
  return typeof code === "string" ? `${error.message} (${code})` : error.message;
}

type Query = Record<string, string | number | undefined>;

/** Minimal Sentry Web API client (`/api/0`) authenticated with a Bearer token. */
export class SentryApi {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  async get<T>(
    path: string,
    { query = {}, notFound }: { query?: Query; notFound?: string } = {},
  ): Promise<{ data: T; nextCursor: string | null }> {
    const url = new URL(`${this.baseUrl}/api/0${path}`);
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    let response: Response;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${this.token}`, Accept: "application/json" },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw toUpstreamHttpError("Sentry", { message: networkMessage(error) });
    }

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as { detail?: unknown } | null;
      const message = typeof body?.detail === "string" ? body.detail : response.statusText;
      throw toUpstreamHttpError(
        "Sentry",
        { status: response.status, message, headers: Object.fromEntries(response.headers) },
        notFound,
      );
    }
    return { data: (await response.json()) as T, nextCursor: parseNextCursor(response.headers.get("link")) };
  }
}

/** Returns the organization's display name. */
export async function verifySentryToken(token: string, config: SentryConfig): Promise<string> {
  const api = new SentryApi(config.baseUrl, token);
  const { data } = await api.get<{ name: string }>(sentryPath`/organizations/${config.organizationSlug}/`, {
    notFound: `Sentry organization "${config.organizationSlug}" was not found or the token cannot access it`,
  });
  return data.name;
}

export interface SentryConnection {
  api: SentryApi;
  config: SentryConfig;
  version: number;
}

@Injectable()
export class SentryClientProvider {
  constructor(private readonly store: CredentialStore) {}

  async connect(): Promise<SentryConnection> {
    const credential = await this.store.require("SENTRY");
    const config = sentryConfig(credential.config);
    return { api: new SentryApi(config.baseUrl, credential.token), config, version: credential.version };
  }
}
