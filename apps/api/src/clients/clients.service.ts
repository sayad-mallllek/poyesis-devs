import { Injectable } from "@nestjs/common";
import type {
  ClientContactInput,
  ClientDetail,
  ClientSummary,
  CreateClientInput,
  ListClientsQuery,
  Paginated,
  UpdateClientInput,
} from "@repo/contracts";
import { AuditService } from "../audit/audit.service.js";
import type { Actor } from "../authz/actor.js";
import { AuthzService } from "../authz/authz.service.js";
import { notFound } from "../common/http/errors.js";
import { definedOnly, pageArgs, paginated } from "../common/serialization/index.js";
import type { Prisma } from "../generated/prisma/client.js";
import { PrismaService, type PrismaTx } from "../prisma/prisma.service.js";

const summaryInclude = {
  _count: { select: { projects: { where: { archivedAt: null } } } },
} as const satisfies Prisma.ClientInclude;

const detailInclude = {
  ...summaryInclude,
  contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
  projects: {
    where: { archivedAt: null },
    select: { id: true, code: true, name: true, status: true, color: true },
    orderBy: { createdAt: "desc" },
  },
} as const satisfies Prisma.ClientInclude;

type SummaryRow = Prisma.ClientGetPayload<{ include: typeof summaryInclude }>;
type DetailRow = Prisma.ClientGetPayload<{ include: typeof detailInclude }>;

@Injectable()
export class ClientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authz: AuthzService,
    private readonly audit: AuditService,
  ) {}

  async list(actor: Actor, query: ListClientsQuery): Promise<Paginated<ClientSummary>> {
    this.authz.assert(actor.principal, "read", "Client");
    const { skip, take, ...page } = pageArgs(query);
    const search = query.search?.trim();
    const where: Prisma.ClientWhereInput = {
      status: query.status,
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { legalName: { contains: search, mode: "insensitive" } },
          { industry: { contains: search, mode: "insensitive" } },
        ],
      }),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.client.findMany({ where, include: summaryInclude, skip, take, orderBy: { name: "asc" } }),
      this.prisma.client.count({ where }),
    ]);
    return paginated(rows.map(toSummary), total, page);
  }

  async get(actor: Actor, id: string): Promise<ClientDetail> {
    this.authz.assert(actor.principal, "read", "Client", { id });
    const row = await this.prisma.client.findUnique({
      where: { id },
      include: {
        ...detailInclude,
        // Only list the projects this principal is allowed to see.
        projects: {
          ...detailInclude.projects,
          where: {
            AND: [
              { archivedAt: null },
              this.authz.where<Prisma.ProjectWhereInput>(actor.principal, "read", "Project"),
            ],
          },
        },
      },
    });
    if (!row) throw notFound("Client", id);
    return toDetail(row);
  }

  async create(actor: Actor, input: CreateClientInput): Promise<ClientDetail> {
    this.authz.assert(actor.principal, "create", "Client");
    const { contacts = [], ...data } = input;
    const row = await this.prisma.$transaction(async (tx) => {
      const client = await tx.client.create({
        data: { ...data, contacts: { create: normalizeContacts(contacts) } },
        include: detailInclude,
      });
      await this.audit.record(
        actor,
        { action: "client.created", entityType: "Client", entityId: client.id, summary: `Created client ${client.name}` },
        tx,
      );
      return client;
    });
    return toDetail(row);
  }

  async update(actor: Actor, id: string, input: UpdateClientInput): Promise<ClientDetail> {
    this.authz.assert(actor.principal, "update", "Client", { id });
    const { contacts, ...data } = input;
    const row = await this.prisma.$transaction(async (tx) => {
      await tx.client.update({ where: { id }, data: definedOnly(data) });
      if (contacts) await this.syncContacts(tx, id, contacts);
      await this.audit.record(
        actor,
        {
          action: "client.updated",
          entityType: "Client",
          entityId: id,
          summary: `Updated client: ${Object.keys(definedOnly(input)).join(", ")}`,
        },
        tx,
      );
      return tx.client.findUniqueOrThrow({ where: { id }, include: detailInclude });
    });
    return toDetail(row);
  }

  /** Projects are detached (not deleted) by the `onDelete: SetNull` relation. */
  async remove(actor: Actor, id: string): Promise<void> {
    this.authz.assert(actor.principal, "delete", "Client", { id });
    await this.prisma.$transaction(async (tx) => {
      const client = await tx.client.delete({ where: { id } });
      await this.audit.record(
        actor,
        { action: "client.deleted", entityType: "Client", entityId: id, summary: `Deleted client ${client.name}` },
        tx,
      );
    });
  }

  /** Replaces the contact list: updates by id, creates new ones, deletes the rest. */
  private async syncContacts(tx: PrismaTx, clientId: string, contacts: ClientContactInput[]) {
    const normalized = normalizeContacts(contacts);
    const keepIds = normalized.flatMap((c) => (c.id ? [c.id] : []));
    await tx.clientContact.deleteMany({ where: { clientId, id: { notIn: keepIds } } });
    for (const { id, ...contact } of normalized) {
      if (id) await tx.clientContact.update({ where: { id, clientId }, data: contact });
      else await tx.clientContact.create({ data: { ...contact, clientId } });
    }
  }
}

/** At most one primary contact; the first flagged one wins. */
function normalizeContacts(contacts: ClientContactInput[]) {
  const primaryIndex = contacts.findIndex((c) => c.isPrimary);
  return contacts.map((c, index) => ({ ...c, isPrimary: index === primaryIndex }));
}

function toSummary(row: SummaryRow): ClientSummary {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    industry: row.industry,
    country: row.country,
    website: row.website,
    projectCount: row._count.projects,
    createdAt: row.createdAt.toISOString(),
  };
}

function toDetail(row: DetailRow): ClientDetail {
  return {
    ...toSummary(row),
    legalName: row.legalName,
    email: row.email,
    phone: row.phone,
    address: row.address,
    vatNumber: row.vatNumber,
    notes: row.notes,
    contacts: row.contacts.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      position: c.position,
      isPrimary: c.isPrimary,
    })),
    projects: row.projects,
    updatedAt: row.updatedAt.toISOString(),
  };
}
