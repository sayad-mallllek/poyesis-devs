import { type } from "arktype";

/** Opaque identifier (Prisma `cuid()` / `uuid()`); kept lenient on purpose. */
export const idSchema = type("string > 0");

/** Calendar date without time, e.g. `2026-09-24`. Serialized as-is over the wire. */
export const isoDateSchema = type(/^\d{4}-\d{2}-\d{2}$/).describe(
  "a date formatted as YYYY-MM-DD",
);

/** Full ISO-8601 timestamp as produced by `Date#toISOString()`. */
export type IsoDateTime = string;
/** `YYYY-MM-DD` date string. */
export type IsoDate = string;

export const paginationQuerySchema = type({
  "page?": "string.integer.parse |> number.integer >= 1",
  "pageSize?": "string.integer.parse |> 1 <= number.integer <= 100",
  "search?": "string",
});
export type PaginationQuery = typeof paginationQuerySchema.infer;

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}

/** Uniform error envelope returned by the API for every non-2xx response. */
export interface ApiErrorBody {
  statusCode: number;
  error: string;
  message: string;
  /** Field-level problems (validation errors). Keys are dotted paths. */
  issues?: Record<string, string[]>;
  requestId?: string;
}

export interface UserRef {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  jobTitle: string | null;
}
