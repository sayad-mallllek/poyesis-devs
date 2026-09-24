import { isoDateSchema, type IsoDate } from "@repo/contracts";
import { type } from "arktype";
import { fromIsoDate } from "../common/serialization/index.js";
import { ValidationException } from "../common/validation/ark.pipe.js";

const windowIsOrdered = (
  q: { from?: string; to?: string },
  ctx: { reject: (p: { path: string[]; expected: string }) => false },
) => !q.from || !q.to || q.from <= q.to || ctx.reject({ path: ["to"], expected: "on or after `from`" });

export const listAllocationsQuerySchema = type({
  "from?": isoDateSchema,
  "to?": isoDateSchema,
  "userId?": "string > 0",
  "projectId?": "string > 0",
}).narrow(windowIsOrdered);
export type ListAllocationsQuery = typeof listAllocationsQuerySchema.infer;

export const listTimeOffQuerySchema = type({
  "from?": isoDateSchema,
  "to?": isoDateSchema,
  "userId?": "string > 0",
}).narrow(windowIsOrdered);
export type ListTimeOffQuery = typeof listTimeOffQuerySchema.infer;

export interface DateWindow {
  from?: IsoDate;
  to?: IsoDate;
}

/** Rows whose inclusive [startDate, endDate] range intersects the window. */
export function overlapping({ from, to }: DateWindow) {
  return {
    ...(to && { startDate: { lte: fromIsoDate(to) } }),
    ...(from && { endDate: { gte: fromIsoDate(from) } }),
  };
}

/** Partial updates are validated after merging with the stored row. */
export function assertDateRange(startDate: IsoDate, endDate: IsoDate) {
  if (startDate > endDate) {
    throw new ValidationException({ endDate: ["must be on or after the start date"] });
  }
}
