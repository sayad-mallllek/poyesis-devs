import { Injectable } from "@nestjs/common";
import { Octokit } from "@octokit/rest";
import { toUpstreamHttpError, type UpstreamFailure } from "../common/upstream-error.js";
import { trimTrailingSlashes } from "../common/url.js";
import { CredentialStore } from "../credentials/credential-store.js";

export const DEFAULT_GITHUB_API_URL = "https://api.github.com";
const REQUEST_TIMEOUT_MS = 15_000;

export interface GithubConfig {
  apiBaseUrl: string;
}

export const githubConfig = (config: Record<string, string>): GithubConfig => ({
  apiBaseUrl: trimTrailingSlashes(config.apiBaseUrl ?? DEFAULT_GITHUB_API_URL),
});

export interface GithubConnection {
  octokit: Octokit;
  config: GithubConfig;
  version: number;
}

export function createOctokit(token: string, apiBaseUrl: string): Octokit {
  return new Octokit({
    auth: token,
    baseUrl: apiBaseUrl,
    userAgent: "poyesis-devs",
    request: {
      fetch: (url: string | URL, init?: RequestInit) =>
        fetch(url, { ...init, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) }),
    },
  });
}

/**
 * Octokit throws `RequestError` (duck-typed: `@octokit/request-error` is only a
 * transitive dependency). Network failures carry status 500 but no response.
 */
export function githubFailure(error: unknown): UpstreamFailure {
  const message = error instanceof Error ? error.message : String(error);
  if (!error || typeof error !== "object" || !("status" in error) || typeof error.status !== "number") {
    return { message };
  }
  const response = (error as { response?: { headers?: UpstreamFailure["headers"] } }).response;
  return response ? { status: error.status, message, headers: response.headers } : { message };
}

/** Runs an Octokit call, translating failures into our HTTP errors. */
export async function githubCall<T>(call: () => Promise<T>, notFoundMessage?: string): Promise<T> {
  try {
    return await call();
  } catch (error) {
    throw toUpstreamHttpError("GitHub", githubFailure(error), notFoundMessage);
  }
}

/** Returns the login the token authenticates as. */
export async function verifyGithubToken(token: string, apiBaseUrl: string): Promise<string> {
  const octokit = createOctokit(token, apiBaseUrl);
  const { data } = await githubCall(() => octokit.rest.users.getAuthenticated());
  return data.login;
}

/** Builds the Octokit client lazily from the stored credentials. */
@Injectable()
export class GithubClientProvider {
  private current?: GithubConnection;

  constructor(private readonly store: CredentialStore) {}

  async connect(): Promise<GithubConnection> {
    const credential = await this.store.require("GITHUB");
    if (this.current?.version !== credential.version) {
      const config = githubConfig(credential.config);
      this.current = {
        octokit: createOctokit(credential.token, config.apiBaseUrl),
        config,
        version: credential.version,
      };
    }
    return this.current;
  }
}
