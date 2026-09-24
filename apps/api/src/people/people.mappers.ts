import type { Skill, UserNote, UserSkill } from "@repo/contracts";
import { toIsoOrNull, toUserRef, userRefSelect } from "../common/serialization/index.js";
import type { Prisma } from "../generated/prisma/client.js";

export const skillInclude = {
  _count: { select: { users: { where: { user: { status: "ACTIVE" } } } } },
} as const satisfies Prisma.SkillInclude;

type SkillRow = Prisma.SkillGetPayload<{ include: typeof skillInclude }>;

export const toSkill = (row: SkillRow): Skill => ({
  id: row.id,
  name: row.name,
  category: row.category,
  userCount: row._count.users,
});

export const userSkillInclude = {
  skill: { select: { id: true, name: true, category: true } },
  ratedBy: { select: userRefSelect },
} as const satisfies Prisma.UserSkillInclude;

type UserSkillRow = Prisma.UserSkillGetPayload<{ include: typeof userSkillInclude }>;

/** Includes rating fields; callers redact them for principals who may not read ratings. */
export const toUserSkill = (row: UserSkillRow): UserSkill => ({
  skill: row.skill,
  level: row.level,
  yearsOfExperience: row.yearsOfExperience,
  updatedAt: row.updatedAt.toISOString(),
  rating: row.rating,
  ratingNote: row.ratingNote,
  ratedBy: row.ratedBy ? toUserRef(row.ratedBy) : null,
  ratedAt: toIsoOrNull(row.ratedAt),
});

export const userNoteInclude = {
  project: { select: { id: true, code: true, name: true } },
  author: { select: userRefSelect },
} as const satisfies Prisma.UserNoteInclude;

type UserNoteRow = Prisma.UserNoteGetPayload<{ include: typeof userNoteInclude }>;

export const toUserNote = (row: UserNoteRow): UserNote => ({
  id: row.id,
  userId: row.userId,
  type: row.type,
  content: row.content,
  project: row.project,
  author: toUserRef(row.author),
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});
