import type { IsoDate, Paginated, UserRef } from "@repo/contracts";
import type { Prisma } from "../../generated/prisma/client.js";

/** `@db.Date` columns come back as UTC midnight; keep only the calendar date. */
export const toIsoDate = (date: Date): IsoDate => date.toISOString().slice(0, 10);
export const toIsoDateOrNull = (date: Date | null | undefined): IsoDate | null =>
  date ? toIsoDate(date) : null;
export const toIsoOrNull = (date: Date | null | undefined) => (date ? date.toISOString() : null);

/** Parses `YYYY-MM-DD` as a UTC date, matching how Postgres `date` round-trips. */
export const fromIsoDate = (date: string): Date => new Date(`${date}T00:00:00.000Z`);
export const fromIsoDateOrNull = (date: string | null | undefined) =>
  date === undefined ? undefined : date === null ? null : fromIsoDate(date);

export const decimalToNumber = (value: Prisma.Decimal | null | undefined): number | null =>
  value == null ? null : value.toNumber();

export const userRefSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  avatarUrl: true,
  jobTitle: true,
} as const satisfies Prisma.UserSelect;

export const toUserRef = (user: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl: string | null;
  jobTitle: string | null;
}): UserRef => ({
  id: user.id,
  firstName: user.firstName,
  lastName: user.lastName,
  email: user.email,
  avatarUrl: user.avatarUrl,
  jobTitle: user.jobTitle,
});

export interface PageRequest {
  page?: number;
  pageSize?: number;
}

export function pageArgs({ page = 1, pageSize = 25 }: PageRequest) {
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize };
}

export const paginated = <T>(
  items: T[],
  total: number,
  { page, pageSize }: { page: number; pageSize: number },
): Paginated<T> => ({ items, total, page, pageSize });

/** Drops keys whose value is `undefined` so Prisma leaves those columns untouched. */
export function definedOnly<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
