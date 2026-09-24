import { type } from "arktype";
import type { IsoDateTime } from "./common.js";

export const updateCompanySchema = type({
  "name?": "0 < string <= 120",
  "legalName?": "string <= 160 | null",
  "website?": "string.url | null",
  "logoUrl?": "string.url | null",
  "timezone?": "string > 0",
  "currency?": /^[A-Z]{3}$/,
  "workingHoursPerDay?": "0 < number <= 24",
  "workingDays?": type("0 <= number.integer <= 6").array().atLeastLength(1),
  "aiInstructions?": "string <= 4000 | null",
});
export type UpdateCompanyInput = typeof updateCompanySchema.infer;

export interface Company {
  id: string;
  name: string;
  legalName: string | null;
  website: string | null;
  logoUrl: string | null;
  timezone: string;
  currency: string;
  workingHoursPerDay: number;
  /** ISO weekday numbers, 0 = Sunday. */
  workingDays: number[];
  aiInstructions: string | null;
  updatedAt: IsoDateTime;
}
