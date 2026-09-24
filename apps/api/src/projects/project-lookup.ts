import { BadRequestException } from "@nestjs/common";
import { notFound } from "../common/http/errors.js";
import type { Prisma } from "../generated/prisma/client.js";
import type { PrismaService, PrismaTx } from "../prisma/prisma.service.js";

type Db = PrismaService | PrismaTx;

/** Archived projects behave as deleted for every project-scoped operation. */
export async function requireActiveProject<S extends Prisma.ProjectSelect = { id: true }>(
  db: Db,
  id: string,
  select?: S,
): Promise<Prisma.ProjectGetPayload<{ select: S }>> {
  const project = await db.project.findFirst({
    where: { id, archivedAt: null },
    select: select ?? ({ id: true } as S),
  });
  if (!project) throw notFound("Project", id);
  return project as Prisma.ProjectGetPayload<{ select: S }>;
}

/** Rejects references to users that do not exist, naming the missing ids. */
export async function assertUsersExist(db: Db, ids: readonly string[], label = "User"): Promise<void> {
  const unique = [...new Set(ids)];
  if (!unique.length) return;
  const found = await db.user.findMany({ where: { id: { in: unique } }, select: { id: true } });
  const missing = unique.filter((id) => !found.some((u) => u.id === id));
  if (missing.length) {
    throw new BadRequestException(`${label} not found: ${missing.join(", ")}`);
  }
}
