import { ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "../../generated/prisma/client.js";

export const notFound = (entity: string, id?: string) =>
  new NotFoundException(id ? `${entity} ${id} was not found` : `${entity} was not found`);

/** Narrows Prisma "unique constraint" failures (P2002). */
export function isUniqueViolation(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

export const conflict = (message: string) => new ConflictException(message);
