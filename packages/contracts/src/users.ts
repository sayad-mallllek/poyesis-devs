import { type } from "arktype";
import { passwordSchema } from "./auth.js";
import { isoDateSchema, type IsoDate, type IsoDateTime, type UserRef } from "./common.js";
import { ROLES, USER_STATUSES, type Role, type UserStatus } from "./enums.js";

const timezone = type("string > 0").narrow((tz, ctx) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return ctx.mustBe("a valid IANA timezone");
  }
});

const profileFields = {
  "jobTitle?": "string <= 120 | null",
  "phone?": "string <= 40 | null",
  "avatarUrl?": "string.url | null",
  "timezone?": timezone,
  "bio?": "string <= 2000 | null",
} as const;

export const createUserSchema = type({
  email: "string.email",
  firstName: "0 < string <= 80",
  lastName: "0 < string <= 80",
  role: type.enumerated(...ROLES),
  password: passwordSchema,
  "department?": "string <= 80 | null",
  "weeklyCapacityHours?": "0 <= number <= 80",
  "costRate?": "number >= 0 | null",
  "hiredAt?": isoDateSchema.or("null"),
  ...profileFields,
});
export type CreateUserInput = typeof createUserSchema.infer;

export const updateUserSchema = type({
  "firstName?": "0 < string <= 80",
  "lastName?": "0 < string <= 80",
  "role?": type.enumerated(...ROLES),
  "status?": type.enumerated(...USER_STATUSES),
  "department?": "string <= 80 | null",
  "weeklyCapacityHours?": "0 <= number <= 80",
  "costRate?": "number >= 0 | null",
  "hiredAt?": isoDateSchema.or("null"),
  ...profileFields,
});
export type UpdateUserInput = typeof updateUserSchema.infer;

export const listUsersQuerySchema = type({
  "page?": "string.integer.parse |> number.integer >= 1",
  "pageSize?": "string.integer.parse |> 1 <= number.integer <= 100",
  "search?": "string",
  "role?": type.enumerated(...ROLES),
  "status?": type.enumerated(...USER_STATUSES),
  "skillId?": "string",
  "department?": "string",
});
export type ListUsersQuery = typeof listUsersQuerySchema.infer;

export interface UserSummary extends UserRef {
  role: Role;
  status: UserStatus;
  department: string | null;
  weeklyCapacityHours: number;
  timezone: string;
  activeProjectCount: number;
}

export interface UserDetail extends UserSummary {
  phone: string | null;
  bio: string | null;
  hiredAt: IsoDate | null;
  lastLoginAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  /** Present only for principals allowed to read compensation data. */
  costRate?: number | null;
  projects: Array<{
    id: string;
    code: string;
    name: string;
    color: string;
    status: string;
    projectRole: string;
  }>;
}
