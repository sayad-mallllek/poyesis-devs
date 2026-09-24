import { BadRequestException, Injectable } from "@nestjs/common";
import {
  USER_SENSITIVE_FIELDS,
  type ChangePasswordInput,
  type CreateUserInput,
  type ListUsersQuery,
  type Paginated,
  type UpdateUserInput,
  type UserDetail,
  type UserSummary,
} from "@repo/contracts";
import type { Actor } from "../authz/actor.js";
import { AuthzService } from "../authz/authz.service.js";
import { conflict, isUniqueViolation, notFound } from "../common/http/errors.js";
import {
  decimalToNumber,
  definedOnly,
  fromIsoDateOrNull,
  pageArgs,
  paginated,
  toIsoDateOrNull,
  toIsoOrNull,
} from "../common/serialization/index.js";
import type { Prisma } from "../generated/prisma/client.js";
import { AuditService } from "../audit/audit.service.js";
import { PrismaService } from "../prisma/prisma.service.js";
import { PasswordService } from "../security/password.service.js";

const ACTIVE_PROJECT: Prisma.ProjectWhereInput = {
  archivedAt: null,
  status: { in: ["PLANNING", "ACTIVE", "ON_HOLD"] },
};

const summarySelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatarUrl: true,
  jobTitle: true,
  role: true,
  status: true,
  department: true,
  weeklyCapacityHours: true,
  timezone: true,
  _count: { select: { memberships: { where: { project: ACTIVE_PROJECT } } } },
} as const satisfies Prisma.UserSelect;

const detailSelect = {
  ...summarySelect,
  phone: true,
  bio: true,
  hiredAt: true,
  lastLoginAt: true,
  createdAt: true,
  costRate: true,
  memberships: {
    select: {
      projectRole: true,
      project: { select: { id: true, code: true, name: true, color: true, status: true } },
    },
    where: { project: { archivedAt: null } },
    orderBy: { joinedAt: "desc" },
  },
} as const satisfies Prisma.UserSelect;

type SummaryRow = Prisma.UserGetPayload<{ select: typeof summarySelect }>;
type DetailRow = Prisma.UserGetPayload<{ select: typeof detailSelect }>;

export const displayName = (u: { firstName: string; lastName: string }) =>
  `${u.firstName} ${u.lastName}`.trim();

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly passwords: PasswordService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: Actor, query: ListUsersQuery): Promise<Paginated<UserSummary>> {
    this.authz.assert(actor.principal, "read", "User");
    const { skip, take, ...page } = pageArgs(query);
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      AND: [
        this.authz.where<Prisma.UserWhereInput>(actor.principal, "read", "User"),
        definedOnly({ role: query.role, status: query.status, department: query.department }),
        query.skillId ? { skills: { some: { skillId: query.skillId } } } : {},
        search
          ? {
              OR: [
                { firstName: { contains: search, mode: "insensitive" } },
                { lastName: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { jobTitle: { contains: search, mode: "insensitive" } },
              ],
            }
          : {},
      ],
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: summarySelect,
        skip,
        take,
        orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(rows.map(toSummary), total, page);
  }

  async get(actor: Actor, id: string): Promise<UserDetail> {
    this.authz.assert(actor.principal, "read", "User", { id });
    const row = await this.prisma.user.findUnique({ where: { id }, select: detailSelect });
    if (!row) throw notFound("User", id);
    return this.toDetail(actor, row);
  }

  async create(actor: Actor, input: CreateUserInput): Promise<UserDetail> {
    this.authz.assert(actor.principal, "create", "User");
    const { password, hiredAt, email, ...rest } = input;
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            ...rest,
            email: email.toLowerCase(),
            hiredAt: fromIsoDateOrNull(hiredAt),
            passwordHash: await this.passwords.hash(password),
          },
          select: detailSelect,
        });
        await this.audit.record(
          actor,
          {
            action: "user.created",
            entityType: "User",
            entityId: created.id,
            summary: `Created user ${displayName(created)} (${created.role})`,
          },
          tx,
        );
        return created;
      });
      return this.toDetail(actor, row);
    } catch (error) {
      if (isUniqueViolation(error)) throw conflict(`A user with email ${email} already exists`);
      throw error;
    }
  }

  async update(actor: Actor, id: string, input: UpdateUserInput): Promise<UserDetail> {
    const resource = { id };
    this.authz.assert(actor.principal, "update", "User", resource);
    this.authz.assertFields(actor.principal, "update", "User", input, resource);

    const current = await this.prisma.user.findUnique({ where: { id }, select: { role: true, status: true } });
    if (!current) throw notFound("User", id);

    if (id === actor.principal.id && (input.status === "SUSPENDED" || (input.role && input.role !== current.role))) {
      throw new BadRequestException("You cannot change your own role or suspend yourself");
    }
    const losesAdmin =
      current.role === "ADMIN" &&
      ((input.role !== undefined && input.role !== "ADMIN") || input.status === "SUSPENDED");
    if (losesAdmin) await this.assertAnotherActiveAdmin(id);

    const { hiredAt, ...rest } = input;
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id },
        data: definedOnly({ ...rest, hiredAt: fromIsoDateOrNull(hiredAt) }),
        select: detailSelect,
      });
      if (input.status === "SUSPENDED") {
        await tx.authSession.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }
      await this.audit.record(
        actor,
        {
          action: "user.updated",
          entityType: "User",
          entityId: id,
          summary: `Updated ${displayName(updated)}: ${Object.keys(definedOnly(input)).join(", ")}`,
          metadata: { fields: Object.keys(definedOnly(input)) },
        },
        tx,
      );
      return updated;
    });
    return this.toDetail(actor, row);
  }

  /** Users are never hard-deleted (they own history); they are suspended. */
  suspend(actor: Actor, id: string): Promise<UserDetail> {
    this.authz.assert(actor.principal, "delete", "User", { id });
    return this.update(actor, id, { status: "SUSPENDED" });
  }

  async changePassword(actor: Actor, input: ChangePasswordInput): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: actor.principal.id },
      select: { passwordHash: true },
    });
    if (!(await this.passwords.verify(user.passwordHash, input.currentPassword))) {
      throw new BadRequestException("The current password is incorrect");
    }
    await this.prisma.user.update({
      where: { id: actor.principal.id },
      data: { passwordHash: await this.passwords.hash(input.newPassword) },
    });
    await this.audit.record(actor, {
      action: "user.password_changed",
      entityType: "User",
      entityId: actor.principal.id,
      summary: "Changed their password",
    });
  }

  /** Resolves a fuzzy reference (id, email or name) — used by the AI tools. */
  async resolve(actor: Actor, reference: string): Promise<UserSummary[]> {
    const exact = await this.prisma.user.findFirst({
      where: { OR: [{ id: reference }, { email: reference.toLowerCase() }] },
      select: summarySelect,
    });
    if (exact) return [toSummary(exact)];
    return (await this.list(actor, { search: reference, pageSize: 5 })).items;
  }

  private async assertAnotherActiveAdmin(excludingId: string) {
    const others = await this.prisma.user.count({
      where: { role: "ADMIN", status: "ACTIVE", id: { not: excludingId } },
    });
    if (others === 0) throw new BadRequestException("The workspace must keep at least one active administrator");
  }

  toDetail(actor: Actor, row: DetailRow): UserDetail {
    const detail: UserDetail = {
      ...toSummary(row),
      phone: row.phone,
      bio: row.bio,
      hiredAt: toIsoDateOrNull(row.hiredAt),
      lastLoginAt: toIsoOrNull(row.lastLoginAt),
      createdAt: row.createdAt.toISOString(),
      costRate: decimalToNumber(row.costRate),
      projects: row.memberships.map((m) => ({ ...m.project, projectRole: m.projectRole })),
    };
    return this.authz.redact(actor.principal, "User", detail, USER_SENSITIVE_FIELDS, { id: row.id });
  }
}

function toSummary(row: SummaryRow): UserSummary {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    avatarUrl: row.avatarUrl,
    jobTitle: row.jobTitle,
    role: row.role,
    status: row.status,
    department: row.department,
    weeklyCapacityHours: row.weeklyCapacityHours,
    timezone: row.timezone,
    activeProjectCount: row._count.memberships,
  };
}
