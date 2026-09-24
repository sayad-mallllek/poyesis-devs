import { BadGatewayException, HttpException, HttpStatus, NotFoundException } from "@nestjs/common";

export type UpstreamProvider = "GitHub" | "Sentry";

/** Provider-agnostic description of a failed upstream call. */
export interface UpstreamFailure {
  /** HTTP status of the upstream response; absent for network failures and timeouts. */
  status?: number;
  message: string;
  headers?: Record<string, string | number | undefined>;
}

const header = (failure: UpstreamFailure, name: string) => {
  const value = failure.headers?.[name];
  return value === undefined ? undefined : String(value);
};

/** When the upstream rate limit resets, if the response says it was hit. */
function rateLimitReset(failure: UpstreamFailure, now: Date): Date | null | undefined {
  const { status } = failure;
  if (status !== 403 && status !== 429) return undefined;
  const retryAfter = header(failure, "retry-after");
  if (retryAfter && /^\d+$/.test(retryAfter)) return new Date(now.getTime() + Number(retryAfter) * 1000);
  if (header(failure, "x-ratelimit-remaining") === "0") {
    const reset = Number(header(failure, "x-ratelimit-reset"));
    return Number.isFinite(reset) && reset > 0 ? new Date(reset * 1000) : null;
  }
  // GitHub's secondary rate limit is a 403 that is only recognizable by its message.
  if (status === 429 || /rate limit/i.test(failure.message)) return null;
  return undefined;
}

/**
 * Translates an upstream failure into the HTTP error our API returns.
 * Upstream auth problems are 424 rather than 401 so the web app does not
 * mistake them for an expired session.
 */
export function toUpstreamHttpError(
  provider: UpstreamProvider,
  failure: UpstreamFailure,
  notFoundMessage?: string,
  now = new Date(),
): HttpException {
  const reset = rateLimitReset(failure, now);
  if (reset !== undefined) {
    const when = reset ? `; retry after ${reset.toISOString()}` : "";
    return new HttpException(`${provider} API rate limit exceeded${when}`, HttpStatus.TOO_MANY_REQUESTS);
  }
  switch (failure.status) {
    case undefined:
      return new BadGatewayException(`Could not reach ${provider}: ${failure.message}`);
    case 401:
    case 403:
      return new HttpException(`${provider} token is invalid or lacks access`, HttpStatus.FAILED_DEPENDENCY);
    case 404:
      return new NotFoundException(notFoundMessage ?? `${provider} resource was not found`);
    default:
      return new BadGatewayException(`${provider} request failed (${failure.status}): ${failure.message}`);
  }
}
