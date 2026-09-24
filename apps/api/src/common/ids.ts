import { randomUUID } from "node:crypto";

/** Opaque identifier for records created outside Prisma defaults. */
export const createId = () => randomUUID();
