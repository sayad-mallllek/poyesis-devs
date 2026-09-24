import { type } from "arktype";
import type { IsoDateTime, UserRef } from "./common.js";
import {
  NOTE_TYPES,
  SKILL_CATEGORIES,
  type NoteType,
  type SkillCategory,
} from "./enums.js";

// ── Skill catalog ─────────────────────────────────────────────────────────

export const createSkillSchema = type({
  name: "0 < string <= 60",
  "category?": type.enumerated(...SKILL_CATEGORIES),
});
export type CreateSkillInput = typeof createSkillSchema.infer;

export interface Skill {
  id: string;
  name: string;
  category: SkillCategory;
  userCount: number;
}

// ── Skills of a person ────────────────────────────────────────────────────

/** Self-assessment, editable by the person and administrators. */
export const upsertUserSkillSchema = type({
  level: "1 <= number.integer <= 5",
  "yearsOfExperience?": "0 <= number <= 60 | null",
});
export type UpsertUserSkillInput = typeof upsertUserSkillSchema.infer;

/** Administrator assessment. */
export const rateUserSkillSchema = type({
  rating: "1 <= number.integer <= 5 | null",
  "ratingNote?": "string <= 2000 | null",
});
export type RateUserSkillInput = typeof rateUserSkillSchema.infer;

export interface UserSkill {
  skill: { id: string; name: string; category: SkillCategory };
  level: number;
  yearsOfExperience: number | null;
  updatedAt: IsoDateTime;
  /** The fields below are only present for principals allowed to read ratings. */
  rating?: number | null;
  ratingNote?: string | null;
  ratedBy?: UserRef | null;
  ratedAt?: IsoDateTime | null;
}

// ── Notes, remarks and warnings ───────────────────────────────────────────

export const createUserNoteSchema = type({
  type: type.enumerated(...NOTE_TYPES),
  content: "0 < string <= 5000",
  "projectId?": "string | null",
});
export type CreateUserNoteInput = typeof createUserNoteSchema.infer;

export const updateUserNoteSchema = type({
  "type?": type.enumerated(...NOTE_TYPES),
  "content?": "0 < string <= 5000",
});
export type UpdateUserNoteInput = typeof updateUserNoteSchema.infer;

export interface UserNote {
  id: string;
  userId: string;
  type: NoteType;
  content: string;
  project: { id: string; code: string; name: string } | null;
  author: UserRef;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}
