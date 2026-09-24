import { Injectable } from "@nestjs/common";
import {
  SKILL_RATING_FIELDS,
  type RateUserSkillInput,
  type UpsertUserSkillInput,
  type UserSkill,
} from "@repo/contracts";
import { AuditService } from "../audit/audit.service.js";
import type { Actor } from "../authz/actor.js";
import { AuthzService } from "../authz/authz.service.js";
import { notFound } from "../common/http/errors.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { displayName } from "../users/users.service.js";
import { toUserSkill, userSkillInclude } from "./people.mappers.js";

@Injectable()
export class UserSkillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
  ) {}

  /** Strongest skills first. */
  async list(actor: Actor, userId: string): Promise<UserSkill[]> {
    this.authz.assert(actor.principal, "read", "UserSkill", { userId });
    await this.findUser(userId);
    const rows = await this.prisma.userSkill.findMany({
      where: { userId },
      include: userSkillInclude,
      orderBy: [{ level: "desc" }, { skill: { name: "asc" } }],
    });
    return rows.map((row) => this.present(actor, userId, toUserSkill(row)));
  }

  /** Self-assessment: adds the skill to the person or updates their level. */
  async upsert(actor: Actor, userId: string, skillId: string, input: UpsertUserSkillInput): Promise<UserSkill> {
    const existing = await this.prisma.userSkill.findUnique({
      where: { userId_skillId: { userId, skillId } },
      select: { level: true },
    });
    this.authz.assert(actor.principal, existing ? "update" : "create", "UserSkill", { userId });
    const [user, skill] = await Promise.all([
      this.findUser(userId),
      this.prisma.skill.findUnique({ where: { id: skillId }, select: { name: true } }),
    ]);
    if (!skill) throw notFound("Skill", skillId);

    const row = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.userSkill.upsert({
        where: { userId_skillId: { userId, skillId } },
        create: { userId, skillId, ...input },
        update: input,
        include: userSkillInclude,
      });
      await this.audit.record(
        actor,
        {
          action: existing ? "user_skill.updated" : "user_skill.added",
          entityType: "UserSkill",
          entityId: userSkillId(userId, skillId),
          summary: `${existing ? "Updated" : "Added"} ${skill.name} (level ${input.level}) for ${displayName(user)}`,
        },
        tx,
      );
      return saved;
    });
    return this.present(actor, userId, toUserSkill(row));
  }

  /** Administrator assessment; a `null` rating clears the assessment entirely. */
  async rate(actor: Actor, userId: string, skillId: string, input: RateUserSkillInput): Promise<UserSkill> {
    this.authz.assert(actor.principal, "update", "UserSkill", { userId }, "rating");
    const current = await this.findUserSkill(userId, skillId);
    const data =
      input.rating === null
        ? { rating: null, ratingNote: null, ratedById: null, ratedAt: null }
        : { rating: input.rating, ratingNote: input.ratingNote, ratedById: actor.principal.id, ratedAt: new Date() };

    const row = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.userSkill.update({
        where: { userId_skillId: { userId, skillId } },
        data,
        include: userSkillInclude,
      });
      await this.audit.record(
        actor,
        {
          action: input.rating === null ? "user_skill.rating_cleared" : "user_skill.rated",
          entityType: "UserSkill",
          entityId: userSkillId(userId, skillId),
          summary: `${input.rating === null ? "Cleared the rating of" : "Rated"} ${current.skill.name} for ${displayName(current.user)}`,
        },
        tx,
      );
      return saved;
    });
    return this.present(actor, userId, toUserSkill(row));
  }

  async remove(actor: Actor, userId: string, skillId: string): Promise<void> {
    this.authz.assert(actor.principal, "delete", "UserSkill", { userId });
    const current = await this.findUserSkill(userId, skillId);
    await this.prisma.$transaction(async (tx) => {
      await tx.userSkill.delete({ where: { userId_skillId: { userId, skillId } } });
      await this.audit.record(
        actor,
        {
          action: "user_skill.removed",
          entityType: "UserSkill",
          entityId: userSkillId(userId, skillId),
          summary: `Removed ${current.skill.name} from ${displayName(current.user)}`,
        },
        tx,
      );
    });
  }

  private present(actor: Actor, userId: string, skill: UserSkill): UserSkill {
    return this.authz.redact(actor.principal, "UserSkill", skill, SKILL_RATING_FIELDS, { userId });
  }

  private async findUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    if (!user) throw notFound("User", userId);
    return user;
  }

  private async findUserSkill(userId: string, skillId: string) {
    const row = await this.prisma.userSkill.findUnique({
      where: { userId_skillId: { userId, skillId } },
      select: { skill: { select: { name: true } }, user: { select: { firstName: true, lastName: true } } },
    });
    if (!row) throw notFound("Skill of this user", skillId);
    return row;
  }
}

const userSkillId = (userId: string, skillId: string) => `${userId}:${skillId}`;
