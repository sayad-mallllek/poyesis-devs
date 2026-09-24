import { Injectable } from "@nestjs/common";
import type { CreateSkillInput, Skill } from "@repo/contracts";
import { type } from "arktype";
import { AuditService } from "../audit/audit.service.js";
import type { Actor } from "../authz/actor.js";
import { AuthzService } from "../authz/authz.service.js";
import { conflict, isUniqueViolation, notFound } from "../common/http/errors.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { skillInclude, toSkill } from "./people.mappers.js";

export const listSkillsQuerySchema = type({ "search?": "string" });
export type ListSkillsQuery = typeof listSkillsQuerySchema.infer;

@Injectable()
export class SkillsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: Actor, query: ListSkillsQuery): Promise<Skill[]> {
    this.authz.assert(actor.principal, "read", "Skill");
    const search = query.search?.trim();
    const rows = await this.prisma.skill.findMany({
      where: search ? { name: { contains: search, mode: "insensitive" } } : {},
      include: skillInclude,
      orderBy: { name: "asc" },
    });
    return rows.map(toSkill);
  }

  async create(actor: Actor, input: CreateSkillInput): Promise<Skill> {
    this.authz.assert(actor.principal, "create", "Skill");
    const name = input.name.trim();
    // The unique index is case-sensitive; "React" and "react" are the same skill.
    const duplicate = await this.prisma.skill.findFirst({
      where: { name: { equals: name, mode: "insensitive" } },
      select: { name: true },
    });
    if (duplicate) throw conflict(`The skill ${duplicate.name} already exists`);
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.skill.create({ data: { name, category: input.category }, include: skillInclude });
        await this.audit.record(
          actor,
          { action: "skill.created", entityType: "Skill", entityId: created.id, summary: `Created skill ${name}` },
          tx,
        );
        return created;
      });
      return toSkill(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw conflict(`The skill ${name} already exists`);
      throw error;
    }
  }

  /** Also removes the skill from every person (cascade). */
  async remove(actor: Actor, id: string): Promise<void> {
    this.authz.assert(actor.principal, "delete", "Skill", { id });
    const skill = await this.prisma.skill.findUnique({ where: { id }, select: { name: true } });
    if (!skill) throw notFound("Skill", id);
    await this.prisma.$transaction(async (tx) => {
      await tx.skill.delete({ where: { id } });
      await this.audit.record(
        actor,
        { action: "skill.deleted", entityType: "Skill", entityId: id, summary: `Deleted skill ${skill.name}` },
        tx,
      );
    });
  }
}
