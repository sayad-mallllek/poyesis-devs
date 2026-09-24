import { BadRequestException, Injectable } from "@nestjs/common";
import type {
  CreateProjectInput,
  ListProjectsQuery,
  Paginated,
  ProjectDetail,
  ProjectMemberInput,
  ProjectMemberRole,
  ProjectSummary,
  UpdateProjectInput,
} from "@repo/contracts";
import { AuditService } from "../audit/audit.service.js";
import type { Actor } from "../authz/actor.js";
import { AuthzService } from "../authz/authz.service.js";
import { todayIso } from "../common/calendar.js";
import { conflict, isUniqueViolation, notFound } from "../common/http/errors.js";
import {
  definedOnly,
  fromIsoDate,
  fromIsoDateOrNull,
  pageArgs,
  paginated,
  toIsoDateOrNull,
} from "../common/serialization/index.js";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService, type PrismaTx } from "../prisma/prisma.service.js";
import { baseCodeFromName, codeSearchPrefix, nextAvailableCode } from "./project-code.js";
import { assertUsersExist, requireActiveProject } from "./project-lookup.js";
import { detailInclude, summaryInclude, toProjectDetail, toProjectSummary } from "./project.serializers.js";

/** Generated codes can race with a concurrent create; retry a few times on collision. */
const CODE_ATTEMPTS = 3;

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: Actor, query: ListProjectsQuery): Promise<Paginated<ProjectSummary>> {
    this.authz.assert(actor.principal, "read", "Project");
    const { skip, take, ...page } = pageArgs(query);
    const search = query.search?.trim();
    const where: Prisma.ProjectWhereInput = {
      AND: [
        this.authz.where<Prisma.ProjectWhereInput>(actor.principal, "read", "Project"),
        { archivedAt: null },
        definedOnly({
          status: query.status,
          health: query.health,
          priority: query.priority,
          clientId: query.clientId,
          ownerId: query.ownerId,
        }),
        query.memberId ? { members: { some: { userId: query.memberId } } } : {},
        search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" } },
                { code: { contains: search, mode: "insensitive" } },
                { summary: { contains: search, mode: "insensitive" } },
                { client: { name: { contains: search, mode: "insensitive" } } },
              ],
            }
          : {},
      ],
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({ where, include: summaryInclude, skip, take, orderBy: orderBy(query) }),
      this.prisma.project.count({ where }),
    ]);
    return paginated(rows.map(toProjectSummary), total, page);
  }

  async get(actor: Actor, id: string): Promise<ProjectDetail> {
    this.authz.assert(actor.principal, "read", "Project", { id });
    const row = await this.prisma.project.findFirst({ where: { id, archivedAt: null }, include: detailInclude });
    if (!row) throw notFound("Project", id);
    return toProjectDetail(row);
  }

  /** Resolves a fuzzy reference (id, code or name) — used by the AI tools. */
  async resolve(actor: Actor, reference: string): Promise<ProjectSummary[]> {
    const exact = await this.prisma.project.findFirst({
      where: {
        AND: [
          this.authz.where<Prisma.ProjectWhereInput>(actor.principal, "read", "Project"),
          { archivedAt: null, OR: [{ id: reference }, { code: reference.toUpperCase() }] },
        ],
      },
      include: summaryInclude,
    });
    if (exact) return [toProjectSummary(exact)];
    return (await this.list(actor, { search: reference, pageSize: 5 })).items;
  }

  async create(actor: Actor, input: CreateProjectInput): Promise<ProjectDetail> {
    this.authz.assert(actor.principal, "create", "Project");
    const { members = [], code, startDate, targetEndDate, actualEndDate, links, ...fields } = input;
    const ownerId = fields.ownerId ?? actor.principal.id;
    await this.assertReferences({ clientId: fields.clientId, ownerId, memberIds: members.map((m) => m.userId) });

    const data = {
      ...fields,
      ownerId,
      startDate: fromIsoDateOrNull(startDate),
      targetEndDate: fromIsoDateOrNull(targetEndDate),
      actualEndDate: fromIsoDateOrNull(actualEndDate),
      links: links ?? [],
      members: { create: withOwnerAsLead(members, ownerId) },
    } satisfies Omit<Prisma.ProjectUncheckedCreateInput, "code">;

    for (let attempt = 1; ; attempt++) {
      try {
        const row = await this.prisma.$transaction(async (tx) => {
          const project = await tx.project.create({
            data: { ...data, code: code ?? (await this.generateCode(tx, input.name)) },
            include: detailInclude,
          });
          await this.audit.record(
            actor,
            {
              action: "project.created",
              entityType: "Project",
              entityId: project.id,
              summary: `Created project ${project.code} — ${project.name}`,
            },
            tx,
          );
          return project;
        });
        return toProjectDetail(row);
      } catch (error) {
        if (!isUniqueViolation(error)) throw error;
        if (code) throw conflict(`A project with code ${code} already exists`);
        if (attempt >= CODE_ATTEMPTS) throw conflict("Could not generate a unique project code; please provide one");
      }
    }
  }

  async update(actor: Actor, id: string, input: UpdateProjectInput): Promise<ProjectDetail> {
    this.authz.assert(actor.principal, "update", "Project", { id });
    const current = await requireActiveProject(this.prisma, id, {
      id: true,
      ownerId: true,
      startDate: true,
      targetEndDate: true,
      actualEndDate: true,
    });
    await this.assertReferences({ clientId: input.clientId, ownerId: input.ownerId, memberIds: [] });

    const { startDate, targetEndDate, actualEndDate, links, ...fields } = input;
    const effectiveStart = startDate !== undefined ? startDate : toIsoDateOrNull(current.startDate);
    const effectiveTarget = targetEndDate !== undefined ? targetEndDate : toIsoDateOrNull(current.targetEndDate);
    if (effectiveStart && effectiveTarget && effectiveStart > effectiveTarget) {
      throw new BadRequestException("The target end date must be on or after the start date");
    }
    const completesNow = input.status === "COMPLETED" && actualEndDate === undefined && !current.actualEndDate;
    const data: Prisma.ProjectUncheckedUpdateInput = definedOnly({
      ...fields,
      startDate: fromIsoDateOrNull(startDate),
      targetEndDate: fromIsoDateOrNull(targetEndDate),
      actualEndDate: completesNow ? fromIsoDate(todayIso()) : fromIsoDateOrNull(actualEndDate),
      links,
    });

    try {
      const row = await this.prisma.$transaction(async (tx) => {
        await tx.project.update({ where: { id }, data });
        if (input.ownerId && input.ownerId !== current.ownerId) {
          await tx.projectMember.upsert({
            where: { projectId_userId: { projectId: id, userId: input.ownerId } },
            create: { projectId: id, userId: input.ownerId, projectRole: "LEAD" },
            update: { projectRole: "LEAD" },
          });
        }
        const fieldsChanged = Object.keys(definedOnly(input));
        await this.audit.record(
          actor,
          {
            action: "project.updated",
            entityType: "Project",
            entityId: id,
            summary: `Updated project: ${fieldsChanged.join(", ")}`,
            metadata: { fields: fieldsChanged },
          },
          tx,
        );
        return tx.project.findUniqueOrThrow({ where: { id }, include: detailInclude });
      });
      return toProjectDetail(row);
    } catch (error) {
      if (isUniqueViolation(error)) throw conflict(`A project with code ${input.code} already exists`);
      throw error;
    }
  }

  /** Projects are archived rather than deleted: allocations and history keep referring to them. */
  async archive(actor: Actor, id: string): Promise<void> {
    this.authz.assert(actor.principal, "delete", "Project", { id });
    const project = await requireActiveProject(this.prisma, id, { id: true, code: true, name: true });
    await this.prisma.$transaction(async (tx) => {
      await tx.project.update({ where: { id }, data: { archivedAt: new Date() } });
      await this.audit.record(
        actor,
        {
          action: "project.archived",
          entityType: "Project",
          entityId: id,
          summary: `Archived project ${project.code} — ${project.name}`,
        },
        tx,
      );
    });
  }

  private async generateCode(tx: PrismaTx, name: string): Promise<string> {
    const base = baseCodeFromName(name);
    const existing = await tx.project.findMany({
      where: { code: { startsWith: codeSearchPrefix(base) } },
      select: { code: true },
    });
    return nextAvailableCode(base, new Set(existing.map((p) => p.code)));
  }

  private async assertReferences(refs: { clientId?: string | null; ownerId?: string; memberIds: string[] }) {
    if (refs.clientId) {
      const client = await this.prisma.client.findUnique({ where: { id: refs.clientId }, select: { id: true } });
      if (!client) throw new BadRequestException(`Client not found: ${refs.clientId}`);
    }
    if (refs.ownerId) await assertUsersExist(this.prisma, [refs.ownerId], "Owner");
    await assertUsersExist(this.prisma, refs.memberIds, "Member user");
  }
}

/** De-duplicates members (last role wins) and makes the owner a `LEAD` member. */
function withOwnerAsLead(members: ProjectMemberInput[], ownerId: string) {
  const roles = new Map<string, ProjectMemberRole>();
  for (const m of members) roles.set(m.userId, m.projectRole ?? "CONTRIBUTOR");
  roles.set(ownerId, "LEAD");
  return [...roles].map(([userId, projectRole]) => ({ userId, projectRole }));
}

function orderBy(query: ListProjectsQuery): Prisma.ProjectOrderByWithRelationInput[] {
  const order = query.order ?? (query.sort ? "asc" : "desc");
  const primary: Prisma.ProjectOrderByWithRelationInput =
    query.sort === "targetEndDate"
      ? { targetEndDate: { sort: order, nulls: "last" } }
      : { [query.sort ?? "createdAt"]: order };
  // A unique tie-breaker keeps pagination stable.
  return [primary, { id: "asc" }];
}
